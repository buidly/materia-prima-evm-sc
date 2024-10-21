// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract GatherRun is OwnableUpgradeable, PausableUpgradeable {
    uint256 public nextRunId;

    struct Drop {
        string resourceType;
        uint256 resourceAmount;
        uint16 minProbability;
        uint16 maxProbability;
    }

    struct LockedHomunculi {
        address owner;
        uint256 unlockTime;
        bool withdrawn;
    }

    mapping(uint256 => uint256) public durations;
    mapping(uint256 => Drop[]) public drops;
    mapping(address => bool) public acceptedNftAddresses;
    mapping(address => mapping(uint256 => LockedHomunculi))
        public lockedHomunculi;

    event RunCreated(uint256 runId, uint256 duration, Drop[] drops);
    event RunUpdated(uint256 runId, uint256 duration, Drop[] drops);
    event ExpeditionStarted(
        uint256 runId,
        address nftAddress,
        uint256 tokenId,
        uint256 unlockTime
    );
    event HomunculusWithdrawn(
        address owner,
        address nftAddress,
        uint256 tokenId,
        string resourceType,
        uint256 resourceAmount
    );

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();

        nextRunId = 1;
    }

    function createRun(
        uint256 duration,
        Drop[] memory _drops
    ) public onlyOwner {
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
    ) public onlyOwner {
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

    function acceptNftAddress(address nftAddress) public onlyOwner {
        acceptedNftAddresses[nftAddress] = true;
    }

    function removeNftAddress(address nftAddress) public onlyOwner {
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

        uint256 unlockedTime = block.timestamp + durations[_runId];
        lockedHomunculi[_nftAddress][_tokenId] = LockedHomunculi({
            owner: msg.sender,
            unlockTime: unlockedTime,
            withdrawn: false
        });

        emit ExpeditionStarted(_runId, _nftAddress, _tokenId, unlockedTime);
    }

    function withdrawHomunculi(
        address _nftAddress,
        uint256 _tokenId
    ) public whenNotPaused {
        LockedHomunculi storage lockedHomunculus = lockedHomunculi[_nftAddress][
            _tokenId
        ];
        require(
            lockedHomunculus.owner == msg.sender,
            "Sender does not own the homunculus"
        );
        require(
            lockedHomunculus.unlockTime <= block.timestamp,
            "Homunculus is still locked"
        );

        lockedHomunculus.withdrawn = true;

        IERC721 nftContract = IERC721(_nftAddress);
        nftContract.transferFrom(address(this), msg.sender, _tokenId);

        // TODO compute rewards

        string memory resourceType = "gold";
        uint256 resourceAmount = 100;

        emit HomunculusWithdrawn(
            msg.sender,
            _nftAddress,
            _tokenId,
            resourceType,
            resourceAmount
        );
    }

    function getLockedHomunculi(
        address _nftAddress,
        uint256 _tokenId
    ) public view returns (LockedHomunculi memory) {
        return lockedHomunculi[_nftAddress][_tokenId];
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // TODO ierc721receiver
}
