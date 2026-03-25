// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ISomniaReactivityPrecompile } from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaReactivityPrecompile.sol";
import { ISomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaEventHandler.sol";

/**
 * @title AlertRegistry
 * @notice Stores user alert conditions. Each alert creates a Reactivity
 *         subscription so the chain monitors the target wallet trustlessly.
 */
contract AlertRegistry {

    ISomniaReactivityPrecompile constant PRECOMPILE =
        ISomniaReactivityPrecompile(address(0x0100));

    struct Alert {
        uint256 id;
        address owner;          // User who registered the alert
        address watchAddress;   // Wallet/contract to monitor
        address tokenAddress;   // ERC20 token to monitor (address(0) for any)
        uint256 threshold;      // Minimum transfer amount to trigger (in wei)
        uint256 subscriptionId; // Reactivity subscription ID (uint256 per actual API)
        bool active;
        uint256 createdAt;
    }

    uint256 public alertCount;
    address public handlerContract;

    mapping(uint256 => Alert) public alerts;
    mapping(address => uint256[]) public alertsByOwner;

    event AlertRegistered(
        uint256 indexed alertId,
        address indexed owner,
        address indexed watchAddress,
        address tokenAddress,
        uint256 threshold,
        uint256 subscriptionId
    );
    event AlertDeleted(uint256 indexed alertId, address indexed owner);

    constructor(address _handlerContract) {
        handlerContract = _handlerContract;
    }

    /**
     * @notice Allows the contract to receive STT to fund Reactivity subscriptions.
     *         The contract must hold at least 32 STT to keep subscriptions active.
     */
    receive() external payable {}

    /**
     * @notice Allow the deployer to withdraw STT if needed.
     */
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @notice Register a new alert. Creates a Reactivity subscription
     *         that watches `watchAddress` for Transfer events.
     *
     * @param watchAddress  The wallet to monitor
     * @param tokenAddress  The ERC20 token to monitor (or address(0) for all)
     * @param threshold     Minimum amount (in wei) to trigger alert
     *
     * IMPORTANT: The contract (or caller) must hold 32+ STT for the
     * subscription to be funded.
     */
    function registerAlert(
        address watchAddress,
        address tokenAddress,
        uint256 threshold
    ) external returns (uint256 alertId) {

        alertId = ++alertCount;

        // ERC20 Transfer event selector:
        // keccak256("Transfer(address,address,uint256)")
        bytes32 transferTopic = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef;

        // Create Reactivity subscription:
        // Watch ALL Transfer events FROM watchAddress (origin filter)
        // For the specific tokenAddress (emitter filter)
        ISomniaReactivityPrecompile.SubscriptionData memory subData = ISomniaReactivityPrecompile.SubscriptionData({
            eventTopics: [transferTopic, bytes32(0), bytes32(0), bytes32(0)],
            origin: watchAddress,       // Filter: only txs FROM this wallet
            caller: address(0),         // Wildcard: any msg.sender
            emitter: tokenAddress,      // Filter: only this specific token contract (or address(0) for all)
            handlerContractAddress: handlerContract,
            handlerFunctionSelector: ISomniaEventHandler.onEvent.selector,
            priorityFeePerGas: 0,               // 0 nanoSomi
            maxFeePerGas: 10_000_000_000,        // 10 gwei
            gasLimit: 2_000_000,                 // Safe for state update + event emit
            isGuaranteed: true,                  // Retry if current block is full
            isCoalesced: false                   // One call per event (not batched)
        });

        uint256 subscriptionId = PRECOMPILE.subscribe(subData);

        alerts[alertId] = Alert({
            id: alertId,
            owner: msg.sender,
            watchAddress: watchAddress,
            tokenAddress: tokenAddress,
            threshold: threshold,
            subscriptionId: subscriptionId,
            active: true,
            createdAt: block.timestamp
        });

        alertsByOwner[msg.sender].push(alertId);

        emit AlertRegistered(alertId, msg.sender, watchAddress, tokenAddress, threshold, subscriptionId);
    }

    /**
     * @notice Delete an alert and cancel its Reactivity subscription
     */
    function deleteAlert(uint256 alertId) external {
        Alert storage alert_ = alerts[alertId];
        require(alert_.owner == msg.sender, "Not your alert");
        require(alert_.active, "Already deleted");

        alert_.active = false;
        PRECOMPILE.unsubscribe(alert_.subscriptionId);

        emit AlertDeleted(alertId, msg.sender);
    }

    function getAlertsByOwner(address owner) external view returns (uint256[] memory) {
        return alertsByOwner[owner];
    }

    function getAlert(uint256 alertId) external view returns (Alert memory) {
        return alerts[alertId];
    }
}
