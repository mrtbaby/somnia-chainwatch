// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IAlertRegistry {
    struct Alert {
        uint256 id;
        address owner;
        address watchAddress;
        uint256 threshold;
        uint256 subscriptionId;
        bool active;
        uint256 createdAt;
    }

    function registerAlert(address watchAddress, uint256 threshold) external returns (uint256 alertId);
    function deleteAlert(uint256 alertId) external;
    function getAlertsByOwner(address owner) external view returns (uint256[] memory);
    function getAlert(uint256 alertId) external view returns (Alert memory);
}
