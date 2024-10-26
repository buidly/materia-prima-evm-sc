import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { GatherRun, GatherRun__factory, Homunculi, Homunculi__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { deployUpgradableContract } from "./utils/deploy.utils"

describe("GatherRun", function () {
  let adminWallet: SignerWithAddress, otherWallet: SignerWithAddress;

  before(async function () {
    [adminWallet, otherWallet] = await ethers.getSigners();
  });

  let homunculi: Homunculi;
  beforeEach(async function () {
    homunculi = await deployUpgradableContract(adminWallet, "Homunculi");
    await homunculi.unpause();


    // const HomunculiFactory = (await ethers.getContractFactory("Homunculi")) as Homunculi__factory;
    // homunculi = await upgrades.deployProxy(HomunculiFactory, [], { initializer: "initialize" }) as any as Homunculi;
    // await homunculi.waitForDeployment();
    // homunculiAddress = await homunculi.getAddress();

    // const GatherRunFactory = (await ethers.getContractFactory("GatherRun")) as GatherRun__factory;
    // gatherRun = await upgrades.deployProxy(GatherRunFactory, [], { initializer: "initialize" }) as any as GatherRun;
    // await gatherRun.waitForDeployment();
    // gatherRunAddress = await gatherRun.getAddress();

    // await gatherRun.acceptNftAddress(homunculiAddress);
  });

  // describe("Deployment", function () {
  //   it("Should set the right owner", async function () {
  //     expect(await gatherRun.owner()).to.equal(owner.address);
  //   });

  //   it("Should have nextRunId as 1", async function () {
  //     expect(await gatherRun.nextRunId()).to.equal(1);
  //   });
  // });

  // describe("Create Run", function () {
  //   it("Should create a run with valid drops", async function () {
  //     const duration = 3600;
  //     const drops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 5000,
  //       },
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 2,
  //         minProbability: 5000,
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await gatherRun.createRun(duration, drops);

  //     expect(await gatherRun.durations(1)).to.equal(duration);

  //     const storedDropsRaw = await gatherRun.getDrops(1);
  //     const storedDrops: any[] = storedDropsRaw.map((drop) => ({
  //       resourceType: drop.resourceType,
  //       resourceAmount: drop.resourceAmount,
  //       minProbability: drop.minProbability,
  //       maxProbability: drop.maxProbability,
  //     }));

  //     expect(storedDrops).to.deep.equal(drops);

  //     expect(await gatherRun.nextRunId()).to.equal(2);
  //   });

  //   it("Should emit RunCreated event", async function () {
  //     const drops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 10000,
  //       },
  //     ];
  //     const dropStructs = drops.map((drop) => [drop.resourceType, drop.resourceAmount, drop.minProbability, drop.maxProbability]);

  //     await expect(gatherRun.createRun(3600, drops))
  //       .to.emit(gatherRun, "RunCreated")
  //       .withArgs(1, 3600, dropStructs);
  //   });

  //   it("Should revert when called by non-owner", async function () {
  //     const drops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await expect(
  //       gatherRun.connect(addr1).createRun(3600, drops)
  //     ).to.be.revertedWithCustomError(gatherRun, "OwnableUnauthorizedAccount");
  //   });

  //   it("Should revert when probabilities are invalid", async function () {
  //     const drops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 5000,
  //       },
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 2,
  //         minProbability: 4000, // Overlaps with previous maxProbability
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await expect(
  //       gatherRun.createRun(3600, drops)
  //     ).to.be.revertedWith("Probability ranges must be sequential");
  //   });

  //   it("Should revert when total probabilities are incorrect", async function () {
  //     const drops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 5000,
  //       },
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 2,
  //         minProbability: 5000,
  //         maxProbability: 9000, // Total maxProbability less than 10000
  //       },
  //     ];

  //     await expect(
  //       gatherRun.createRun(3600, drops)
  //     ).to.be.revertedWith(
  //       "Last drop probability must be 10000"
  //     );
  //   });

  //   it("Should revert when minProbability is greater than maxProbability", async function () {
  //     const drops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 6000,
  //         maxProbability: 5000,
  //       },
  //     ];

  //     await expect(
  //       gatherRun.createRun(3600, drops)
  //     ).to.be.revertedWith(
  //       "minProbability cannot be greater than maxProbability"
  //     );
  //   });
  // });

  // describe("Update Run", function () {
  //   beforeEach(async function () {
  //     const initialDrops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await gatherRun.createRun(3600, initialDrops);
  //   });

  //   it("Should update a run with valid drops", async function () {
  //     const newDrops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 3333,
  //       },
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 2,
  //         minProbability: 3333,
  //         maxProbability: 6666,
  //       },
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 3,
  //         minProbability: 6666,
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await gatherRun.updateRun(1, 7200, newDrops);

  //     expect(await gatherRun.durations(1)).to.equal(7200);

  //     const storedDropsRaw = await gatherRun.getDrops(1);
  //     const storedDrops: any[] = storedDropsRaw.map((drop) => ({
  //       resourceType: drop.resourceType,
  //       resourceAmount: drop.resourceAmount,
  //       minProbability: drop.minProbability,
  //       maxProbability: drop.maxProbability,
  //     }));

  //     expect(storedDrops).to.deep.equal(newDrops);
  //   });

  //   it("Should emit RunUpdated event", async function () {
  //     const newDrops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 10000,
  //       },
  //     ];
  //     const newDropStructs = newDrops.map((drop) => [drop.resourceType, drop.resourceAmount, drop.minProbability, drop.maxProbability]);

  //     await expect(gatherRun.updateRun(1, 7200, newDrops))
  //       .to.emit(gatherRun, "RunUpdated")
  //       .withArgs(1, 7200, newDropStructs);
  //   });

  //   it("Should revert when updating non-existent run", async function () {
  //     const drops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await expect(
  //       gatherRun.updateRun(2, 3600, drops)
  //     ).to.be.revertedWith("Run does not exist");
  //   });

  //   it("Should revert when called by non-owner", async function () {
  //     const newDrops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await expect(
  //       gatherRun.connect(addr1).updateRun(1, 7200, newDrops)
  //     ).to.be.revertedWithCustomError(gatherRun, "OwnableUnauthorizedAccount");
  //   });

  //   it("Should revert when probabilities are invalid", async function () {
  //     const newDrops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 5000,
  //       },
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 2,
  //         minProbability: 4000, // Overlaps with previous maxProbability
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await expect(
  //       gatherRun.updateRun(1, 7200, newDrops)
  //     ).to.be.revertedWith("Probability ranges must be sequential");
  //   });
  // });

  // describe("Start expedition", function () {
  //   beforeEach(async function () {
  //     const initialDrops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await gatherRun.createRun(3600, initialDrops);

  //     await homunculi.setNftDetails(
  //       "Branos",
  //       "Branos",
  //       "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
  //       ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"],
  //       "png",
  //       2500,
  //       1000,
  //       1,
  //     );
  //     await homunculi.setMintPrice("Branos", ethers.parseEther("0.1"));
  //   });

  //   it("should allow a user to start an expedition", async function () {
  //     await homunculi.connect(addr1).mint("Branos", { value: ethers.parseEther("0.1") });

  //     await homunculi.connect(addr1).approve(gatherRunAddress, 1);
  //     await gatherRun.connect(addr1).startExpedition(1, homunculiAddress, 1);

  //     const lockedHomunculi = await gatherRun.getLockedHomunculi(homunculiAddress, 1);

  //     expect(lockedHomunculi.owner).to.equal(addr1.address);
  //   });
  // });

  // describe("Withdraw NFT", function () {
  //   beforeEach(async function () {
  //     const initialDrops = [
  //       {
  //         resourceType: "FIRE_DUST",
  //         resourceAmount: 1,
  //         minProbability: 0,
  //         maxProbability: 10000,
  //       },
  //     ];

  //     await gatherRun.createRun(3600, initialDrops);

  //     await homunculi.setNftDetails(
  //       "Branos",
  //       "Branos",
  //       "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
  //       ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"],
  //       "png",
  //       2500,
  //       1000,
  //       1,
  //     );
  //     await homunculi.setMintPrice("Branos", ethers.parseEther("0.1"));
  //   });

  //   it("should allow a user to withdraw their homunculus after the expedition is over", async function () {
  //     await homunculi.connect(addr1).mint("Branos", { value: ethers.parseEther("0.1") });

  //     await homunculi.connect(addr1).approve(gatherRunAddress, 1);
  //     await gatherRun.connect(addr1).startExpedition(1, homunculiAddress, 1);

  //     await ethers.provider.send("evm_increaseTime", [3600]);
  //     await ethers.provider.send("evm_mine");

  //     await gatherRun.connect(addr1).withdrawHomunculi(homunculi, 1);

  //     const lockedHomunculi = await gatherRun.getLockedHomunculi(
  //       homunculiAddress,
  //       1
  //     );

  //     expect(lockedHomunculi.withdrawn).to.equal(true);
  //   });

  //   it("should revert if the homunculus is still locked", async function () {
  //     await homunculi.connect(addr1).mint("Branos", { value: ethers.parseEther("0.1") });

  //     await homunculi.connect(addr1).approve(gatherRunAddress, 1);
  //     await gatherRun.connect(addr1).startExpedition(1, homunculiAddress, 1);

  //     await expect(
  //       gatherRun.connect(addr1).withdrawHomunculi(homunculiAddress, 1)
  //     ).to.be.revertedWith("Homunculus is still locked");
  //   });
  // });
});
