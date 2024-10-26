// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./lib/Pausable.sol";

contract Homunculi is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    Pausable
{
    /*========================= STRUCTS =========================*/
    struct NftDetails {
        string name;
        uint64 royalties;
        uint64 tier;
        string mediaType;
        string collectionHash;
        string[] tags;
    }

    /*========================= CONTRACT STATE =========================*/
    bytes32 private constant EXPERIENCE_TYPEHASH =
        keccak256(
            "Experience(uint256 tokenId,uint256 newExperience,uint256 timestamp)"
        );
    address private signerAddress;
    bytes32 private DOMAIN_SEPARATOR;

    // Reserved storage slots for future upgrades
    uint256[10] private __gap;

    mapping(string => NftDetails) public nftDetails;
    mapping(string => uint256) public idLastMintedIndex;
    mapping(string => uint256) public maximumSupply;
    mapping(string => uint256) public mintPrice;
    mapping(string => mapping(uint256 => uint256)) private _availableAssets;
    // mapping(uint256 => uint256) public experience;

    /*============================ EVENTS ============================*/
    event NFTMinted(address indexed to, uint256 tokenId, string id);
    event ExperienceUpdated(
        uint256 tokenId,
        uint256 oldExperience,
        uint256 newExperience
    );

    /*========================= PUBLIC API ===========================*/

    function initialize() public initializer {
        __ERC721_init("MPHomunculi", "MPHOM");
        __Pausable_init();
        __Homunculi__init_unchained();
    }

    function __Homunculi__init_unchained() internal onlyInitializing {
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

    function setNftDetails(
        string memory id,
        string memory name,
        string memory collectionHash,
        string[] memory tags,
        string memory mediaType,
        uint256 maxLen,
        uint64 royalties,
        uint64 tier
    ) public onlyAdmin {
        require(
            bytes(nftDetails[id].name).length == 0,
            "NFT details already set for this ID"
        );

        nftDetails[id] = NftDetails({
            name: name,
            royalties: royalties,
            tier: tier,
            mediaType: mediaType,
            collectionHash: collectionHash,
            tags: tags
        });
        idLastMintedIndex[id] = 0;
        maximumSupply[id] = maxLen;
    }

    function updateNftDetails(
        string memory id,
        string memory name,
        string memory collectionHash,
        string[] memory tags,
        string memory mediaType,
        uint64 royalties,
        uint64 tier
    ) public onlyAdmin {
        require(
            bytes(nftDetails[id].name).length > 0,
            "NFT details not set for this ID"
        );

        nftDetails[id] = NftDetails({
            name: name,
            royalties: royalties,
            tier: tier,
            mediaType: mediaType,
            collectionHash: collectionHash,
            tags: tags
        });
    }

    function getTags(string memory id) public view returns (string[] memory) {
        return nftDetails[id].tags;
    }

    function setMintPrice(string memory id, uint256 price) public onlyAdmin {
        require(
            bytes(nftDetails[id].name).length > 0,
            "NFT details not set for this ID"
        );
        mintPrice[id] = price;
    }

    function mint(string memory id) public payable whenNotPaused {
        require(
            bytes(nftDetails[id].name).length > 0,
            "NFT details not set for this ID"
        );
        require(
            idLastMintedIndex[id] < maximumSupply[id],
            "No more NFTs available to mint for this ID"
        );
        require(mintPrice[id] > 0, "Mint price not set for this ID");
        require(
            msg.value == mintPrice[id],
            "Insufficient funds to mint this NFT"
        );

        uint256 assetIndex = _useRandomAvailableAsset(id);
        uint256 tokenId = totalSupply() + 1;
        _safeMint(msg.sender, tokenId);

        // TODO set token uri
        string memory tokenUri = string(
            abi.encodePacked(
                "https://ipfs.io/ipfs/",
                nftDetails[id].collectionHash,
                "/",
                id,
                "/",
                Strings.toString(assetIndex),
                ".",
                nftDetails[id].mediaType
            )
        );

        _setTokenURI(tokenId, tokenUri);

        // experience[tokenId] = 0;
        idLastMintedIndex[id]++;

        emit NFTMinted(msg.sender, tokenId, id);
    }

    // TODO: test after mint
    function withdraw() public onlyAdmin {
        payable(admin()).transfer(address(this).balance);
    }

    /*========================= PRIVATE API =========================*/

    /**
     * @dev See {ERC721-_beforeTokenTransfer}.
     */
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

    /**
     * @dev See {ERC721-_beforeTokenTransfer}.
     */
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

    function _useRandomAvailableAsset(
        string memory id
    ) internal returns (uint256) {
        uint256 randomNum = uint256(
            keccak256(
                abi.encode(
                    msg.sender,
                    tx.gasprice,
                    block.number,
                    block.timestamp,
                    blockhash(block.number - 1),
                    id
                )
            )
        );
        uint256 numAvailableTokens = maximumSupply[id] - idLastMintedIndex[id];
        uint256 randomIndex = randomNum % numAvailableTokens;

        return _useAvailableTokenAtIndex(id, randomIndex, numAvailableTokens);
    }

    function _useAvailableTokenAtIndex(
        string memory id,
        uint256 indexToUse,
        uint256 numAvailableTokens
    ) internal returns (uint256) {
        uint256 valAtIndex = _availableAssets[id][indexToUse];
        uint256 result;
        if (valAtIndex == 0) {
            // This means the index itself is still an available token
            result = indexToUse;
        } else {
            // This means the index itself is not an available token, but the val at that index is.
            result = valAtIndex;
        }

        uint256 lastIndex = numAvailableTokens - 1;
        if (indexToUse != lastIndex) {
            // Replace the value at indexToUse, now that it's been used.
            // Replace it with the data from the last index in the array, since we are going to decrease the array size afterwards.
            uint256 lastValInArray = _availableAssets[id][lastIndex];
            if (lastValInArray == 0) {
                // This means the index itself is still an available token
                _availableAssets[id][indexToUse] = lastIndex;
            } else {
                // This means the index itself is not an available token, but the val at that index is.
                _availableAssets[id][indexToUse] = lastValInArray;
            }
        }
        return result;
    }

    // function updateExperience(
    //     uint256 tokenId,
    //     uint256 newExperience,
    //     uint256 timestamp,
    //     bytes memory signature
    // ) public {
    //     require(_ownerOf(tokenId) != address(0), "Token does not exist");
    //     require(signerAddress != address(0), "Signer address not set");
    //     require(block.timestamp <= timestamp - 10, "Invalid timestamp");
    //     require(block.timestamp <= timestamp + 80, "Signature expired");

    //     bytes32 structHash = keccak256(
    //         abi.encode(EXPERIENCE_TYPEHASH, tokenId, newExperience, timestamp)
    //     );
    //     bytes32 digest = keccak256(
    //         abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
    //     );

    //     address recoveredAddress = ECDSA.recover(digest, signature);

    //     require(recoveredAddress == signerAddress, "Invalid signature");

    //     experience[tokenId] = newExperience;

    //     emit ExperienceUpdated(tokenId, newExperience);
    // }

    // function setSignerAddress(address _signerAddress) public onlyAdmin {
    //     signerAddress = _signerAddress;
    // }
}
