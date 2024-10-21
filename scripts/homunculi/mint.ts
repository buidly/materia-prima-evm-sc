import { ethers, upgrades } from "hardhat";
import { Homunculi, Homunculi__factory } from "../../typechain-types";

async function main() {
  const homunculi = await ethers.getContractAt("Homunculi", "0x271205D00B914441EEEcd62D962e6C18B77C6A18") as Homunculi;

  await homunculi.setMintPrice("Branos", ethers.parseEther("0.0000001"));
  await homunculi.setMintPrice("Glys", ethers.parseEther("0.0000001"));

  await homunculi.mint("Branos", { value: ethers.parseEther("0.0000001") });
  await homunculi.mint("Branos", { value: ethers.parseEther("0.0000001") });
  await homunculi.mint("Glys", { value: ethers.parseEther("0.0000001") });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
