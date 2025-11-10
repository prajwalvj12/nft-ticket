const { ethers } = require("hardhat");

async function main() {
  const marketplaceAddress = "0xb498345d63B28710Ea102052d64aE50F596D0767";

  console.log("\n🏪 Checking Marketplace Listings");
  console.log("==================================");
  console.log("Marketplace:", marketplaceAddress);

  const Marketplace = await ethers.getContractAt("TicketMarketplace", marketplaceAddress);

  // Check recent TicketListed events
  console.log("\n📡 Fetching TicketListed events...");
  const filter = Marketplace.filters.TicketListed();
  const events = await Marketplace.queryFilter(filter, -10000, 'latest');

  console.log(`Found ${events.length} listing events:\n`);

  for (const event of events) {
    const tokenId = event.args.tokenId;
    const seller = event.args.seller;
    const price = event.args.price;

    console.log(`📝 Listing Event:`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Seller: ${seller}`);
    console.log(`   Price: ${ethers.formatEther(price)} MATIC`);
    console.log(`   Block: ${event.blockNumber}`);

    // Check if listing is still active
    const listing = await Marketplace.getListing(tokenId);
    console.log(`   Status: ${listing.active ? '✅ ACTIVE' : '❌ Inactive'}`);
    console.log('');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
