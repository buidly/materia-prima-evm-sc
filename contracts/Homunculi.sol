// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MPResources is ERC721, Ownable, Pausable {
    constructor() ERC721("MPHomunculi", "MPHOM") Ownable(msg.sender) {}

    modifier canMint() {
        // TODO
        _;
    }

    function mint(address to, uint256 tokenId) public canMint {
        _mint(to, tokenId);
    }
}
