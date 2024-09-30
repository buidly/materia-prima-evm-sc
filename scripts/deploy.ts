import { ethers, upgrades } from "hardhat";
import { Homunculi, Homunculi__factory } from "../typechain-types";

async function main() {
  const HomunculiFactory = (await ethers.getContractFactory("Homunculi")) as Homunculi__factory;
  console.log("Deploying Homunculi...");

  const homunculi = await upgrades.deployProxy(HomunculiFactory, [], { initializer: "initialize" }) as any as Homunculi;
  await homunculi.waitForDeployment();

  const homunculiAddress = await homunculi.getAddress();
  console.log("Homunculi deployed to:", homunculiAddress);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
