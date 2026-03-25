// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

/**
 * @title AlertHandler
 * @notice Receives reactive callbacks from Somnia validators when monitored
 *         Transfer events match registered alert conditions.
 *         msg.sender will be the Somnia Reactivity Precompile (0x0100)
 *         tx.origin will be the subscription owner's address
 */
contract AlertHandler is SomniaEventHandler {

    address public registry;

    // Emitted when an alert condition is met — this is what the off-chain SDK picks up
    event AlertTriggered(
        address indexed tokenAddress,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 blockNumber,
        uint256 timestamp
    );

    modifier onlyRegistry() {
        require(msg.sender == registry || registry == address(0), "Not registry");
        _;
    }

    constructor() {}

    function setRegistry(address _registry) external {
        require(registry == address(0), "Already set");
        registry = _registry;
    }

    /**
     * @notice Called by Somnia validators when a matching Transfer event fires.
     *         msg.sender = Somnia Reactivity Precompile (0x0100)
     *         tx.origin  = subscription owner
     *
     * @param emitter    The contract that emitted the Transfer event (the specific ERC20 token)
     * @param eventTopics The event topics array [topic0 (sig), topic1 (from), topic2 (to)]
     * @param data       ABI-encoded event data (the `value` for ERC20 Transfer)
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        address from = address(uint160(uint256(eventTopics[1])));
        address to   = address(uint160(uint256(eventTopics[2])));
        uint256 amount = abi.decode(data, (uint256));

        emit AlertTriggered(
            emitter,
            from,
            to,
            amount,
            block.number,
            block.timestamp
        );
    }
}
