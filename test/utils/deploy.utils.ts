const { ethers, upgrades } = require("hardhat");
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

export const deployContract = async (wallet: SignerWithAddress, name: string, params = []) => {
  const contract = await ethers.deployContract(name, params, wallet);

  // Hacky way to update the property on the contract - should remove and replace with target in the end
  contract["address"] = contract.target;
  return contract;
}

export const deployUpgradableContract = async (wallet: SignerWithAddress, name: string, params: any[] = []) => {
  let factory = (await ethers.getContractFactory(name)).connect(wallet);
  let contract = await upgrades.deployProxy(factory, params, { kind: "transparent" });

  await contract.waitForDeployment();

  // Hacky way to update the property on the contract - should remove and replace with target in the end
  contract["address"] = contract.target;
  return contract;
}

export const upgradeContract = async (wallet: SignerWithAddress, proxyAddress, name: string, params = []) => {
  let factory = (await ethers.getContractFactory(name)).connect(wallet);

  const upgraded = await upgrades.upgradeProxy(proxyAddress, factory, {
    call: {
      fn: "initializeV2",
      args: params, // Pass the new variable value for initialization
    },
  });

  upgraded["address"] = upgraded.target;
  return upgraded;
}
