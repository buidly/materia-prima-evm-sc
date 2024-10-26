import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Homunculi, Homunculi__factory, HomunculiV2, HomunculiV2__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Homunculi Contract", function () {
  let chainId: bigint;
  let homunculi: Homunculi; let homunculiAddress: string;
  let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress;

  beforeEach(async function () {
    const HomunculiFactory = (await ethers.getContractFactory("Homunculi")) as Homunculi__factory;
    [owner, addr1, addr2] = await ethers.getSigners();

    homunculi = await upgrades.deployProxy(HomunculiFactory, [], { initializer: "initialize" }) as any as Homunculi;
    await homunculi.waitForDeployment();
    homunculiAddress = await homunculi.getAddress();

    chainId = (await ethers.provider.getNetwork()).chainId;
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
    const nftPrice = ethers.parseEther("0.1");

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

      await homunculi.setMintPrice(nftId, nftPrice);
    });

    it("Should allow users to mint tier 1 NFTs", async function () {
      await homunculi.connect(addr1).mint(nftId, { value: nftPrice });

      const tokenId = 1;

      // Verify ownership
      expect(await homunculi.ownerOf(tokenId)).to.equal(addr1.address);

      // Verify token URI
      const expectedTokenUriStart = "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4/Branos/";
      expect(await homunculi.tokenURI(tokenId)).to.be.a("string").and.satisfy((uri: string) => uri.includes(expectedTokenUriStart));
    });

    it("Should not allow minting beyond available supply", async function () {
      // Mint the maximum number of NFTs
      await homunculi.connect(addr1).mint(nftId, { value: nftPrice });
      await homunculi.connect(addr2).mint(nftId, { value: nftPrice });

      // Attempt to mint beyond the limit
      await expect(
        homunculi.connect(addr1).mint(nftId)
      ).to.be.revertedWith("No more NFTs available to mint for this ID");
    });

    it("Should not allow minting when the price is not set", async function () {
      await homunculi.setMintPrice(nftId, 0);

      await expect(
        homunculi.connect(addr1).mint(nftId)
      ).to.be.revertedWith("Mint price not set for this ID");
    });

    it("Should not allow minting with insufficient funds", async function () {
      await expect(
        homunculi.connect(addr1).mint(nftId, { value: ethers.parseEther("0.09") })
      ).to.be.revertedWith("Insufficient funds to mint this NFT");
    });

    it("Should not allow minting with more funds than required", async function () {
      await expect(
        homunculi.connect(addr1).mint(nftId, { value: ethers.parseEther("0.10001") })
      ).to.be.revertedWith("Insufficient funds to mint this NFT");
    });

    it("Should emit NFTMinted event on successful mint", async function () {
      await expect(homunculi.connect(addr1).mint(nftId, { value: nftPrice }))
        .to.emit(homunculi, "NFTMinted")
        .withArgs(
          addr1.address,
          1,
          nftId
        );
    });

    it("Should not allow minting when paused", async function () {
      await homunculi.pause();
      await expect(
        homunculi.connect(addr1).mint(nftId)
      ).to.be.revertedWithCustomError(homunculi, "EnforcedPause");
    });

    // it("Should")
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

  describe("Updating homunculi experience", function () {
    let domain: any;
    const types = {
      Experience: [
        { name: "tokenId", type: "uint256" },
        { name: "newExperience", type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
    };

    beforeEach(async function () {
      domain = {
        name: "MPHomunculi",
        version: "1",
        chainId,
        verifyingContract: homunculiAddress,
      };

      await homunculi.setNftDetails(
        "Branos",
        "Branos",
        "bafybeiavfuy6wbhqwxgcl2sfdogtj7lxdeh7wtbectepcwwvkocusbvnx4",
        ["MateriaPrima", "Homunculi", "Branos", "Laboratory", "Alchemist", "Arena"],
        "png",
        2, // maxLen
        500,
        1 // tier
      );

      await homunculi.setMintPrice("Branos", ethers.parseEther("0.1"));

      await homunculi.connect(addr1).mint("Branos", { value: ethers.parseEther("0.1") });

      await homunculi.setSignerAddress(owner.address);
    });

    it("Should not allow non-owner to update experience", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      const value = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await addr1.signTypedData(domain, types, value);

      await expect(
        homunculi.connect(addr1).updateExperience(1, 30, timestamp, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should allow owner to update experience", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      const value = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await owner.signTypedData(domain, types, value);

      await homunculi.updateExperience(1, 30, timestamp, signature);

      const experience = await homunculi.experience(1);
      expect(experience).to.equal(30);
    });

    it("Should not allow updating experience for non-existent token", async function () {
      const timestamp = Math.floor(Date.now() / 1000);
      const value = {
        tokenId: 2,
        newExperience: 30,
        timestamp,
      };
      const signature = await owner.signTypedData(domain, types, value);

      await expect(
        homunculi.updateExperience(2, 30, timestamp, signature)
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should not allow updating experience with an expired signature", async function () {
      const timestamp = Math.floor(Date.now() / 1000) - 1000;
      const value = {
        tokenId: 1,
        newExperience: 30,
        timestamp,
      };
      const signature = await owner.signTypedData(domain, types, value);

      await expect(
        homunculi.updateExperience(1, 30, timestamp, signature)
      ).to.be.revertedWith("Signature expired");
    });
  });
});
