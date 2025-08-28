const hre = require("hardhat");

async function main() {
  // Deploy contract
  const EventTicketNFT = await hre.ethers.getContractFactory("EventTicketNFT");
  const contract = await EventTicketNFT.deploy();
  await contract.waitForDeployment(); // ethers v6 deployment confirmation

  // Print deployed address
  const address = await contract.getAddress();
  console.log("✅ EventTicketNFT deployed to:", address);

  // Save ABI and address to disk for frontend usage (optional)
  const fs = require("fs");
  const artifacts = await hre.artifacts.readArtifact("EventTicketNFT");
  fs.writeFileSync(
    "frontend/src/EventTicketNFT-abi.json",
    JSON.stringify(artifacts.abi, null, 2)
  );
  fs.writeFileSync("frontend/src/EventTicketNFT-address.txt", address);

  console.log("ℹ️  ABI & address saved in frontend/src/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
