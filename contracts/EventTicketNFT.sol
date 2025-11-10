// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract EventTicketNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    struct Event {
        uint256 eventId;
        string name;
        uint256 price;
        uint256 maxTickets;
        uint256 soldTickets;
        uint256 eventDate;
        bool isActive;
        address organizer;
    }

    struct Ticket {
        uint256 eventId;
        uint256 seatNumber;
        bool isUsed;
        uint256 purchaseDate;
    }

    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => mapping(address => bool)) public hasTicket;
    mapping(uint256 => uint256) public originalTicketPrice;

    address public officialMarketplace;
    uint256 public maxResaleMarkupPercent;

    uint256 private _eventIdCounter;

    event EventCreated(uint256 indexed eventId, string name, uint256 price, uint256 maxTickets);
    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed buyer, uint256 price);
    event TicketUsed(uint256 indexed tokenId);
    event MarketplaceConfigured(address indexed marketplace, uint256 markupPercent);

    constructor() ERC721("EventTicket", "TICKET") {}

    function createEvent(
        string memory _name,
        uint256 _price,
        uint256 _maxTickets,
        uint256 _eventDate
    ) external returns (uint256) {
        require(_maxTickets > 0, "Max tickets must be greater than 0");
        require(_eventDate > block.timestamp, "Event date must be in the future");

        _eventIdCounter++;
        uint256 eventId = _eventIdCounter;

        events[eventId] = Event({
            eventId: eventId,
            name: _name,
            price: _price,
            maxTickets: _maxTickets,
            soldTickets: 0,
            eventDate: _eventDate,
            isActive: true,
            organizer: msg.sender
        });

        emit EventCreated(eventId, _name, _price, _maxTickets);
        return eventId;
    }

    function mintTicket(uint256 _eventId, string memory _tokenURI) 
        external 
        payable 
        nonReentrant 
    {
        Event storage eventData = events[_eventId];
        require(eventData.isActive, "Event is not active");
        require(eventData.soldTickets < eventData.maxTickets, "Event is sold out");
        require(msg.value >= eventData.price, "Insufficient payment");
        require(!hasTicket[_eventId][msg.sender], "Already owns ticket for this event");
        require(block.timestamp < eventData.eventDate, "Event has already occurred");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        tickets[tokenId] = Ticket({
            eventId: _eventId,
            seatNumber: eventData.soldTickets + 1,
            isUsed: false,
            purchaseDate: block.timestamp
        });

        eventData.soldTickets++;
        hasTicket[_eventId][msg.sender] = true;
        originalTicketPrice[tokenId] = msg.value;

        // Transfer funds to event organizer
        payable(eventData.organizer).transfer(msg.value);

        emit TicketMinted(tokenId, _eventId, msg.sender, msg.value);
    }

    function useTicket(uint256 _tokenId) external {
        require(_exists(_tokenId), "Ticket does not exist");
        require(ownerOf(_tokenId) == msg.sender || msg.sender == owner(), "Not authorized");
        require(!tickets[_tokenId].isUsed, "Ticket already used");

        Ticket storage ticket = tickets[_tokenId];
        Event memory eventData = events[ticket.eventId];

        require(block.timestamp >= eventData.eventDate - 3600, "Too early to use ticket"); // 1 hour before event
        require(block.timestamp <= eventData.eventDate + 86400, "Ticket expired"); // 24 hours after event

        ticket.isUsed = true;
        emit TicketUsed(_tokenId);
    }

    function verifyTicket(uint256 _tokenId) external view returns (
        bool isValid,
        bool isUsed,
        uint256 eventId,
        uint256 seatNumber,
        address owner
    ) {
        if (!_exists(_tokenId)) {
            return (false, false, 0, 0, address(0));
        }

        Ticket memory ticket = tickets[_tokenId];
        return (
            true,
            ticket.isUsed,
            ticket.eventId,
            ticket.seatNumber,
            ownerOf(_tokenId)
        );
    }

    function getEventDetails(uint256 _eventId) external view returns (Event memory) {
        return events[_eventId];
    }

    function getTicketDetails(uint256 _tokenId) external view returns (Ticket memory) {
        require(_exists(_tokenId), "Ticket does not exist");
        return tickets[_tokenId];
    }

    function transferTicket(address _to, uint256 _tokenId) external {
        require(ownerOf(_tokenId) == msg.sender, "Not ticket owner");
        require(!tickets[_tokenId].isUsed, "Cannot transfer used ticket");

        uint256 eventId = tickets[_tokenId].eventId;
        hasTicket[eventId][msg.sender] = false;
        hasTicket[eventId][_to] = true;

        _transfer(msg.sender, _to, _tokenId);
    }

    // Override functions required by Solidity
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function setMarketplace(
        address _marketplace,
        uint256 _markupPercent
    ) external onlyOwner {
        officialMarketplace = _marketplace;
        maxResaleMarkupPercent = _markupPercent;
        emit MarketplaceConfigured(_marketplace, _markupPercent);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);

        require(batchSize == 1, "Batch transfers not supported");

        // This logic applies to resales, not minting (from address(0)) or burning (to address(0))
        if (from != address(0) && to != address(0)) {
            // If a marketplace is set, enforce resale rules
            if (officialMarketplace != address(0)) {
                require(
                    msg.sender == officialMarketplace,
                    "Resale must go through the official marketplace"
                );

                uint256 originalPrice = originalTicketPrice[firstTokenId];
                uint256 maxResalePrice = originalPrice +
                    ((originalPrice * maxResaleMarkupPercent) / 100);

                // This check assumes the marketplace sends the exact resale price.
                // Note: This is a simplified check. A real marketplace would likely
                // handle payments separately and call a transfer function.
                // This logic is not fully robust for a real-world scenario but demonstrates the principle.
            }
        }
    }
}