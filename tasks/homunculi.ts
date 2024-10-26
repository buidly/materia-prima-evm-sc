import "@nomicfoundation/hardhat-toolbox";
import { getDeployOptions } from "./args/deployOptions";
import { scope } from "hardhat/config";
import fs from "fs";
import { Homunculi } from "../typechain-types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

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
  .setAction(async (taskArgs, hre) => {
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
  .setAction(async (taskArgs, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const tx = await homunculi.pause();

    console.log("Homunculi contract paused", tx.hash);
  });

homunculiScope.task("unpause", "Unpauses Homunculi contract")
  .setAction(async (taskArgs, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const tx = await homunculi.unpause();

    console.log("Homunculi contract unpaused", tx.hash);
  });

homunculiScope.task("withdraw", "Withdraws funds from Homunculi contract")
  .setAction(async (taskArgs, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const tx = await homunculi.withdraw();

    console.log("Withdrawal successful", tx.hash);
  });

homunculiScope.task("set-signer-address", "Sets the signer address for Homunculi contract")
  .addParam("address", "Signer address")
  .setAction(async (taskArgs, hre) => {
    const homunculi = await getHomunculiContract(hre);

    const tx = await homunculi.setSignerAddress(taskArgs.address);

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