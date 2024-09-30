// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract Homunculi is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable
{
    struct NftDetails {
        string name;
        uint64 royalties;
    }

    mapping(string => NftDetails) public nftDetails;
    mapping(string => uint64) public nftTier;
    mapping(string => uint256) public idLastMintedIndex;
    mapping(string => string[]) public tags;
    mapping(string => string) public mediaType;
    mapping(string => uint256) public availableAssetsIds;
    mapping(string => string) public collectionHash;

    event NFTMinted(address indexed to, uint256 tokenId, string id);

    function initialize() public initializer {
        __ERC721_init("MPHomunculi", "MPHOM");
        __Ownable_init(msg.sender);
    }

    function setNftDetails(
        string memory id,
        string memory name,
        string memory _collectionHash,
        string[] memory _tags,
        string memory _mediaType,
        uint256 maxLen,
        uint64 royalties,
        uint64 tier
    ) public onlyOwner {
        nftDetails[id] = NftDetails({name: name, royalties: royalties});
        nftTier[id] = tier;
        idLastMintedIndex[id] = 0;
        tags[id] = _tags;
        mediaType[id] = _mediaType;
        availableAssetsIds[id] = maxLen;
        collectionHash[id] = _collectionHash;
    }

    function mint(string memory id) public whenNotPaused {
        require(
            idLastMintedIndex[id] < availableAssetsIds[id],
            "No more NFTs available to mint for this ID"
        );

        uint256 index = idLastMintedIndex[id];
        uint256 tokenId = _generateTokenId(id, index);

        _safeMint(msg.sender, tokenId);

        string memory tokenUri = string(
            abi.encodePacked(
                collectionHash[id],
                "/",
                id,
                "/",
                Strings.toString(index),
                ".",
                mediaType[id]
            )
        );

        _setTokenURI(tokenId, tokenUri);

        idLastMintedIndex[id]++;

        emit NFTMinted(msg.sender, tokenId, id);
    }

    function _generateTokenId(
        string memory id,
        uint256 index
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(id, index)));
    }

    function getTags(string memory id) public view returns (string[] memory) {
        return tags[id];
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // Overrides required by Solidity
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
