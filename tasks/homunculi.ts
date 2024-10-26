import "@nomicfoundation/hardhat-toolbox";
import { getDeployOptions } from "./args/deployOptions";
import { scope } from "hardhat/config";
import fs from "fs";

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
