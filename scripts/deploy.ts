import { ethers, upgrades } from "hardhat";
import { Homunculi, Homunculi__factory } from "../typechain-types";

async function main() {
  const HomunculiFactory = (await ethers.getContractFactory("Homunculi")) as Homunculi__factory;
  console.log("Deploying Homunculi...");

  const homunculi = await upgrades.deployProxy(HomunculiFactory, [], { initializer: "initialize" }) as any as Homunculi;
  await homunculi.waitForDeployment();

  const homunculiAddress = await homunculi.getAddress();
  console.log("Homunculi deployed to:", homunculiAddress);

  await homunculi.setNftDetails(
    "Branos",
    "Branos",
    "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
    ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"],
    "png",
    2500,
    1000,
    1
  );
  await homunculi.setMintPrice("Branos", ethers.parseEther("0.0001"));
  console.log("NFT details set for Branos");

  await homunculi.setNftDetails(
    "Glys",
    "Glys",
    "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
    ["MateriaPrima", "Homunculi", "Glys", "Laboratory", "Alchemist", "Arena"],
    "png",
    2500,
    1000,
    1
  );
  await homunculi.setMintPrice("Glys", ethers.parseEther("0.0001"));
  console.log("NFT details set for Glys");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
