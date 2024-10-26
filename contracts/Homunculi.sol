// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Homunculi is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
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
    mapping(string => mapping(uint256 => uint256)) private _tokenMatrix;
    mapping(string => uint256) public mintPrice;
    mapping(uint256 => uint256) public experience;

    address private signerAddress;
    bytes32 private constant EXPERIENCE_TYPEHASH =
        keccak256(
            "Experience(uint256 tokenId,uint256 newExperience,uint256 timestamp)"
        );
    bytes32 private DOMAIN_SEPARATOR;

    event NFTMinted(address indexed to, uint256 tokenId, string id);
    event ExperienceUpdated(uint256 tokenId, uint256 newExperience);

    function initialize() public initializer {
        __ERC721_init("MPHomunculi", "MPHOM");
        __Ownable_init(msg.sender);

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("MPHomunculi")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
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

    function mint(string memory id) public payable whenNotPaused {
        require(
            bytes(nftDetails[id].name).length > 0,
            "ID does not exist in the contract"
        );
        require(
            idLastMintedIndex[id] < availableAssetsIds[id],
            "No more NFTs available to mint for this ID"
        );
        require(mintPrice[id] > 0, "Mint price not set for this ID");
        require(
            msg.value == mintPrice[id],
            "Insufficient funds to mint this NFT"
        );

        uint256 remaining = availableAssetsIds[id] - idLastMintedIndex[id];
        uint256 randomIndex = _getRandomNumber(remaining) + 1; // Adjusted to start from 1
        uint256 assetIndex = _getAssetIndex(id, randomIndex);

        // Update the token matrix
        _tokenMatrix[id][randomIndex] = _getAssetIndex(id, remaining - 1);

        uint256 tokenId = totalSupply() + 1;
        _safeMint(msg.sender, tokenId);

        string memory tokenUri = string(
            abi.encodePacked(
                "https://ipfs.io/ipfs/",
                collectionHash[id],
                "/",
                id,
                "/",
                Strings.toString(assetIndex),
                ".",
                mediaType[id]
            )
        );

        _setTokenURI(tokenId, tokenUri);

        experience[tokenId] = 0;

        idLastMintedIndex[id]++;

        emit NFTMinted(msg.sender, tokenId, id);
    }

    function _getRandomNumber(uint256 upper) private view returns (uint256) {
        // WARNING: This is not secure randomness
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        block.prevrandao,
                        msg.sender
                    )
                )
            ) % upper;
    }

    function _getAssetIndex(
        string memory id,
        uint256 index
    ) private view returns (uint256) {
        if (_tokenMatrix[id][index] != 0) {
            return _tokenMatrix[id][index];
        } else {
            return index;
        }
    }

    function getTags(string memory id) public view returns (string[] memory) {
        return tags[id];
    }

    function updateExperience(
        uint256 tokenId,
        uint256 newExperience,
        uint256 timestamp,
        bytes memory signature
    ) public {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(signerAddress != address(0), "Signer address not set");
        require(block.timestamp <= timestamp - 10, "Invalid timestamp");
        require(block.timestamp <= timestamp + 80, "Signature expired");

        bytes32 structHash = keccak256(
            abi.encode(EXPERIENCE_TYPEHASH, tokenId, newExperience, timestamp)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address recoveredAddress = ECDSA.recover(digest, signature);

        require(recoveredAddress == signerAddress, "Invalid signature");

        experience[tokenId] = newExperience;

        emit ExperienceUpdated(tokenId, newExperience);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setMintPrice(string memory id, uint256 price) public onlyOwner {
        mintPrice[id] = price;
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function setSignerAddress(address _signerAddress) public onlyOwner {
        signerAddress = _signerAddress;
    }

    // Overrides required by Solidity
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable,
            ERC721URIStorageUpgradeable
        )
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

    function _increaseBalance(
        address account,
        uint128 value
    )
        internal
        virtual
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, value);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        virtual
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
}
