// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract GatherRun is Ownable, Pausable {
    uint256 public nextRunId = 1;

    struct Drop {
        uint256 resourceId;
        uint16 minProbability;
        uint16 maxProbability;
    }

    struct Run {
        bool isDisabled;
        uint64 duration;
        uint256 avgDrop;
        // Drop[] drops;
    }

    mapping(uint256 => Run) public runs;

    constructor() Ownable(msg.sender) {}

    // function createRun(uint64 duration, uint256 avgDrop, Drop[] memory drops) public onlyOwner {
    function createRun(uint64 duration, uint256 avgDrop) public onlyOwner {
        runs[nextRunId] = Run({
            duration: duration,
            avgDrop: avgDrop,
            // drops: new Drop[](0),
            isDisabled: false
        });
        nextRunId++;
    }

    // TODO
    // function updateRun(uint256 runId, uint64 duration, uint256 avgDrop, Drop[] memory drops) public onlyOwner {
    function updateRun(
        uint256 runId,
        uint64 duration,
        uint256 avgDrop
    ) public onlyOwner {
        runs[runId] = Run({
            duration: duration,
            avgDrop: avgDrop,
            // drops: drops,
            isDisabled: runs[runId].isDisabled
        });
    }

    function disableRun(uint256 runId) public onlyOwner {
        runs[runId].isDisabled = true;
    }

    function enableRun(uint256 runId) public onlyOwner {
        runs[runId].isDisabled = false;
    }

    function totalRuns() public view returns (uint256) {
        return nextRunId;
    }

    function getRun(uint256 runId) public view returns (Run memory) {
        return runs[runId];
    }

    // startGatherRun - as user with nft
    // sendAllEligibleToGather
    // claimAllGatherRunRewards
    // claimGatherRunRewards
}
