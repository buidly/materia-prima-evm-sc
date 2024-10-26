import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    taiko: {
      url: process.env.TAIKO_RPC_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      chainId: parseInt(process.env.TAIKO_CHAIN_ID!),
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      chainId: parseInt(process.env.SEPOLIA_CHAIN_ID!),
    },
    fuji: {
      url: process.env.FUJI_RPC_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      chainId: parseInt(process.env.FUJI_CHAIN_ID!),
    }
  },
};

export default config;
