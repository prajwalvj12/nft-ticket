const { ethers } = require("hardhat");

async function main() {
  const nftAddress = "0xeF205F36FD445cb9747d210656e9Bd2F82EC18A4";
  const marketplaceAddress = "0xb498345d63B28710Ea102052d64aE50F596D0767";
  const tokenId = 2;

  console.log("\n🎫 Checking Token Status");
  console.log("========================");
  console.log("NFT Contract:", nftAddress);
  console.log("Token ID:", tokenId);

  const nft = await ethers.getContractAt("EventTicketNFT", nftAddress);
  const marketplace = await ethers.getContractAt("TicketMarketplace", marketplaceAddress);

  try {
    // Check ticket details first to get all info
    const ticket = await nft.tickets(tokenId);

    // Check owner
    const owner = await nft.ownerOf(tokenId);
    console.log("\n👤 Current Owner:", owner);
    console.log("🎟️  Ticket Used:", ticket.isUsed ? "✅ YES" : "❌ NO");

    // Check marketplace approval
    const approvedAddress = await nft.getApproved(tokenId);
    console.log("🔓 Approved Address:", approvedAddress);
    console.log("   Is Marketplace Approved:", approvedAddress.toLowerCase() === marketplaceAddress.toLowerCase() ? "✅ YES" : "❌ NO");

    // Check listing status
    const listing = await marketplace.getListing(tokenId);
    console.log("\n📋 Listing Details:");
    console.log("   Seller:", listing.seller);
    console.log("   Price:", ethers.formatEther(listing.price), "MATIC");
    console.log("   Active:", listing.active ? "✅ ACTIVE" : "❌ INACTIVE");

    // Get original price
    const originalPrice = await nft.originalTicketPrice(tokenId);
    console.log("\n🎟️  Ticket Details:");
    console.log("   Event ID:", ticket.eventId.toString());
    console.log("   Seat Number:", ticket.seatNumber.toString());
    console.log("   Original Price:", ethers.formatEther(originalPrice), "MATIC");
    console.log("   Purchase Date:", new Date(Number(ticket.purchaseDate) * 1000).toLocaleString());
    console.log("   Used:", ticket.isUsed ? "✅ YES" : "❌ NO");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
