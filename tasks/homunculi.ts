import "@nomicfoundation/hardhat-toolbox";
import { getDeployOptions } from "./args/deployOptions";
import { scope, types } from "hardhat/config";
import fs from "fs";
import { Homunculi } from "../typechain-types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ErrorDecoder } from 'ethers-decode-error'

const homunculiScope = scope("homunculi", "Homunculi contract tasks");

const getSetupConfig = (network: string, key: string) => {
  const filename = "setup.config.json";
  const config = JSON.parse(fs.readFileSync(filename, "utf8"));
  return config[network][key];
}

const updateSetupConfig = (network: string, key: string, value: any) => {
  const filename = "setup.config.json";
  const config = JSON.parse(fs.readFileSync(filename, "utf8"));

  if (!config[network]) {
    config[network] = {};
  }

  config[network][key] = value;

  fs.writeFileSync(filename, JSON.stringify(config, null, 2));
}

const getHomunculiContract = async (hre: HardhatRuntimeEnvironment) => {
  console.log('Using RPC URL:', (hre.network.config as any).url);

  const [adminWallet] = await hre.ethers.getSigners();
  console.log("Admin Public Address: ", adminWallet.address);

  const homunculiAddress = getSetupConfig(hre.network.name, 'homunculi');
  console.log("Homunculi deployed to: ", homunculiAddress);

  const homunculiContractFactory = await hre.ethers.getContractFactory("Homunculi");
  const homunculiContract = homunculiContractFactory.attach(homunculiAddress).connect(adminWallet) as Homunculi;

  return homunculiContract;
}

homunculiScope.task("deploy", "Deploys Homunculi contract")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address:", adminWallet.address);

    console.log("Deploying Homunculi contract");
    const Homunculi = (await hre.ethers.getContractFactory("Homunculi")).connect(adminWallet);
    const homunculiContract = await hre.upgrades.deployProxy(Homunculi, { kind: "transparent", ...getDeployOptions(taskArgs) });

    await homunculiContract.waitForDeployment();
    console.log("Homunculi deployed to:", homunculiContract.target);

    updateSetupConfig(hre.network.name, 'homunculi', homunculiContract.target);
  });

homunculiScope.task("upgrade", "Upgrades Homunculi contract")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (_, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address: ", adminWallet.address);

    const homunculiAddress = getSetupConfig(hre.network.name, 'homunculi');
    console.log("Homunculi deployed to: ", homunculiAddress);

    console.log("Upgrading Homunculi contract");
    const factory = (await hre.ethers.getContractFactory("Homunculi")).connect(adminWallet);
    const upgraded = await hre.upgrades.upgradeProxy(homunculiAddress, factory); // no additional calls on the upgrade method

    console.log("New Homunculi deployed to: ", upgraded.target);
  });

homunculiScope.task("pause", "Pauses Homunculi contract")
  .setAction(async (_, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const tx = await homunculi.pause();

    console.log("Homunculi contract paused", tx.hash);
  });

homunculiScope.task("unpause", "Unpauses Homunculi contract")
  .setAction(async (_, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const tx = await homunculi.unpause();

    console.log("Homunculi contract unpaused", tx.hash);
  });

homunculiScope.task("withdraw", "Withdraws funds from Homunculi contract")
  .setAction(async (_, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const tx = await homunculi.withdraw();

    console.log("Withdrawal successful", tx.hash);
  });

homunculiScope.task("set-signer-address", "Sets the signer address for Homunculi contract")
  .addParam("address", "Signer address")
  .setAction(async ({ address }, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const tx = await homunculi.setSignerAddress(address);

    console.log("Signer address set", tx.hash);
  });

homunculiScope.task("set-nft-details", "Sets the NFT details for Homunculi contract")
  .addParam("input", "NFT details input file path")
  .setAction(async ({ input }, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const details = JSON.parse(fs.readFileSync(input, "utf8"));

    const tx = await homunculi.setNftDetails(
      details.nftId,
      details.name,
      details.collectionHash,
      details.tags,
      details.mediaType,
      details.maxLen,
      details.royalties,
      details.tier
    );

    console.log("NFT details set", tx.hash);
  })

homunculiScope.task("set-mint-price", "Sets the mint price for Homunculi contract")
  .addParam("id", "Homunculi ID")
  .addParam("price", "Mint price in ether")
  .setAction(async ({ id, price }, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const priceInWei = hre.ethers.parseEther(price);
    const tx = await homunculi.setMintPrice(id, priceInWei);

    console.log("Mint price set", tx.hash);
  });

homunculiScope.task("mint", "Mints a Homunculi NFT")
  .addParam("id", "Homunculi ID")
  .setAction(async ({ id }, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const mintPrice = await homunculi.mintPrice(id);
    const tx = await homunculi.mint(id, { value: mintPrice });

    console.log("Mint successful", tx.hash);
  });

homunculiScope.task("get-experience", "Gets the experience for a Homunculi NFT")
  .addParam("tokenId", "Homunculi token ID", undefined, types.int)
  .setAction(async ({ tokenId }, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const experience = await homunculi.experience(tokenId);
    console.log("Experience for token", tokenId, "is", experience);
  });

homunculiScope.task("update-experience", "Updates the experience for a Homunculi NFT")
  .addParam("tokenId", "Homunculi token ID", undefined, types.int)
  .addParam("newExperience", "New experience value", undefined, types.int)
  .setAction(async ({ tokenId, newExperience }, hre) => {
    const chainId = BigInt(hre.network.config.chainId!);
    const [adminWallet] = await hre.ethers.getSigners();
    const homunculi = await getHomunculiContract(hre);

    const domain = {
      name: "MPHomunculi",
      version: "1",
      chainId,
      verifyingContract: homunculi.target.toString(),
    };

    const types = {
      Experience: [
        { name: "tokenId", type: "uint256" },
        { name: "newExperience", type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const data = {
      tokenId,
      newExperience,
      timestamp,
    };
    const signature = await adminWallet.signTypedData(domain, types, data);

    try {
      const tx = await homunculi.updateExperience(tokenId, newExperience, timestamp, signature);

      console.log("Experience updated", tx.hash);

      await tx.wait();
    } catch (error) {
      const errorDecoder = ErrorDecoder.create()
      const { reason } = await errorDecoder.decode(error)
      console.log('Revert reason:', reason)
    }
  });