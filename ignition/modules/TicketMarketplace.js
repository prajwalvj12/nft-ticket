const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TicketMarketplaceModule", (m) => {
  // Get the EventTicketNFT contract address
  // You'll need to update this with your actual contract address
  const ticketContractAddress = "0xeF205F36FD445cb9747d210656e9Bd2F82EC18A4";

  const marketplace = m.contract("TicketMarketplace", [ticketContractAddress]);

  return { marketplace };
});
