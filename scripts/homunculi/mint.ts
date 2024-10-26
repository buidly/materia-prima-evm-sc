import { ethers, upgrades } from "hardhat";
import { Homunculi, Homunculi__factory } from "../../typechain-types";

async function main() {
  const homunculi = await ethers.getContractAt("Homunculi", "0xa1F246BefD87E60aD6D8d50EEe1aC5dd5a608f03") as Homunculi;

  let tx = await homunculi.setMintPrice("Branos", ethers.parseEther("0.0000001"));
  await tx.wait();
  tx = await homunculi.setMintPrice("Glys", ethers.parseEther("0.0000001"));
  await tx.wait();

  tx = await homunculi.mint("Branos", { value: ethers.parseEther("0.0000001") });
  await tx.wait();
  tx = await homunculi.mint("Branos", { value: ethers.parseEther("0.0000001") });
  await tx.wait();
  tx = await homunculi.mint("Glys", { value: ethers.parseEther("0.0000001") });
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
