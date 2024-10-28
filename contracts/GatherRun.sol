// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./lib/Pausable.sol";

contract GatherRun is Initializable, Pausable {
    /*========================= STRUCTS =========================*/

    struct Drop {
        string resourceType;
        uint256 resourceAmount;
        uint16 minProbability;
        uint16 maxProbability;
    }

    /*========================= CONTRACT STATE =========================*/

    uint256 public nextRunId;

    // Reserved storage slots for future upgrades
    uint256[10] private __gap;

    mapping(uint256 => uint256) public durations;
    mapping(uint256 => Drop[]) public drops;

    /*============================ EVENTS ============================*/

    event RunCreated(uint256 runId, uint256 duration, Drop[] drops);
    event RunUpdated(uint256 runId, uint256 duration, Drop[] drops);

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
}
