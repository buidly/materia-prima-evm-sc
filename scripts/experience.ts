import { ethers, upgrades } from "hardhat";
import { Homunculi, Homunculi__factory } from "../typechain-types";

async function main() {
  const homunculiAddress = "0x271205D00B914441EEEcd62D962e6C18B77C6A18";
  const homunculi = await ethers.getContractAt("Homunculi", homunculiAddress) as Homunculi;
  const [owner] = await ethers.getSigners();

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const domain = {
    name: "MPHomunculi",
    version: "1",
    chainId,
    verifyingContract: homunculiAddress,
  };

  const types = {
    Experience: [
      { name: "tokenId", type: "uint256" },
      { name: "newExperience", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
  };

  const timestamp = Math.floor(Date.now() / 1000) - 10;
  const value = {
    tokenId: 1,
    newExperience: 30,
    timestamp,
  };
  const signature = await owner.signTypedData(domain, types, value);

  console.log("Updating experience...");

  await homunculi.updateExperience(1, 30, timestamp, signature);

  console.log("Experience updated!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
