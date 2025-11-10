const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0xeF205F36FD445cb9747d210656e9Bd2F82EC18A4";

  console.log("\n🔍 Checking Marketplace Configuration");
  console.log("=====================================");
  console.log("Contract Address:", contractAddress);

  const EventTicketNFT = await ethers.getContractAt("EventTicketNFT", contractAddress);

  // Check marketplace configuration
  const officialMarketplace = await EventTicketNFT.officialMarketplace();
  const maxResaleMarkupPercent = await EventTicketNFT.maxResaleMarkupPercent();

  console.log("\n📊 Current Configuration:");
  console.log("Official Marketplace:", officialMarketplace);
  console.log("Max Resale Markup %:", maxResaleMarkupPercent.toString());

  if (officialMarketplace === "0x0000000000000000000000000000000000000000") {
    console.log("\n❌ Marketplace NOT configured!");
    console.log("💡 Need to call setMarketplace() to enable resales");
  } else {
    console.log("\n✅ Marketplace is configured");
    console.log(`   Tickets can be resold for up to ${maxResaleMarkupPercent}% above original price`);
  }

  // Check ticket #2 details
  console.log("\n🎫 Checking Token #2:");
  try {
    const ticketDetails = await EventTicketNFT.getTicketDetails(2);
    const originalPrice = await EventTicketNFT.originalTicketPrice(2);

    console.log("Event ID:", ticketDetails.eventId.toString());
    console.log("Seat Number:", ticketDetails.seatNumber.toString());
    console.log("Is Used:", ticketDetails.isUsed);
    console.log("Original Price:", ethers.formatEther(originalPrice), "MATIC");

    const maxResalePrice = originalPrice + ((originalPrice * maxResaleMarkupPercent) / BigInt(100));
    console.log("Max Resale Price:", ethers.formatEther(maxResalePrice), "MATIC");

  } catch (error) {
    console.log("Error fetching ticket:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
