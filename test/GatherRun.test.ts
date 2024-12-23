import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { deployUpgradableContract } from "./utils/deploy.utils";
import { Homunculi, GatherRun } from "../typechain-types";

describe("GatherRun Contract", function () {
  let adminWallet: SignerWithAddress, otherWallet: SignerWithAddress;

  before(async function () {
    [adminWallet, otherWallet] = await ethers.getSigners();
  });

  let gatherRun: GatherRun & { address: string };
  let homunculi: Homunculi & { address: string };
  beforeEach(async function () {
    gatherRun = await deployUpgradableContract(adminWallet, "GatherRun");
    await gatherRun.unpause();

    homunculi = await deployUpgradableContract(adminWallet, "Homunculi");
    await homunculi.unpause();
  });

  describe("Deployment", function () {
    it("should creator as admin", async function () {
      expect(await gatherRun.admin()).to.equal(adminWallet.address);
    });
  });

  describe("Access Control", function () {
    it("should allow the admin to set a new admin", async function () {
      await gatherRun.transferAdmin(otherWallet.address);
      expect(await gatherRun.admin()).to.equal(otherWallet.address);
    });

    it("should not allow non-admin to set a new admin", async function () {
      await expect(
        gatherRun.connect(otherWallet).transferAdmin(otherWallet.address)
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });

    it("should allow the admin to renounce admin", async function () {
      await gatherRun.renounceAdmin();
      expect(await gatherRun.admin()).to.equal(ethers.ZeroAddress);
    });

    it("should not allow non-admin to renounce admin", async function () {
      await expect(
        gatherRun.connect(otherWallet).renounceAdmin()
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });
  });

  describe("Pausing", function () {
    it("should allow the admin to pause the contract", async function () {
      await gatherRun.pause();
      expect(await gatherRun.paused()).to.be.true;
    });

    it("should allow the admin to unpause the contract", async function () {
      await gatherRun.pause();
      await gatherRun.unpause();
      expect(await gatherRun.paused()).to.be.false;
    });

    it("should not allow non-admin to pause the contract", async function () {
      await expect(
        gatherRun.connect(otherWallet).pause()
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });

    it("should not allow non-admin to unpause the contract", async function () {
      await gatherRun.pause();
      await expect(
        gatherRun.connect(otherWallet).unpause()
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });
  });

  describe("Create Run", function () {
    it("should create a run with valid drops", async function () {
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

      await gatherRun.createRun(duration, drops);

      expect(await gatherRun.durations(1)).to.equal(duration);

      const storedDropsRaw = await gatherRun.getDrops(1);
      const storedDrops: any[] = storedDropsRaw.map((drop) => ({
        resourceType: drop.resourceType,
        resourceAmount: drop.resourceAmount,
        minProbability: drop.minProbability,
        maxProbability: drop.maxProbability,
      }));

      expect(storedDrops).to.deep.equal(drops);

      expect(await gatherRun.nextRunId()).to.equal(2);
    });

    it("should emit RunCreated event", async function () {
      const drops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 10000,
        },
      ];
      const dropStructs = drops.map((drop) => [drop.resourceType, drop.resourceAmount, drop.minProbability, drop.maxProbability]);

      await expect(gatherRun.createRun(3600, drops))
        .to.emit(gatherRun, "RunCreated")
        .withArgs(1, 3600, dropStructs);
    });

    it("should revert when called by non-owner", async function () {
      const drops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 10000,
        },
      ];

      await expect(
        gatherRun.connect(otherWallet).createRun(3600, drops)
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });

    it("should revert when probabilities are invalid", async function () {
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
          minProbability: 4000, // Overlaps with previous maxProbability
          maxProbability: 10000,
        },
      ];

      await expect(
        gatherRun.createRun(3600, drops)
      ).to.be.revertedWith("Probability ranges must be sequential");
    });

    it("should revert when total probabilities are incorrect", async function () {
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
          maxProbability: 9000, // Total maxProbability less than 10000
        },
      ];

      await expect(
        gatherRun.createRun(3600, drops)
      ).to.be.revertedWith(
        "Last drop probability must be 10000"
      );
    });

    it("should revert when minProbability is greater than maxProbability", async function () {
      const drops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 6000,
          maxProbability: 5000,
        },
      ];

      await expect(
        gatherRun.createRun(3600, drops)
      ).to.be.revertedWith(
        "minProbability cannot be greater than maxProbability"
      );
    });
  });

  describe("Update Run", function () {
    beforeEach(async function () {
      const initialDrops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 10000,
        },
      ];

      await gatherRun.createRun(3600, initialDrops);
    });

    it("should update a run with valid drops", async function () {
      const newDrops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 3333,
        },
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 2,
          minProbability: 3333,
          maxProbability: 6666,
        },
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 3,
          minProbability: 6666,
          maxProbability: 10000,
        },
      ];

      await gatherRun.updateRun(1, 7200, newDrops);

      expect(await gatherRun.durations(1)).to.equal(7200);

      const storedDropsRaw = await gatherRun.getDrops(1);
      const storedDrops: any[] = storedDropsRaw.map((drop) => ({
        resourceType: drop.resourceType,
        resourceAmount: drop.resourceAmount,
        minProbability: drop.minProbability,
        maxProbability: drop.maxProbability,
      }));

      expect(storedDrops).to.deep.equal(newDrops);
    });

    it("should emit RunUpdated event", async function () {
      const newDrops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 10000,
        },
      ];
      const newDropStructs = newDrops.map((drop) => [drop.resourceType, drop.resourceAmount, drop.minProbability, drop.maxProbability]);

      await expect(gatherRun.updateRun(1, 7200, newDrops))
        .to.emit(gatherRun, "RunUpdated")
        .withArgs(1, 7200, newDropStructs);
    });

    it("should revert when updating non-existent run", async function () {
      const drops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 10000,
        },
      ];

      await expect(
        gatherRun.updateRun(2, 3600, drops)
      ).to.be.revertedWith("Run does not exist");
    });

    it("should revert when called by non-owner", async function () {
      const newDrops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 10000,
        },
      ];

      await expect(
        gatherRun.connect(otherWallet).updateRun(1, 7200, newDrops)
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });

    it("should revert when probabilities are invalid", async function () {
      const newDrops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 5000,
        },
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 2,
          minProbability: 4000, // Overlaps with previous maxProbability
          maxProbability: 10000,
        },
      ];

      await expect(
        gatherRun.updateRun(1, 7200, newDrops)
      ).to.be.revertedWith("Probability ranges must be sequential");
    });
  });

  describe("Start expedition", function () {
    beforeEach(async function () {
      const initialDrops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 10000,
        },
      ];

      await gatherRun.createRun(3600, initialDrops);
      await gatherRun.acceptNftAddress(homunculi.address);

      await homunculi.setNftDetails(
        "Branos",
        "Branos",
        "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
        ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"],
        "png",
        2500,
        1000,
        1,
      );
      await homunculi.setMintPrice("Branos", ethers.parseEther("0.1"));
      await homunculi.mint("Branos", { value: ethers.parseEther("0.1") });
    });

    it("should set accepted NFT address", async function () {
      expect(await gatherRun.acceptedNftAddresses(homunculi.address)).to.be.true;
    });

    it("should remove accepted NFT address", async function () {
      await gatherRun.removeNftAddress(homunculi.address);
      expect(await gatherRun.acceptedNftAddresses(homunculi.address)).to.be.false;
    });

    it("should allow a user to start an expedition", async function () {
      await homunculi.approve(gatherRun.address, 1);
      const transaction = await gatherRun.startExpedition(1, homunculi.address, 1);

      const transactionTimestamp = (await ethers.provider.getBlock(transaction.blockHash as string))!.timestamp;

      const lockedHomunculi = await gatherRun.getLockedHomunculi(homunculi.address, 1);
      expect(lockedHomunculi.runId).to.equal(1);
      expect(lockedHomunculi.owner).to.equal(adminWallet.address);
      expect(lockedHomunculi.unlockTime).to.equal(transactionTimestamp + 3600);
      expect(lockedHomunculi.withdrawn).to.be.false;

      expect(await homunculi.ownerOf(1)).to.equal(gatherRun.address);

      const userLockedNFT = await gatherRun.userLockedNFTs(adminWallet.address, 0);
      expect(userLockedNFT.nftAddress).to.equal(homunculi.address);
      expect(userLockedNFT.tokenId).to.equal(1);


      const [[userLockedNFT2], userLockedHomunculi] = await gatherRun.getUserLockedHomunculi(adminWallet.address);
      expect(userLockedNFT2).to.deep.equal(userLockedNFT);
      expect(userLockedHomunculi.length).to.equal(1);
    });

    it("should revert if the user does not own the NFT", async function () {
      await homunculi.approve(gatherRun.address, 1);
      await expect(
        gatherRun.connect(otherWallet).startExpedition(1, homunculi.address, 1)
      ).to.be.revertedWith("Sender does not own the NFT");
    });

    it("should revert if the NFT is not approved", async function () {
      await expect(
        gatherRun.startExpedition(1, homunculi.address, 1)
      ).to.be.rejected;
    });

    it("should revert if the run does not exist", async function () {
      await homunculi.approve(gatherRun.address, 1);
      await expect(
        gatherRun.startExpedition(2, homunculi.address, 1)
      ).to.be.revertedWith("Run does not exist");
    });

    it("should revert if the NFT address is not accepted", async function () {
      await gatherRun.removeNftAddress(homunculi.address);
      await homunculi.approve(gatherRun.address, 1);
      await expect(
        gatherRun.startExpedition(1, homunculi.address, 1)
      ).to.be.revertedWith("NFT address not accepted for GatherRun");
    });

    it("should emit ExpeditionStarted event", async function () {
      await homunculi.approve(gatherRun.address, 1);

      expect(gatherRun.startExpedition(1, homunculi.address, 1))
        .to.emit(gatherRun, "ExpeditionStarted")
    });
  });

  describe("End expedition", function () {
    beforeEach(async function () {
      const initialDrops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 10000,
        },
      ];

      await gatherRun.createRun(3600, initialDrops);
      await gatherRun.acceptNftAddress(homunculi.address);

      await homunculi.setNftDetails(
        "Branos",
        "Branos",
        "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
        ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"],
        "png",
        2500,
        1000,
        1,
      );
      await homunculi.setMintPrice("Branos", ethers.parseEther("0.1"));
      await homunculi.mint("Branos", { value: ethers.parseEther("0.1") });
    });

    it("should allow a user to withdraw their homunculus after the expedition is over", async function () {
      await homunculi.approve(gatherRun.address, 1);
      await gatherRun.startExpedition(1, homunculi.address, 1);

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const transaction = await gatherRun.endExpedition(homunculi, 1);
      const receipt = await transaction.wait();

      const lockedHomunculi = await gatherRun.getLockedHomunculi(homunculi.address, 1);
      expect(lockedHomunculi.withdrawn).to.equal(true);

      expect(await homunculi.ownerOf(1)).to.equal(adminWallet.address);

      const [_, userLockedHomunculi] = await gatherRun.getUserLockedHomunculi(adminWallet.address);
      expect(userLockedHomunculi.length).to.equal(0);

      const endExpeditionEvent = (receipt?.logs[1] as any).args;
      expect(endExpeditionEvent[3] as string).to.equal("FIRE_DUST");
      expect(endExpeditionEvent[4] as bigint).to.equal(1);
    });

    it("should revert if the homunculus is still locked", async function () {
      await homunculi.approve(gatherRun.address, 1);
      await gatherRun.startExpedition(1, homunculi.address, 1);

      await expect(
        gatherRun.endExpedition(homunculi.address, 1)
      ).to.be.revertedWith("Homunculus is still locked");
    });

    it("should revert if the user does not own the homunculus", async function () {
      await homunculi.approve(gatherRun.address, 1);
      await gatherRun.startExpedition(1, homunculi.address, 1);

      await expect(
        gatherRun.connect(otherWallet).endExpedition(homunculi.address, 1)
      ).to.be.revertedWith("Sender does not own the NFT");
    });

    it("should emit ExpeditionEnded event", async function () {
      await homunculi.approve(gatherRun.address, 1);
      await gatherRun.startExpedition(1, homunculi.address, 1);

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      expect(gatherRun.endExpedition(homunculi.address, 1))
        .to.emit(gatherRun, "ExpeditionEnded")
    });

    it("should award the user with the correct resources", async function () {
      const drops = [
        {
          resourceType: "FIRE_DUST",
          resourceAmount: 1,
          minProbability: 0,
          maxProbability: 3333,
        },
        {
          resourceType: "WATER_DUST",
          resourceAmount: 2,
          minProbability: 3333,
          maxProbability: 6666,
        },
        {
          resourceType: "EARTH_DUST",
          resourceAmount: 3,
          minProbability: 6666,
          maxProbability: 10000,
        },
      ];
      await gatherRun.createRun(3600, drops);

      await homunculi.approve(gatherRun.address, 1);
      await gatherRun.startExpedition(2, homunculi.address, 1);

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const transaction = await gatherRun.endExpedition(homunculi, 1);
      const receipt = await transaction.wait();

      const endExpeditionEvent = (receipt?.logs[1] as any).args;
      const resourceType = endExpeditionEvent[3] as string;
      const resourceAmount = endExpeditionEvent[4] as bigint;

      expect(resourceType).contain.oneOf(["FIRE_DUST", "WATER_DUST", "EARTH_DUST"]);

      const expectedResourceAmount = drops.find((drop) => drop.resourceType === resourceType)!.resourceAmount;
      expect(resourceAmount).to.equal(expectedResourceAmount);
    });

  });
});
