import { ethers, upgrades } from "hardhat";
import { Homunculi, Homunculi__factory } from "../../typechain-types";

async function main() {
  const gasPrice = ethers.parseUnits("5", "gwei");

  const HomunculiFactory = (await ethers.getContractFactory("Homunculi")) as Homunculi__factory;
  console.log("Deploying Homunculi...");

  const homunculi = await upgrades.deployProxy(HomunculiFactory, [], { initializer: "initialize" }) as any as Homunculi;
  await homunculi.waitForDeployment();

  const homunculiAddress = await homunculi.getAddress();
  console.log("Homunculi deployed to:", homunculiAddress);

  console.log("Setting NFT details for Branos");
  let currentTx = await homunculi.setNftDetails(
    "Branos",
    "Branos",
    "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
    ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"],
    "png",
    2500,
    1000,
    1
    , { gasPrice, gasLimit: 1000000 });
  await currentTx.wait();

  currentTx = await homunculi.setMintPrice("Branos", ethers.parseEther("0.0001"));
  await currentTx.wait();
  console.log("NFT details set for Branos");

  console.log("Setting NFT details for Glys");
  currentTx = await homunculi.setNftDetails(
    "Glys",
    "Glys",
    "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
    ["MateriaPrima", "Homunculi", "Glys", "Laboratory", "Alchemist", "Arena"],
    "png",
    2500,
    1000,
    1
  );
  await currentTx.wait();

  currentTx = await homunculi.setMintPrice("Glys", ethers.parseEther("0.0001"));
  await currentTx.wait();
  console.log("NFT details set for Glys");

  console.log("Setting signer address");
  currentTx = await homunculi.setSignerAddress("0x48Ff04a4F09562c0e5345234a06F6B02A3514aCf");
  await currentTx.wait();
  console.log("Signer address set");

  console.log("Deployed Homunculi");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
