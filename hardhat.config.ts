import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
import dotenv from "dotenv";
import "@nomicfoundation/hardhat-ledger";

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
    mainnet: 167000,
  };

  const heklaRpcUrls = [
    "https://taiko-hekla.gateway.tenderly.co",
    "https://taiko-hekla.drpc.org",
    "https://taiko-hekla-rpc.publicnode.com",
    "https://rpc.ankr.com/taiko_hekla",
    "https://hekla.taiko.tools",
    "https://taiko-hekla.blockpi.network/v1/rpc/public",
  ];

  const mainnetRpcUrls = [
    "https://taiko-rpc.publicnode.com",
    "https://rpc.ankr.com/taiko",
    "https://taiko-mainnet.gateway.tenderly.co",
    "https://taiko.drpc.org",
    "https://rpc.taiko.xyz",
    "https://rpc.mainnet.taiko.xyz",
    "https://rpc.taiko.tools",
    "https://taiko-mainnet.rpc.porters.xyz/taiko-public",
  ];

  const rpcUrls = {
    hekla: heklaRpcUrls[Math.floor(Math.random() * heklaRpcUrls.length)],
    mainnet: mainnetRpcUrls[Math.floor(Math.random() * mainnetRpcUrls.length)],
  };

  const accounts = {
    hekla: {
      accounts: [privateKey],
    },
    mainnet: {
      ledgerAccounts: [process.env.LEDGER_ACCOUNT] as string[],
    },
  }

  return {
    url: rpcUrls[network],
    chainId: chainIds[network],
    ...accounts[network],
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
  }
};

export default config;
