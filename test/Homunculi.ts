import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Homunculi, Homunculi__factory, HomunculiV2, HomunculiV2__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Homunculi Contract", function () {
  let homunculi: Homunculi;
  let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress;

  beforeEach(async function () {
    const HomunculiFactory = (await ethers.getContractFactory("Homunculi")) as Homunculi__factory;
    [owner, addr1, addr2] = await ethers.getSigners();

    homunculi = await upgrades.deployProxy(HomunculiFactory, [], { initializer: "initialize" }) as any as Homunculi;
    await homunculi.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await homunculi.owner()).to.equal(owner.address);
    });
  });

  describe("Set NFT Details", function () {
    it("Should allow the owner to set NFT details", async function () {
      const nftId = "Branos";
      const name = "Branos";
      const collectionHash = "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4";
      const tags = ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"];
      const mediaType = "png";
      const maxLen = 2500;
      const royalties = 1000; // 10% in basis points
      const tier = 1;

      await homunculi.setNftDetails(
        nftId,
        name,
        collectionHash,
        tags,
        mediaType,
        maxLen,
        royalties,
        tier
      );

      const nftDetails = await homunculi.nftDetails(nftId);
      expect(nftDetails.name).to.equal(name);
      expect(nftDetails.royalties).to.equal(royalties);

      const nftTier = await homunculi.nftTier(nftId);
      expect(nftTier).to.equal(tier);

      const idLastMintedIndex = await homunculi.idLastMintedIndex(nftId);
      expect(idLastMintedIndex).to.equal(0);

      const nftTags = await homunculi.getTags(nftId);
      expect(nftTags).to.deep.equal(tags);

      const nftMediaType = await homunculi.mediaType(nftId);
      expect(nftMediaType).to.equal(mediaType);

      const availableAssetsIds = await homunculi.availableAssetsIds(nftId);
      expect(availableAssetsIds).to.equal(maxLen);

      const collectionHashStored = await homunculi.collectionHash(nftId);
      expect(collectionHashStored).to.equal(collectionHash);
    });

    it("Should not allow non-owner to set NFT details", async function () {
      await expect(
        homunculi
          .connect(addr1)
          .setNftDetails(
            "nft",
            "NFT",
            "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
            ["item"],
            "png",
            2500,
            1000,
            2
          )
      ).to.be.revertedWithCustomError(homunculi, "OwnableUnauthorizedAccount");
    });
  });

  describe("Minting NFTs", function () {
    const nftId = "Branos";

    beforeEach(async function () {
      // Set up an NFT with tier 1
      await homunculi.setNftDetails(
        nftId,
        "Branos",
        "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
        ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"],
        "png",
        2, // maxLen
        500,
        1 // tier
      );
    });

    it("Should allow users to mint tier 1 NFTs", async function () {
      await homunculi.connect(addr1).mint(nftId);

      // Calculate the expected tokenId
      const index = 0;
      const tokenId = BigInt(ethers.solidityPackedKeccak256(["string", "uint256"], [nftId, index]));

      // Verify ownership
      expect(await homunculi.ownerOf(tokenId)).to.equal(addr1.address);

      // Verify token URI
      const expectedTokenUri = "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4/Branos/0.png";
      expect(await homunculi.tokenURI(tokenId)).to.equal(expectedTokenUri);
    });

    it("Should not allow minting beyond available supply", async function () {
      // Mint the maximum number of NFTs
      await homunculi.connect(addr1).mint(nftId);
      await homunculi.connect(addr2).mint(nftId);

      // Attempt to mint beyond the limit
      await expect(
        homunculi.connect(addr1).mint(nftId)
      ).to.be.revertedWith("No more NFTs available to mint for this ID");
    });

    it("Should emit NFTMinted event on successful mint", async function () {
      await expect(homunculi.connect(addr1).mint(nftId))
        .to.emit(homunculi, "NFTMinted")
        .withArgs(
          addr1.address,
          ethers.solidityPackedKeccak256(["string", "uint256"], [nftId, 0]),
          nftId
        );
    });

    it("Should not allow minting when paused", async function () {
      await homunculi.pause();
      await expect(
        homunculi.connect(addr1).mint(nftId)
      ).to.be.revertedWithCustomError(homunculi, "EnforcedPause");
    });
  });

  describe("Upgrading the contract", function () {
    it("Should upgrade the contract", async function () {
      const homunculiAddress = await homunculi.getAddress();

      const HomunculiV2Factory = (await ethers.getContractFactory("HomunculiV2")) as HomunculiV2__factory;
      await upgrades.upgradeProxy(homunculiAddress, HomunculiV2Factory);

      const homunculiV2 = HomunculiV2Factory.attach(homunculiAddress) as HomunculiV2;
      expect(await homunculiV2.owner()).to.equal(owner.address);
    });

    it("Should not allow non-owner to upgrade the contract", async function () {
      const homunculiAddress = await homunculi.getAddress();

      const HomunculiV2Factory = (await ethers.getContractFactory("HomunculiV2")) as HomunculiV2__factory;

      await expect(
        upgrades.upgradeProxy(homunculiAddress, HomunculiV2Factory.connect(addr1))
      ).to.be.revertedWithCustomError(homunculi, "OwnableUnauthorizedAccount");
    });
  });
});
