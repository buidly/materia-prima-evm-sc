import { ethers, upgrades } from "hardhat";
import { GatherRun, GatherRun__factory } from "../../typechain-types";

async function main() {
  // const gasPrice = ethers.parseUnits("5", "gwei");

  // const GatherRunFactory = (await ethers.getContractFactory("GatherRun")) as GatherRun__factory;
  // console.log("Deploying GatherRun...");

  // const gatherRun = await upgrades.deployProxy(GatherRunFactory, [], { initializer: "initialize" }) as any as GatherRun;
  // await gatherRun.waitForDeployment();

  // const gatherRunAddress = await gatherRun.getAddress();
  // console.log("GatherRun deployed to:", gatherRunAddress);


  // console.log("Setting accepted NFT address");
  // const homunculiAddress = "0xa1F246BefD87E60aD6D8d50EEe1aC5dd5a608f03";
  // let tx = await gatherRun.acceptNftAddress(homunculiAddress);
  // await tx.wait();
  // console.log("Accepted NFT address");

  const gatherRun = await ethers.getContractAt("GatherRun", "0xa9D39F0207fd7C8A5099239c64201eF57F850714") as GatherRun;

  const duration = 3600;
  const drops = [
    {
      resourceType: "FIRE_DUST",
      resourceAmount: 1,
      minProbability: 0,
      maxProbability: 5000,
    },
    {
      resourceType: "FIRE_DUST",
      resourceAmount: 2,
      minProbability: 5000,
      maxProbability: 10000,
    },
  ];

  console.log("Creating runs");
  let tx = await gatherRun.createRun(duration, drops);
  await tx.wait();

  tx = await gatherRun.createRun(duration, drops);
  await tx.wait();
  console.log("Runs created");

  console.log("Deployed GatherRun");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
