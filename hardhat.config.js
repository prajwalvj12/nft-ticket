require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGON_AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL;

module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {},
    "polygon-amoy": {
      url: POLYGON_AMOY_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80002,
      gas: "auto",
      gasPrice: 50_000_000_000,
      maxFeePerGas: 2_000_000_000_000,
      maxPriorityFeePerGas: 1_000_000_000,
    }
  }
};
