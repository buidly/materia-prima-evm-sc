import "@nomicfoundation/hardhat-toolbox";
import { getDeployOptions } from "./args/deployOptions";
import { scope } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getSetupConfig, updateSetupConfig } from "./utils/config";
import { GatherRun } from "../typechain-types";
import fs from "fs";
import { getHomunculiContract } from "./homunculi";

const gatherRunScope = scope("gather-run", "GatherRun contract tasks");

const getGatherRunContract = async (hre: HardhatRuntimeEnvironment) => {
  console.log('Using RPC URL:', (hre.network.config as any).url);

  const [adminWallet] = await hre.ethers.getSigners();
  console.log("Admin Public Address: ", adminWallet.address);

  const gatherRunAddress = getSetupConfig(hre.network.name, 'gather-run');
  console.log("GatherRun deployed to: ", gatherRunAddress);

  const gatherRunContractFactory = await hre.ethers.getContractFactory("GatherRun");
  const gatherRunContract = gatherRunContractFactory.attach(gatherRunAddress).connect(adminWallet) as GatherRun;

  return gatherRunContract;
}

gatherRunScope.task("deploy", "Deploys GatherRun contract")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address:", adminWallet.address);

    console.log("Deploying GatherRun contract");
    const GatherRun = (await hre.ethers.getContractFactory("GatherRun")).connect(adminWallet);
    const gatherRunContract = await hre.upgrades.deployProxy(GatherRun, { kind: "transparent", ...getDeployOptions(taskArgs) });

    await gatherRunContract.waitForDeployment();
    console.log("GatherRun deployed to:", gatherRunContract.target);

    updateSetupConfig(hre.network.name, 'gather-run', gatherRunContract.target);
  });

gatherRunScope.task("upgrade", "Upgrades GatherRun contract")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (_, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address: ", adminWallet.address);

    const gatherRunAddress = getSetupConfig(hre.network.name, 'gather-run');
    console.log("GatherRun deployed to: ", gatherRunAddress);

    console.log("Upgrading GatherRun contract");
    const factory = (await hre.ethers.getContractFactory("GatherRun")).connect(adminWallet);
    const upgraded = await hre.upgrades.upgradeProxy(gatherRunAddress, factory); // no additional calls on the upgrade method

    console.log("New GatherRun deployed to: ", upgraded.target);
  });

gatherRunScope.task("pause", "Pauses GatherRun contract")
  .setAction(async (_, hre) => {
    const gatherRun = await getGatherRunContract(hre);

    const tx = await gatherRun.pause();

    console.log("GatherRun contract paused", tx.hash);
  });

gatherRunScope.task("unpause", "Unpauses GatherRun contract")
  .setAction(async (_, hre) => {
    const gatherRun = await getGatherRunContract(hre);

    const tx = await gatherRun.unpause();

    console.log("GatherRun contract unpaused", tx.hash);
  });

gatherRunScope.task("accept-nft", "Accepts an NFT for a GatherRun")
  .addParam("address", "NFT contract address")
  .setAction(async ({ address }, hre) => {
    const gatherRun = await getGatherRunContract(hre);

    const tx = await gatherRun.acceptNftAddress(address);

    console.log("NFT accepted", tx.hash);
  });

gatherRunScope.task("create-run", "Creates a new GatherRun")
  .addParam("input", "NFT details input file path")
  .setAction(async ({ input }, hre) => {
    const gatherRun = await getGatherRunContract(hre);

    const details = JSON.parse(fs.readFileSync(input, "utf8"));

    const tx = await gatherRun.createRun(details.duration, details.drops);

    console.log("GatherRun created set", tx.hash);
  });

gatherRunScope.task("create-locations", "Creates all GatherRun locations")
  .addParam("input", "input file path")
  .setAction(async ({ input }, hre) => {
    const gatherRun = await getGatherRunContract(hre);

    const locations = JSON.parse(fs.readFileSync(input, "utf8"));

    console.log('-----')

    const locationsSetup = [];
    for (const location of locations) {
      console.log(`Creating location ${location.title} with ${location.runs.length} runs`);

      const receiptPromises: Promise<any>[] = [];
      for (const run of location.runs) {
        const duration = BigInt(run.durationInSeconds);
        const drops = run.drop.map((drop: any) => ({
          resourceType: drop.resource.type,
          resourceAmount: drop.resource.quantity,
          minProbability: BigInt(drop.minProbability * 10000),
          maxProbability: BigInt(drop.maxProbability * 10000),
        }));

        const runTx = await gatherRun.createRun(duration, drops);

        receiptPromises.push(runTx.wait());

        console.log(`-- Creating run of duration ${run.durationInSeconds} with ${run.drop.length} drops. Tx: ${runTx.hash}`);
      }

      console.log(`-- Waiting for ${receiptPromises.length} run receipts`);

      const receipts = await Promise.all(receiptPromises);

      const runIds = [];
      for (const receipt of receipts) {
        const createdRunId = (receipt?.logs[0] as any).args[0] as bigint;
        runIds.push(createdRunId);

        console.log(`-- Run created with ID ${createdRunId}`);
      }

      locationsSetup.push({
        title: location.title,
        type: location.type,
        runIds,
      });
    }

    updateSetupConfig(hre.network.name, 'gather-run-locations', locationsSetup);
  });


gatherRunScope.task("start-expedition", "Starts a GatherRun")
  .addParam("runId", "Run ID")
  .addParam("tokenId", "Token ID")
  .setAction(async ({ runId, tokenId }, hre) => {
    const homunculi = await getHomunculiContract(hre);
    const gatherRun = await getGatherRunContract(hre);

    await homunculi.approve(gatherRun.target, tokenId);
    const tx = await gatherRun.startExpedition(runId, homunculi.target, tokenId);

    console.log("Expedition started", tx.hash);
  });

gatherRunScope.task("end-expedition", "Ends a GatherRun")
  .addParam("tokenId", "Token ID")
  .setAction(async ({ tokenId }, hre) => {
    const homunculi = await getHomunculiContract(hre);
    const gatherRun = await getGatherRunContract(hre);

    const tx = await gatherRun.endExpedition(homunculi.target, tokenId);

    console.log("Expedition ended", tx.hash);
  });
