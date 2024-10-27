import { expect } from "chai";
import { ethers } from "hardhat";
import { Homunculi } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { deployUpgradableContract } from "./utils/deploy.utils";
import { decodeTokenURIToJSON, getCurrentBlockTimestamp, signUpdateExperienceData } from "./utils/homunculi.utils";

describe("Homunculi Contract", function () {
  let chainId: bigint;
  let adminWallet: SignerWithAddress, otherWallet: SignerWithAddress;

  before(async function () {
    [adminWallet, otherWallet] = await ethers.getSigners();
    chainId = (await ethers.provider.getNetwork()).chainId;
  });

  let homunculi: Homunculi & { address: string };
  beforeEach(async function () {
    homunculi = await deployUpgradableContract(adminWallet, "Homunculi");
    await homunculi.unpause();
  });

  const NFT_DETAILS = {
    nftId: "Branos",
    name: "Branos",
    collectionHash: "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
    tags: ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"],
    mediaType: "png",
    maxLen: 2500,
    royalties: 1000, // 10% in basis points
    tier: 1,
  }

  describe("Deployment", function () {
    it("should creator as admin", async function () {
      expect(await homunculi.admin()).to.equal(adminWallet.address);
    });
  });

  describe("Access Control", function () {
    it("should allow the admin to set a new admin", async function () {
      await homunculi.transferAdmin(otherWallet.address);
      expect(await homunculi.admin()).to.equal(otherWallet.address);
    });

    it("should not allow non-admin to set a new admin", async function () {
      await expect(
        homunculi.connect(otherWallet).transferAdmin(otherWallet.address)
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });

    it("should allow the admin to renounce admin", async function () {
      await homunculi.renounceAdmin();
      expect(await homunculi.admin()).to.equal(ethers.ZeroAddress);
    });

    it("should not allow non-admin to renounce admin", async function () {
      await expect(
        homunculi.connect(otherWallet).renounceAdmin()
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });
  });

  describe("Pausing", function () {
    it("should allow the admin to pause the contract", async function () {
      await homunculi.pause();
      expect(await homunculi.paused()).to.be.true;
    });

    it("should allow the admin to unpause the contract", async function () {
      await homunculi.pause();
      await homunculi.unpause();
      expect(await homunculi.paused()).to.be.false;
    });

    it("should not allow non-admin to pause the contract", async function () {
      await expect(
        homunculi.connect(otherWallet).pause()
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });

    it("should not allow non-admin to unpause the contract", async function () {
      await homunculi.pause();
      await expect(
        homunculi.connect(otherWallet).unpause()
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });
  });

  describe("Set NFT Details", function () {
    it("should allow the owner to set NFT details", async function () {
      await homunculi.setNftDetails(
        NFT_DETAILS.nftId,
        NFT_DETAILS.name,
        NFT_DETAILS.collectionHash,
        NFT_DETAILS.tags,
        NFT_DETAILS.mediaType,
        NFT_DETAILS.maxLen,
        NFT_DETAILS.royalties,
        NFT_DETAILS.tier
      );

      const nftDetails = await homunculi.nftDetails(NFT_DETAILS.nftId);
      expect(nftDetails.name).to.equal(NFT_DETAILS.name);
      expect(nftDetails.royalties).to.equal(NFT_DETAILS.royalties);
      expect(nftDetails.tier).to.equal(NFT_DETAILS.tier);
      expect(nftDetails.mediaType).to.equal(NFT_DETAILS.mediaType);
      expect(nftDetails.collectionHash).to.equal(NFT_DETAILS.collectionHash);

      const tags = await homunculi.getTags(NFT_DETAILS.nftId);
      expect(tags).to.deep.equal(tags);

      const idLastMintedIndex = await homunculi.idLastMintedIndex(NFT_DETAILS.nftId);
      expect(idLastMintedIndex).to.equal(0);

      const maximumSupply = await homunculi.maximumSupply(NFT_DETAILS.nftId);
      expect(maximumSupply).to.equal(NFT_DETAILS.maxLen);
    });

    it("should not allow non-admin to set NFT details", async function () {
      await expect(
        homunculi
          .connect(otherWallet)
          .setNftDetails(
            NFT_DETAILS.nftId,
            NFT_DETAILS.name,
            NFT_DETAILS.collectionHash,
            NFT_DETAILS.tags,
            NFT_DETAILS.mediaType,
            NFT_DETAILS.maxLen,
            NFT_DETAILS.royalties,
            NFT_DETAILS.tier
          )
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });

    it("should not allow setting NFT details for an existing NFT", async function () {
      await homunculi.setNftDetails(NFT_DETAILS.nftId, NFT_DETAILS.name, NFT_DETAILS.collectionHash, NFT_DETAILS.tags, NFT_DETAILS.mediaType, NFT_DETAILS.maxLen, NFT_DETAILS.royalties, NFT_DETAILS.tier);

      await expect(
        homunculi.setNftDetails(
          NFT_DETAILS.nftId,
          NFT_DETAILS.name,
          NFT_DETAILS.collectionHash,
          NFT_DETAILS.tags,
          NFT_DETAILS.mediaType,
          NFT_DETAILS.maxLen,
          NFT_DETAILS.royalties,
          NFT_DETAILS.tier
        )
      ).to.be.revertedWith("NFT details already set for this ID");
    });
  });

  describe("Update NFT Details", function () {
    const NEW_NFT_DETAILS = {
      name: "New Branos",
      collectionHash: "new collection hash",
      tags: ["tag1", "tag2"],
      mediaType: "extension",
      royalties: 0,
      tier: 2,
    }

    beforeEach(async function () {
      await homunculi.setNftDetails(
        NFT_DETAILS.nftId,
        NFT_DETAILS.name,
        NFT_DETAILS.collectionHash,
        NFT_DETAILS.tags,
        NFT_DETAILS.mediaType,
        NFT_DETAILS.maxLen,
        NFT_DETAILS.royalties,
        NFT_DETAILS.tier
      );
    });

    it("should allow updating NFT details", async function () {
      await homunculi.updateNftDetails(
        NFT_DETAILS.nftId,
        NEW_NFT_DETAILS.name,
        NEW_NFT_DETAILS.collectionHash,
        NEW_NFT_DETAILS.tags,
        NEW_NFT_DETAILS.mediaType,
        NEW_NFT_DETAILS.royalties,
        NEW_NFT_DETAILS.tier
      );

      const nftDetails = await homunculi.nftDetails(NFT_DETAILS.nftId);
      expect(nftDetails.name).to.equal(NEW_NFT_DETAILS.name);
      expect(nftDetails.royalties).to.equal(NEW_NFT_DETAILS.royalties);
      expect(nftDetails.tier).to.equal(NEW_NFT_DETAILS.tier);
      expect(nftDetails.mediaType).to.equal(NEW_NFT_DETAILS.mediaType);
      expect(nftDetails.collectionHash).to.equal(NEW_NFT_DETAILS.collectionHash);

      const tags = await homunculi.getTags(NFT_DETAILS.nftId);
      expect(tags).to.deep.equal(NEW_NFT_DETAILS.tags);

      const idLastMintedIndex = await homunculi.idLastMintedIndex(NFT_DETAILS.nftId);
      expect(idLastMintedIndex).to.equal(0);

      const maximumSupply = await homunculi.maximumSupply(NFT_DETAILS.nftId);
      expect(maximumSupply).to.equal(NFT_DETAILS.maxLen);
    });

    it("should not allow non-admin to update NFT details", async function () {
      await expect(
        homunculi
          .connect(otherWallet)
          .updateNftDetails(
            NFT_DETAILS.nftId,
            NEW_NFT_DETAILS.name,
            NEW_NFT_DETAILS.collectionHash,
            NEW_NFT_DETAILS.tags,
            NEW_NFT_DETAILS.mediaType,
            NEW_NFT_DETAILS.royalties,
            NEW_NFT_DETAILS.tier
          )
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });

    it("should not allow updating NFT details for non-existent NFT", async function () {
      await expect(
        homunculi.updateNftDetails(
          "NonExistentNFT",
          NEW_NFT_DETAILS.name,
          NEW_NFT_DETAILS.collectionHash,
          NEW_NFT_DETAILS.tags,
          NEW_NFT_DETAILS.mediaType,
          NEW_NFT_DETAILS.royalties,
          NEW_NFT_DETAILS.tier
        )
      ).to.be.revertedWith("NFT details not set for this ID");
    });
  });

  describe("Set Mint Price", function () {
    beforeEach(async function () {
      await homunculi.setNftDetails(
        NFT_DETAILS.nftId,
        NFT_DETAILS.name,
        NFT_DETAILS.collectionHash,
        NFT_DETAILS.tags,
        NFT_DETAILS.mediaType,
        NFT_DETAILS.maxLen,
        NFT_DETAILS.royalties,
        NFT_DETAILS.tier
      );
    });

    it("should allow setting mint price", async function () {
      const mintPrice = ethers.parseEther("0.25");
      await homunculi.setMintPrice(NFT_DETAILS.nftId, mintPrice);

      const price = await homunculi.mintPrice(NFT_DETAILS.nftId);
      expect(price).to.equal(mintPrice);
    });

    it("should not allow non-admin to set mint price", async function () {
      await expect(
        homunculi
          .connect(otherWallet)
          .setMintPrice(NFT_DETAILS.nftId, ethers.parseEther("0.25"))
      ).to.be.revertedWith("Access Control: sender is not Admin");
    });

    it("should not allow setting mint price for non-existent NFT", async function () {
      await expect(
        homunculi.setMintPrice("NonExistentNFT", ethers.parseEther("0.25"))
      ).to.be.revertedWith("NFT details not set for this ID");
    });
  });

  describe("Minting NFTs", function () {
    const mintPrice = ethers.parseEther("0.25");

    beforeEach(async function () {
      await homunculi.setNftDetails(
        NFT_DETAILS.nftId,
        NFT_DETAILS.name,
        NFT_DETAILS.collectionHash,
        NFT_DETAILS.tags,
        NFT_DETAILS.mediaType,
        NFT_DETAILS.maxLen,
        NFT_DETAILS.royalties,
        NFT_DETAILS.tier
      );
      await homunculi.setMintPrice(NFT_DETAILS.nftId, mintPrice);
    });

    it("should allow users to mint NFTs", async function () {
      await homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: mintPrice });

      expect(await homunculi.ownerOf(1)).to.equal(otherWallet.address);
      expect(await homunculi.totalSupply()).to.equal(1);
      expect(await homunculi.idLastMintedIndex(NFT_DETAILS.nftId)).to.equal(1);
      expect(await homunculi.experience(1)).to.equal(0);
      expect(await ethers.provider.getBalance(homunculi.address)).to.equal(mintPrice);

      const tokenUri = await homunculi.tokenURI(1);
      const decodedTokenUri = decodeTokenURIToJSON(tokenUri);

      expect(decodedTokenUri.name).to.equal(`${NFT_DETAILS.name} #1`);
      expect(decodedTokenUri.image.startsWith(`ipfs://${NFT_DETAILS.collectionHash}/${NFT_DETAILS.nftId}/`)).to.be.true;
      expect(decodedTokenUri.image.endsWith(`.${NFT_DETAILS.mediaType}`)).to.be.true;
    });

    it("should not allow non-existent NFT to be minted", async function () {
      await expect(
        homunculi.connect(otherWallet).mint("NonExistentNFT", { value: mintPrice })
      ).to.be.revertedWith("NFT details not set for this ID");
    });

    it("should not allow minting when paused", async function () {
      await homunculi.pause();
      await expect(
        homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: mintPrice })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("should not allow minting with insufficient funds", async function () {
      await expect(
        homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: ethers.parseEther("0.24") })
      ).to.be.revertedWith("Insufficient funds to mint this NFT");
    });

    it("should not allow minting with more funds than required", async function () {
      await expect(
        homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: ethers.parseEther("0.25001") })
      ).to.be.revertedWith("Insufficient funds to mint this NFT");
    });

    it("should not allow minting if mint price is not set", async function () {
      await homunculi.setMintPrice(NFT_DETAILS.nftId, 0);

      await expect(
        homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: mintPrice })
      ).to.be.revertedWith("Mint price not set for this ID");
    });

    it("should not allow minting beyond available supply", async function () {
      const newNftId = "NewNFT";
      const maxSupply = 2;
      await homunculi.setNftDetails(
        newNftId,
        NFT_DETAILS.name,
        NFT_DETAILS.collectionHash,
        NFT_DETAILS.tags,
        NFT_DETAILS.mediaType,
        maxSupply,
        NFT_DETAILS.royalties,
        NFT_DETAILS.tier
      );
      await homunculi.setMintPrice(newNftId, mintPrice);

      await homunculi.connect(otherWallet).mint(newNftId, { value: mintPrice });
      await homunculi.connect(otherWallet).mint(newNftId, { value: mintPrice });

      await expect(
        homunculi.connect(otherWallet).mint(newNftId, { value: mintPrice })
      ).to.be.revertedWith("No more NFTs available to mint for this ID");
    });

    it("should emit NFTMinted event on successful mint", async function () {
      await expect(homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: mintPrice }))
        .to.emit(homunculi, "NFTMinted")
        .withArgs(
          otherWallet.address,
          1,
          NFT_DETAILS.nftId
        );
    });

    it('should attribute consecutive names for each NFT id if they are minted in random order', async function () {
      await homunculi.setNftDetails("Glys", "Glys", NFT_DETAILS.collectionHash, NFT_DETAILS.tags, NFT_DETAILS.mediaType, NFT_DETAILS.maxLen, NFT_DETAILS.royalties, NFT_DETAILS.tier);
      await homunculi.setNftDetails("Limmex", "Limmex", NFT_DETAILS.collectionHash, NFT_DETAILS.tags, NFT_DETAILS.mediaType, NFT_DETAILS.maxLen, NFT_DETAILS.royalties, NFT_DETAILS.tier);

      await homunculi.setMintPrice("Glys", mintPrice);
      await homunculi.setMintPrice("Limmex", mintPrice);

      await homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: mintPrice });
      await homunculi.connect(otherWallet).mint("Glys", { value: mintPrice });
      await homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: mintPrice });
      await homunculi.connect(otherWallet).mint("Glys", { value: mintPrice });
      await homunculi.connect(otherWallet).mint("Limmex", { value: mintPrice });
      await homunculi.connect(otherWallet).mint("Limmex", { value: mintPrice });
      await homunculi.connect(otherWallet).mint("Glys", { value: mintPrice });

      const metadatas = await Promise.all(Array.from({ length: 7 }, (_, i) => homunculi.tokenURI(i + 1).then(decodeTokenURIToJSON)));

      const branosNftMetadatas = metadatas.filter(metadata => metadata.name.startsWith("Branos"));
      for (let i = 0; i < branosNftMetadatas.length; i++) {
        expect(branosNftMetadatas[i].name).to.equal(`Branos #${i + 1}`);
      }

      const glysNftMetadatas = metadatas.filter(metadata => metadata.name.startsWith("Glys"));
      for (let i = 0; i < glysNftMetadatas.length; i++) {
        expect(glysNftMetadatas[i].name).to.equal(`Glys #${i + 1}`);
      }

      const limmexNftMetadatas = metadatas.filter(metadata => metadata.name.startsWith("Limmex"));
      for (let i = 0; i < limmexNftMetadatas.length; i++) {
        expect(limmexNftMetadatas[i].name).to.equal(`Limmex #${i + 1}`);
      }
    });

    it.skip("should not allow minting the same asset twice", async function () {
      const nftId = "TestNFT";
      const mintPrice = ethers.parseEther("0.000001");
      const maxSupply = 50_000;

      await homunculi.setNftDetails(
        nftId,
        NFT_DETAILS.name,
        NFT_DETAILS.collectionHash,
        NFT_DETAILS.tags,
        NFT_DETAILS.mediaType,
        maxSupply,
        NFT_DETAILS.royalties,
        NFT_DETAILS.tier
      );
      await homunculi.setMintPrice(nftId, mintPrice);

      const usedAssetIds = new Set<string>();
      const batchSize = 250;
      for (let i = 0; i < maxSupply; i += batchSize) {
        const mintTransactions = await Promise.all(new Array(batchSize).fill(0).map((_, i) => homunculi.connect(otherWallet).mint(nftId, { value: mintPrice })));
        await Promise.all(mintTransactions.map(mint => mint.wait()));

        console.log(`Minted ${i + batchSize}/${maxSupply} NFTs`);

        for (let tokenId = i + 1; tokenId <= i + batchSize; tokenId++) {
          const tokenUri = await homunculi.tokenURI(tokenId);
          const decodedTokenUri = decodeTokenURIToJSON(tokenUri);

          expect(decodedTokenUri.name).to.equal(`${NFT_DETAILS.name} #${tokenId}`);

          const assetId = decodedTokenUri.image.split("/").pop().split(".")[0] as string;
          expect(usedAssetIds.has(assetId), `Asset ID ${assetId} already used`).to.be.false;

          usedAssetIds.add(assetId);
        }
      }
    }).timeout(180_000);
  });

  describe("Withdraw", function () {
    it("should allow admin to withdraw funds", async function () {
      const mintPrice = ethers.parseEther("0.25");
      await homunculi.setNftDetails(
        NFT_DETAILS.nftId,
        NFT_DETAILS.name,
        NFT_DETAILS.collectionHash,
        NFT_DETAILS.tags,
        NFT_DETAILS.mediaType,
        NFT_DETAILS.maxLen,
        NFT_DETAILS.royalties,
        NFT_DETAILS.tier
      );
      await homunculi.setMintPrice(NFT_DETAILS.nftId, mintPrice);
      await homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: mintPrice });

      const balanceBefore = await ethers.provider.getBalance(adminWallet.address);
      await homunculi.withdraw();
      const balanceAfter = await ethers.provider.getBalance(adminWallet.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
      expect(balanceAfter).to.be.closeTo(balanceBefore + mintPrice, ethers.parseEther("0.0001"));
    });
  });

  describe("Updating homunculi experience", function () {
    const mintPrice = ethers.parseEther("0.25");

    beforeEach(async function () {
      await homunculi.setNftDetails(
        NFT_DETAILS.nftId,
        NFT_DETAILS.name,
        NFT_DETAILS.collectionHash,
        NFT_DETAILS.tags,
        NFT_DETAILS.mediaType,
        NFT_DETAILS.maxLen,
        NFT_DETAILS.royalties,
        NFT_DETAILS.tier
      );
      await homunculi.setMintPrice(NFT_DETAILS.nftId, mintPrice);

      await homunculi.connect(otherWallet).mint(NFT_DETAILS.nftId, { value: mintPrice });

      await homunculi.setSignerAddress(adminWallet.address);
    });

    it("should allow NFT owner to update experience", async function () {
      const timestamp = await getCurrentBlockTimestamp();
      const data = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, data);

      await homunculi.connect(otherWallet).updateExperience(1, 30, timestamp, signature);

      const experience = await homunculi.experience(1);
      expect(experience).to.equal(30);
    });

    it("should emit ExperienceUpdated event on successful update", async function () {
      const timestamp = await getCurrentBlockTimestamp();
      const data = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, data);

      await expect(homunculi.connect(otherWallet).updateExperience(1, 30, timestamp, signature))
        .to.emit(homunculi, "ExperienceUpdated")
        .withArgs(
          1,
          0,
          30
        );
    });

    it("should not allow updating experience of a non-existent token", async function () {
      const timestamp = await getCurrentBlockTimestamp();
      const data = {
        tokenId: 2,
        newExperience: 30,
        timestamp,
      };
      const signature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, data);

      await expect(
        homunculi.connect(otherWallet).updateExperience(2, 30, timestamp, signature)
      ).to.be.revertedWith("Token does not exist");
    });

    it("should not allow non-owner to update experience", async function () {
      const timestamp = await getCurrentBlockTimestamp();
      const data = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, data);

      await expect(
        homunculi.connect(adminWallet).updateExperience(1, 30, timestamp, signature)
      ).to.be.revertedWith("Not the owner of this token");
    });

    it("should not allow updating experience if the signer address is not set", async function () {
      await homunculi.setSignerAddress(ethers.ZeroAddress);

      const timestamp = await getCurrentBlockTimestamp();
      const data = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, data);

      await expect(
        homunculi.connect(otherWallet).updateExperience(1, 30, timestamp, signature)
      ).to.be.revertedWith("Signer address not set");
    });

    it("should not allow updating experience if the timestamp is in the past", async function () {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const timestamp = currentBlockTimestamp - 25;
      const data = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, data);

      await expect(
        homunculi.connect(otherWallet).updateExperience(1, 30, timestamp, signature)
      ).to.be.revertedWith("Invalid timestamp");
    });

    it("should not allow updating experience if the timestamp is in the future", async function () {
      const currentBlockTimestamp = await getCurrentBlockTimestamp();

      const timestamp = currentBlockTimestamp + 85;
      const data = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, data);

      await expect(
        homunculi.connect(otherWallet).updateExperience(1, 30, timestamp, signature)
      ).to.be.revertedWith("Signature expired");
    });

    it("should not allow updating experience with a lower value", async function () {
      const timestamp = await getCurrentBlockTimestamp();

      const oldSignature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      });
      await homunculi.connect(otherWallet).updateExperience(1, 30, timestamp, oldSignature);

      const data = {
        tokenId: 1,
        newExperience: 10,
        timestamp,
      };
      const newSignature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, data);

      await expect(
        homunculi.connect(otherWallet).updateExperience(1, 10, timestamp, newSignature)
      ).to.be.revertedWith("New experience is not greater than old experience");
    });

    it("should not allow updating experience with an invalid signature", async function () {
      const timestamp = await getCurrentBlockTimestamp();
      const data = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await signUpdateExperienceData(otherWallet, chainId, homunculi.address, data);

      await expect(
        homunculi.connect(otherWallet).updateExperience(1, 30, timestamp, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should not allow updating experience with different data", async function () {
      const timestamp = await getCurrentBlockTimestamp();
      const data = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await signUpdateExperienceData(adminWallet, chainId, homunculi.address, data);

      await expect(
        homunculi.connect(otherWallet).updateExperience(1, 10, timestamp, signature)
      ).to.be.revertedWith("Invalid signature");
    });
  });
});
