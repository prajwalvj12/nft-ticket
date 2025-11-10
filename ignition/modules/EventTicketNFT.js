const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("EventTicketNFTModule", (m) => {
  const eventTicketNFT = m.contract("EventTicketNFT");

  return { eventTicketNFT };
});
