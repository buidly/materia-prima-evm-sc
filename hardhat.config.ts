import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
import dotenv from "dotenv";

import "./tasks";
import { NetworkUserConfig } from "hardhat/types";

dotenv.config();

// Ensure that we have all the environment variables we need.
if (!process.env.PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}
const privateKey = `0x${process.env.PRIVATE_KEY}`;

function getTaikoConfig(network: "hekla" | "mainnet"): NetworkUserConfig {
  const chainIds = {
    hekla: 167009,
    mainnet: 1, // TODO: Change to mainnet
  };

  const heklaRpcUrls = [
    "https://taiko-hekla.gateway.tenderly.co",
    "https://taiko-hekla.drpc.org",
    "https://taiko-hekla-rpc.publicnode.com",
    "https://rpc.hekla.taiko.xyz",
    "https://taiko-hekla.blockpi.network/v1/rpc/public",
    "https://rpc.ankr.com/taiko_hekla",
    "https://hekla.taiko.tools",
  ];

  const rpcUrls = {
    hekla: heklaRpcUrls[Math.floor(Math.random() * heklaRpcUrls.length)],
    mainnet: "https://rpc.hekla.taiko.xyz", // TODO: Change to mainnet
  };

  return {
    url: rpcUrls[network],
    chainId: chainIds[network],
    accounts: [privateKey],
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hekla_taiko: getTaikoConfig("hekla"),
    mainnet_taiko: getTaikoConfig("mainnet"),
  },
};

export default config;
