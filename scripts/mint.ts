import { ethers, upgrades } from "hardhat";
import { Homunculi, Homunculi__factory } from "../typechain-types";

async function main() {
  const homunculi = await ethers.getContractAt("Homunculi", "0x1edB2fa9cCa2EDC8431182afC80bF69C68db6035") as Homunculi;

  await homunculi.mint("Branos");
  await homunculi.mint("Branos");
  await homunculi.mint("Glys");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
