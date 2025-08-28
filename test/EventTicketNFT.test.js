const { expect } = require("chai");

describe("EventTicketNFT", function () {
  let contract;
  let owner;
  let user1;
  let user2;
  let users;
  let ethers;
  let TICKET_PRICE;
  const EVENT_NAME = "Test Event";
  const MAX_TICKETS = 10;
  const TOKEN_URI = "https://ipfs.io/ipfs/sample-ticket-metadata";

  // Helper function to get a fresh future timestamp
  function freshFutureTimestamp(secondsFromNow = 3600) {
    return Math.floor(Date.now() / 1000) + secondsFromNow;
  }

  // Helper to advance EVM time forward to any timestamp (never backward!)
  async function advanceEvmTimeTo(targetTimestamp) {
    const latest = (await ethers.provider.getBlock("latest")).timestamp;
    const delta = targetTimestamp - latest;
    if (delta > 0) {
      await ethers.provider.send("evm_increaseTime", [delta]);
      await ethers.provider.send("evm_mine");
    }
  }

  beforeEach(async function () {
    ethers = require("hardhat").ethers;
    [owner, user1, user2, ...users] = await ethers.getSigners();

    const EventTicketNFT = await ethers.getContractFactory("EventTicketNFT");
    contract = await EventTicketNFT.deploy();

    TICKET_PRICE = ethers.parseEther("0.05");
  });

  describe("Event Creation", function () {
    it("Should create an event with correct details", async function () {
      const eventDate = freshFutureTimestamp();
      await expect(contract.createEvent(EVENT_NAME, TICKET_PRICE, MAX_TICKETS, eventDate))
        .to.emit(contract, "EventCreated")
        .withArgs(1, EVENT_NAME, TICKET_PRICE, MAX_TICKETS);

      const eventDetails = await contract.getEventDetails(1);
      expect(eventDetails.name).to.equal(EVENT_NAME);
      expect(eventDetails.price).to.equal(TICKET_PRICE);
      expect(eventDetails.maxTickets).to.equal(MAX_TICKETS);
      expect(eventDetails.soldTickets).to.equal(0);
      expect(eventDetails.isActive).to.be.true;
    });

    it("Should NOT allow zero tickets", async function () {
      const eventDate = freshFutureTimestamp();
      await expect(
        contract.createEvent(EVENT_NAME, TICKET_PRICE, 0, eventDate)
      ).to.be.revertedWith("Max tickets must be greater than 0");
    });

    it("Should NOT allow event with past date", async function () {
      const past = freshFutureTimestamp(-10000);
      await expect(
        contract.createEvent(EVENT_NAME, TICKET_PRICE, MAX_TICKETS, past)
      ).to.be.revertedWith("Event date must be in the future");
    });
  });

  describe("Ticket Minting", function () {
    let eventDate;
    beforeEach(async function () {
      eventDate = freshFutureTimestamp();
      await contract.createEvent(EVENT_NAME, TICKET_PRICE, MAX_TICKETS, eventDate);
    });

    it("User can mint a ticket with correct payment", async function () {
      await expect(
        contract.connect(user1).mintTicket(1, TOKEN_URI, { value: TICKET_PRICE })
      )
        .to.emit(contract, "TicketMinted")
        .withArgs(1, 1, user1.address);

      expect(await contract.ownerOf(1)).to.equal(user1.address);
      expect(await contract.tokenURI(1)).to.equal(TOKEN_URI);
    });

    it("Cannot mint if payment is not enough", async function () {
      await expect(
        contract.connect(user1).mintTicket(1, TOKEN_URI, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Cannot mint more than max tickets", async function () {
      for (let i = 0; i < MAX_TICKETS; i++) {
        await contract.connect(users[i]).mintTicket(1, TOKEN_URI, { value: TICKET_PRICE });
      }
      await expect(
        contract.connect(users[MAX_TICKETS]).mintTicket(1, TOKEN_URI, { value: TICKET_PRICE })
      ).to.be.revertedWith("Event is sold out");
    });

    it("Cannot mint twice for same event", async function () {
      await contract.connect(user1).mintTicket(1, TOKEN_URI, { value: TICKET_PRICE });
      await expect(
        contract.connect(user1).mintTicket(1, TOKEN_URI, { value: TICKET_PRICE })
      ).to.be.revertedWith("Already owns ticket for this event");
    });

    it("Event organizer receives payment", async function () {
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await contract.connect(user1).mintTicket(1, TOKEN_URI, { value: TICKET_PRICE });
      await tx.wait();
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter - balanceBefore).to.be.closeTo(TICKET_PRICE, ethers.parseEther("0.001"));
    });
  });

  describe("Ticket Verification & Usage", function () {
    let eventDate;
    beforeEach(async function () {
      eventDate = freshFutureTimestamp();
      await contract.createEvent(EVENT_NAME, TICKET_PRICE, MAX_TICKETS, eventDate);
      await contract.connect(user1).mintTicket(1, TOKEN_URI, { value: TICKET_PRICE });

      // Warp time forward: 30 mins before event
      await advanceEvmTimeTo(eventDate - 1800);
    });

    it("Can verify a valid ticket", async function () {
      const [isValid, isUsed, eventId, seatNumber, ownerAddr] = await contract.verifyTicket(1);
      expect(isValid).to.be.true;
      expect(isUsed).to.be.false;
      expect(eventId).to.equal(1);
      expect(seatNumber).to.equal(1);
      expect(ownerAddr).to.equal(user1.address);
    });

    it("Mark ticket as used", async function () {
      await contract.connect(user1).useTicket(1);
      const [, isUsed] = await contract.verifyTicket(1);
      expect(isUsed).to.be.true;
    });

    it("Cannot use ticket twice", async function () {
      await contract.connect(user1).useTicket(1);
      await expect(contract.connect(user1).useTicket(1)).to.be.revertedWith("Ticket already used");
    });

    it("Returns false for non-existent ticket", async function () {
      const [isValid] = await contract.verifyTicket(999);
      expect(isValid).to.be.false;
    });
  });

  describe("Ticket Transfer", function () {
    let eventDate;
    beforeEach(async function () {
      eventDate = freshFutureTimestamp();
      await contract.createEvent(EVENT_NAME, TICKET_PRICE, MAX_TICKETS, eventDate);
      await contract.connect(user1).mintTicket(1, TOKEN_URI, { value: TICKET_PRICE });

      // Warp time forward: 30 mins before event
      await advanceEvmTimeTo(eventDate - 1800);
    });

    it("Allows owner to transfer unused ticket", async function () {
      await contract.connect(user1).transferTicket(user2.address, 1);
      expect(await contract.ownerOf(1)).to.equal(user2.address);
    });

    it("Prevents transfer of used ticket", async function () {
      await contract.connect(user1).useTicket(1);
      await expect(
        contract.connect(user1).transferTicket(user2.address, 1)
      ).to.be.revertedWith("Cannot transfer used ticket");
    });
  });
});
