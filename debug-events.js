const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  console.log("\n🔍 Debugging Event Ticket Contract");
  console.log("=====================================");
  console.log("Contract Address:", contractAddress);

  // Get the contract
  const EventTicketNFT = await ethers.getContractAt("EventTicketNFT", contractAddress);

  console.log("\n📊 Checking events 1-10...\n");

  for (let i = 1; i <= 10; i++) {
    try {
      const event = await EventTicketNFT.getEventDetails(i);

      console.log(`Event ${i}:`);
      console.log(`  Name: "${event.name}"`);
      console.log(`  Name length: ${event.name.length}`);
      console.log(`  Price: ${ethers.formatEther(event.price)} MATIC`);
      console.log(`  Max Tickets: ${event.maxTickets.toString()}`);
      console.log(`  Sold Tickets: ${event.soldTickets.toString()}`);
      console.log(`  Event Date: ${new Date(Number(event.eventDate) * 1000).toLocaleString()}`);
      console.log(`  Is Active: ${event.isActive}`);
      console.log(`  Organizer: ${event.organizer}`);
      console.log("");

      if (event.name && event.name.length > 0) {
        console.log(`✅ Event ${i} EXISTS: "${event.name}"`);
      } else {
        console.log(`❌ Event ${i} does not exist (empty name)`);
      }
      console.log("---");

    } catch (error) {
      console.log(`❌ Event ${i}: Error - ${error.message}`);
      console.log("---");
    }
  }

  // Check for EventCreated events
  console.log("\n📡 Checking EventCreated logs...\n");
  try {
    const filter = EventTicketNFT.filters.EventCreated();
    const events = await EventTicketNFT.queryFilter(filter);

    console.log(`Found ${events.length} EventCreated events:`);
    events.forEach((event, index) => {
      console.log(`\n${index + 1}. Event Created:`);
      console.log(`   Event ID: ${event.args.eventId.toString()}`);
      console.log(`   Name: "${event.args.name}"`);
      console.log(`   Price: ${ethers.formatEther(event.args.price)} MATIC`);
      console.log(`   Max Tickets: ${event.args.maxTickets.toString()}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   Tx Hash: ${event.transactionHash}`);
    });
  } catch (error) {
    console.log("Error fetching EventCreated logs:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
