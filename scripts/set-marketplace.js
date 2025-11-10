const { ethers } = require("hardhat");

async function main() {
  const eventTicketAddress = "0xeF205F36FD445cb9747d210656e9Bd2F82EC18A4";
  const marketplaceAddress = "0xb498345d63B28710Ea102052d64aE50F596D0767";
  const maxMarkupPercent = 500; // 500% = 5x original price allowed

  console.log("\n🔧 Configuring EventTicketNFT Marketplace");
  console.log("=========================================");
  console.log("EventTicketNFT:", eventTicketAddress);
  console.log("Marketplace:", marketplaceAddress);
  console.log("Max Markup:", maxMarkupPercent + "%");

  const EventTicketNFT = await ethers.getContractAt("EventTicketNFT", eventTicketAddress);

  console.log("\n📡 Calling setMarketplace...");
  const tx = await EventTicketNFT.setMarketplace(marketplaceAddress, maxMarkupPercent);

  console.log("Transaction sent:", tx.hash);
  console.log("Waiting for confirmation...");

  await tx.wait();

  console.log("✅ Transaction confirmed!");

  // Verify the update
  const officialMarketplace = await EventTicketNFT.officialMarketplace();
  const maxResaleMarkup = await EventTicketNFT.maxResaleMarkupPercent();

  console.log("\n✅ Configuration Updated:");
  console.log("Official Marketplace:", officialMarketplace);
  console.log("Max Resale Markup:", maxResaleMarkup.toString() + "%");

  if (officialMarketplace.toLowerCase() === marketplaceAddress.toLowerCase()) {
    console.log("\n🎉 Success! Marketplace is now configured.");
  } else {
    console.log("\n❌ Warning: Marketplace address doesn't match!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
