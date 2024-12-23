// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./lib/Pausable.sol";
import "hardhat/console.sol";

contract GatherRun is Initializable, Pausable {
    /*========================= STRUCTS =========================*/

    struct Drop {
        string resourceType;
        uint256 resourceAmount;
        uint16 minProbability;
        uint16 maxProbability;
    }

    struct LockedHomunculus {
        uint256 runId;
        address owner;
        uint256 unlockTime;
        bool withdrawn;
    }

    struct LockedNFT {
        address nftAddress;
        uint256 tokenId;
    }

    /*========================= CONTRACT STATE =========================*/

    uint256 public nextRunId;

    // Reserved storage slots for future upgrades
    uint256[10] private __gap;

    mapping(uint256 => uint256) public durations;
    mapping(uint256 => Drop[]) public drops;
    mapping(address => bool) public acceptedNftAddresses;
    mapping(address => mapping(uint256 => LockedHomunculus))
        public lockedHomunculi;
    mapping(address => LockedNFT[]) public userLockedNFTs;

    /*============================ EVENTS ============================*/

    event RunCreated(uint256 runId, uint256 duration, Drop[] drops);
    event RunUpdated(uint256 runId, uint256 duration, Drop[] drops);
    event ExpeditionStarted(
        uint256 runId,
        address nftAddress,
        uint256 tokenId,
        uint256 unlockTime
    );
    event ExpeditionEnded(
        address owner,
        address nftAddress,
        uint256 tokenId,
        string resourceType,
        uint256 resourceAmount
    );

    /*========================= PUBLIC API ===========================*/

    function initialize() public initializer {
        __Pausable_init();
        __GatherRun__init_unchained();
    }

    function __GatherRun__init_unchained() internal onlyInitializing {
        nextRunId = 1;
    }

    function createRun(
        uint256 duration,
        Drop[] memory _drops
    ) public onlyAdmin {
        _checkDropProbabilities(_drops);

        durations[nextRunId] = duration;

        Drop[] storage dropArray = drops[nextRunId];
        for (uint256 i = 0; i < _drops.length; i++) {
            dropArray.push(_drops[i]);
        }

        nextRunId++;

        emit RunCreated(nextRunId - 1, duration, _drops);
    }

    function updateRun(
        uint256 runId,
        uint256 duration,
        Drop[] memory _drops
    ) public onlyAdmin {
        require(runId < nextRunId, "Run does not exist");

        _checkDropProbabilities(_drops);

        durations[runId] = duration;

        delete drops[runId];
        Drop[] storage dropArray = drops[runId];
        for (uint256 i = 0; i < _drops.length; i++) {
            dropArray.push(_drops[i]);
        }

        emit RunUpdated(runId, duration, _drops);
    }

    function getDrops(uint256 runId) public view returns (Drop[] memory) {
        return drops[runId];
    }

    function acceptNftAddress(address nftAddress) public onlyAdmin {
        acceptedNftAddresses[nftAddress] = true;
    }

    function removeNftAddress(address nftAddress) public onlyAdmin {
        delete acceptedNftAddresses[nftAddress];
    }

    function startExpedition(
        uint256 _runId,
        address _nftAddress,
        uint256 _tokenId
    ) public whenNotPaused {
        require(_runId < nextRunId, "Run does not exist");
        require(
            acceptedNftAddresses[_nftAddress],
            "NFT address not accepted for GatherRun"
        );

        IERC721 nftContract = IERC721(_nftAddress);
        require(
            nftContract.ownerOf(_tokenId) == msg.sender,
            "Sender does not own the NFT"
        );

        nftContract.transferFrom(msg.sender, address(this), _tokenId);

        uint256 unlockTime = block.timestamp + durations[_runId];
        lockedHomunculi[_nftAddress][_tokenId] = LockedHomunculus({
            runId: _runId,
            owner: msg.sender,
            unlockTime: unlockTime,
            withdrawn: false
        });

        userLockedNFTs[msg.sender].push(
            LockedNFT({nftAddress: _nftAddress, tokenId: _tokenId})
        );

        emit ExpeditionStarted(_runId, _nftAddress, _tokenId, unlockTime);
    }

    function getLockedHomunculi(
        address _nftAddress,
        uint256 _tokenId
    ) external view returns (LockedHomunculus memory) {
        return lockedHomunculi[_nftAddress][_tokenId];
    }

    function getUserLockedHomunculi(
        address _user
    ) external view returns (LockedNFT[] memory, LockedHomunculus[] memory) {
        LockedNFT[] memory userNFTs = userLockedNFTs[_user];
        LockedHomunculus[] memory lockedHomunculiArray = new LockedHomunculus[](
            userNFTs.length
        );
        for (uint256 i = 0; i < userNFTs.length; i++) {
            lockedHomunculiArray[i] = lockedHomunculi[userNFTs[i].nftAddress][
                userNFTs[i].tokenId
            ];
        }
        return (userNFTs, lockedHomunculiArray);
    }

    function endExpedition(
        address _nftAddress,
        uint256 _tokenId
    ) public whenNotPaused {
        LockedHomunculus storage lockedHomunculus = lockedHomunculi[
            _nftAddress
        ][_tokenId];

        require(
            lockedHomunculus.owner == msg.sender,
            "Sender does not own the NFT"
        );
        require(
            lockedHomunculus.unlockTime <= block.timestamp,
            "Homunculus is still locked"
        );

        lockedHomunculus.withdrawn = true;

        IERC721 nftContract = IERC721(_nftAddress);
        nftContract.transferFrom(address(this), msg.sender, _tokenId);

        _removeLockedNFTFromUserList(msg.sender, _nftAddress, _tokenId);

        uint256 randomNumber = _getRandomProbability();
        Drop memory reward = _getDropByProbability(
            lockedHomunculus.runId,
            randomNumber
        );

        emit ExpeditionEnded(
            msg.sender,
            _nftAddress,
            _tokenId,
            reward.resourceType,
            reward.resourceAmount
        );
    }

    /*========================= PRIVATE API =========================*/

    function _checkDropProbabilities(Drop[] memory _drops) internal pure {
        require(_drops.length > 0, "No drops provided");

        uint256 minProbability = 10000;
        uint256 maxProbability = 0;
        uint16 expectedMinProbability = 0;

        for (uint256 i = 0; i < _drops.length; i++) {
            uint16 minProb = _drops[i].minProbability;
            uint16 maxProb = _drops[i].maxProbability;

            require(
                minProb <= maxProb,
                "minProbability cannot be greater than maxProbability"
            );
            require(
                minProb >= 0 && minProb <= 10000,
                "minProbability must be between 0 and 10000"
            );
            require(
                maxProb >= 0 && maxProb <= 10000,
                "maxProbability must be between 0 and 10000"
            );
            require(
                minProb > 0 || maxProb > 0,
                "Drop probabilities cannot both be zero"
            );
            require(
                minProb == expectedMinProbability,
                "Probability ranges must be sequential"
            );

            minProbability = minProbability < minProb
                ? minProbability
                : minProb;
            maxProbability = maxProbability > maxProb
                ? maxProbability
                : maxProb;

            expectedMinProbability = maxProb;
        }

        require(minProbability == 0, "First drop probability must be zero");
        require(maxProbability >= 10000, "Last drop probability must be 10000");
    }

    function _removeLockedNFTFromUserList(
        address _user,
        address _nftAddress,
        uint256 _tokenId
    ) internal {
        LockedNFT[] storage nftList = userLockedNFTs[_user];
        for (uint256 i = 0; i < nftList.length; i++) {
            if (
                nftList[i].nftAddress == _nftAddress &&
                nftList[i].tokenId == _tokenId
            ) {
                nftList[i] = nftList[nftList.length - 1];
                nftList.pop();
                break;
            }
        }
    }

    function _getDropByProbability(
        uint256 _runId,
        uint256 probability
    ) private view returns (Drop memory) {
        Drop[] memory runDrops = drops[_runId];
        for (uint256 i = 0; i < runDrops.length; i++) {
            if (
                probability >= runDrops[i].minProbability &&
                probability < runDrops[i].maxProbability
            ) {
                return runDrops[i];
            }
        }
        revert("No drop found");
    }

    function _getRandomProbability() private view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encode(
                        msg.sender,
                        tx.gasprice,
                        block.number,
                        block.timestamp,
                        blockhash(block.number - 1),
                        nextRunId
                    )
                )
            ) % 10000;
    }
}
