import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

export const getCurrentBlockTimestamp = async (): Promise<number> => {
  const latestBlock = await ethers.provider.getBlock('latest');
  return latestBlock!.timestamp;
};

export const signUpdateExperienceData = async (signer: SignerWithAddress, chainId: bigint, verifyingContract: string, data: any): Promise<string> => {
  const domain = {
    name: "MPHomunculi",
    version: "1",
    chainId,
    verifyingContract,
  };

  const types = {
    Experience: [
      { name: "tokenId", type: "uint256" },
      { name: "newExperience", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
  };

  const signature = await signer.signTypedData(domain, types, data);
  return signature;
};

export const decodeTokenURIToJSON = (tokenURI: string): any => {
  const encodedData = tokenURI.split("data:application/json;base64,")[1];
  const decodedData = Buffer.from(encodedData, "base64").toString();
  return JSON.parse(decodedData);
}