import { ethers, upgrades } from "hardhat";
import { HomunculiV2, HomunculiV2__factory } from "../typechain-types";

async function main() {
  const proxyAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const HomunculiV2Factory = (await ethers.getContractFactory("HomunculiV2")) as HomunculiV2__factory;
  console.log("Deploying HomunculiV2...");

  await upgrades.upgradeProxy(proxyAddress, HomunculiV2Factory);
  console.log("Upgrade successful!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
