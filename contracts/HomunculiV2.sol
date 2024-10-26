// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Homunculi.sol";

contract HomunculiV2 is Homunculi {
    function newFunctionality() public pure returns (string memory) {
        return "New functionality added!";
    }
}
