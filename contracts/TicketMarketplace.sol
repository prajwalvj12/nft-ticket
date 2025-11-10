// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IEventTicketNFT {
    function originalTicketPrice(uint256 tokenId) external view returns (uint256);
    function maxResaleMarkupPercent() external view returns (uint256);
    function tickets(uint256 tokenId) external view returns (
        uint256 eventId,
        uint256 seatNumber,
        bool isUsed,
        uint256 purchaseDate
    );
}

contract TicketMarketplace is ReentrancyGuard, Ownable {

    // Listing structure
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    // State variables
    IEventTicketNFT public ticketContract;
    mapping(uint256 => Listing) public listings;
    uint256 public platformFeePercent = 2; // 2% platform fee
    uint256 public totalFeesCollected;

    // Events
    event TicketListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event TicketSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event PlatformFeeUpdated(uint256 newFee);

    constructor(address _ticketContract) {
        ticketContract = IEventTicketNFT(_ticketContract);
    }

    /**
     * @dev List a ticket for sale
     * @param tokenId The ID of the ticket NFT
     * @param price The listing price in wei
     */
    function listTicket(uint256 tokenId, uint256 price) external nonReentrant {
        // Verify ownership
        IERC721 nft = IERC721(address(ticketContract));
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");

        // Verify ticket is not used
        (,, bool isUsed,) = ticketContract.tickets(tokenId);
        require(!isUsed, "Cannot sell used ticket");

        // Verify price doesn't exceed maximum markup
        uint256 originalPrice = ticketContract.originalTicketPrice(tokenId);
        uint256 maxMarkup = ticketContract.maxResaleMarkupPercent();
        uint256 maxPrice = originalPrice + ((originalPrice * maxMarkup) / 100);
        require(price <= maxPrice, "Price exceeds maximum allowed markup");

        // Verify approval
        require(
            nft.getApproved(tokenId) == address(this) ||
            nft.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved to transfer ticket"
        );

        // Create listing
        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit TicketListed(tokenId, msg.sender, price);
    }

    /**
     * @dev Buy a listed ticket
     * @param tokenId The ID of the ticket to purchase
     */
    function buyTicket(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];

        require(listing.active, "Ticket not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own ticket");

        // Verify ticket is still owned by seller
        IERC721 nft = IERC721(address(ticketContract));
        require(nft.ownerOf(tokenId) == listing.seller, "Seller no longer owns ticket");

        // Mark listing as inactive before transfers (reentrancy protection)
        listings[tokenId].active = false;

        // Calculate fees
        uint256 platformFee = (listing.price * platformFeePercent) / 100;
        uint256 sellerProceeds = listing.price - platformFee;

        // Transfer NFT to buyer
        nft.safeTransferFrom(listing.seller, msg.sender, tokenId);

        // Transfer funds to seller
        (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerProceeds}("");
        require(sellerSuccess, "Payment to seller failed");

        // Track platform fees
        totalFeesCollected += platformFee;

        // Refund excess payment
        if (msg.value > listing.price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(refundSuccess, "Refund failed");
        }

        emit TicketSold(tokenId, listing.seller, msg.sender, listing.price);
    }

    /**
     * @dev Cancel a listing
     * @param tokenId The ID of the ticket listing to cancel
     */
    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];

        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");

        // Mark listing as inactive
        listings[tokenId].active = false;

        emit ListingCancelled(tokenId, msg.sender);
    }

    /**
     * @dev Update a listing price
     * @param tokenId The ID of the ticket
     * @param newPrice The new listing price
     */
    function updateListingPrice(uint256 tokenId, uint256 newPrice) external nonReentrant {
        Listing storage listing = listings[tokenId];

        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");

        // Verify new price doesn't exceed maximum markup
        uint256 originalPrice = ticketContract.originalTicketPrice(tokenId);
        uint256 maxMarkup = ticketContract.maxResaleMarkupPercent();
        uint256 maxPrice = originalPrice + ((originalPrice * maxMarkup) / 100);
        require(newPrice <= maxPrice, "Price exceeds maximum allowed markup");

        listing.price = newPrice;

        emit TicketListed(tokenId, msg.sender, newPrice);
    }

    /**
     * @dev Get listing details
     * @param tokenId The ID of the ticket
     */
    function getListing(uint256 tokenId) external view returns (
        address seller,
        uint256 price,
        bool active
    ) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price, listing.active);
    }

    /**
     * @dev Check if a ticket is listed
     * @param tokenId The ID of the ticket
     */
    function isListed(uint256 tokenId) external view returns (bool) {
        return listings[tokenId].active;
    }

    /**
     * @dev Update platform fee (owner only)
     * @param newFee New fee percentage (0-10)
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 10, "Fee too high (max 10%)");
        platformFeePercent = newFee;
        emit PlatformFeeUpdated(newFee);
    }

    /**
     * @dev Withdraw collected platform fees (owner only)
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = totalFeesCollected;
        require(amount > 0, "No fees to withdraw");

        totalFeesCollected = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Required to receive ETH from transfers
     */
    receive() external payable {}
}
