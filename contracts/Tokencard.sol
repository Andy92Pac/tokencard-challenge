pragma solidity ^0.5.0;


import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract Tokencard {

	using SafeMath for uint;

	/**
     * Event for Token contract creation
     * @param dailyLimit Initial daily limit
     * @param addresses Initial whitelisted addresses
     */
     event LogTokencardContractCreated(uint dailyLimit, address[] addresses);

    /**
     * Event for ether transfer
     * @param to Recipient of the transfer
     * @param amount Amount transfered to the recipient
     */
     event LogTransfer(address indexed to, uint amount);

    /**
     * Event for daily limit change
     * @param dailyLimit New daily limit value
     */
     event LogDailylimitChange(uint dailyLimit);

    /**
     * Event for new whitelist addition
     * @param addresses Addresses added to the whitelist
     */
     event LogAddedToWhitelist(address[] addresses);

    /**
     * Event for new whitelist removal
     * @param addresses Addresses removed from the whitelist
     */
     event LogRemovedFromWhitelist(address[] addresses);


     struct Spent {
     	uint _amount;
     	uint _lastUpdate;	
     }

	// Whitelisted addresses 
	mapping (address => bool) public m_whitelistedAddresses;

	// Daily spent amount
	mapping (address => Spent) private m_dailySpent;

	// Smart contract owner
	address public _owner;

	// Daily limit 
	uint public _dailyLimit;

	// constant number of seconds in a day
	uint constant DAY_IN_SECONDS = 86400;

	modifier onlyOwner() { 
		require (_owner == msg.sender); 
		_; 
	}

	/**
     * @dev Constructor, takes dailyLimit and addresses
     * @param dailyLimit Initial daily limit set by owner at creation
     * @param addresses Initial whitelisted addresses set by owner at creation
     */
     constructor(uint dailyLimit, address[] memory addresses) public {
     	_owner = msg.sender;

     	_dailyLimit = dailyLimit;
     	
     	_addToWhitelist(addresses);

     	emit LogTokencardContractCreated(_dailyLimit, addresses);
     }

     // @notice Will receive any eth sent to the contract
     function () external payable {
     }

	/**
     * @dev Function to send ethers
     * @param to The address that will receive ethers
     * @param amount The amount of ethers to send
     * @return A boolean that indicates if the operation was successful
     */
     function spend(address payable to, uint amount) onlyOwner public returns (bool) {

     	require(address(this).balance >= amount, 'Amount exceeds current balance');
     	
     	bool whitelisted = m_whitelistedAddresses[to];

     	uint currentDay = _getDay(now);

     	if (currentDay > m_dailySpent[to]._lastUpdate) {
     		m_dailySpent[to]._lastUpdate = currentDay;
     		m_dailySpent[to]._amount = 0;
     	}

     	uint newSpentAmount = m_dailySpent[to]._amount.add(amount);

     	if (whitelisted == false) {
     		require (newSpentAmount <= _dailyLimit, 'Spent amount exceeds daily limit');
     	}

     	m_dailySpent[to]._amount = newSpentAmount;

     	to.transfer(amount);

     	emit LogTransfer(to, amount);
     	return true;
     }

    /**
     * @dev Function to set daily limit
     * @param dailyLimit The new daily limit to be set
     * @return A boolean that indicates if the operation was successful
     */
     function setDailyLimit(uint dailyLimit) onlyOwner public returns (bool) {
     	require (dailyLimit >= 0);

     	_dailyLimit = dailyLimit;

     	emit LogDailylimitChange(_dailyLimit);
     	return true;
     }

    /**
     * @dev Function to add new addresses to the whitelist
     * @param addresses The addresses to be whitelisted
     * @return A boolean that indicates if the operation was successful
     */
     function addToWhitelist(address[] memory addresses) onlyOwner public returns (bool) {
     	require (addresses.length > 0, 'Empty address array');

     	_addToWhitelist(addresses);

     	emit LogAddedToWhitelist(addresses);
     	return true;
     }

    /**
     * @dev Function to remove addresses from the whitelist
     * @param addresses The addresses to be removed from the whitelist
     * @return A boolean that indicates if the operation was successful
     */
     function removeFromWhitelist(address[] memory addresses) onlyOwner public returns (bool) {
     	require (addresses.length > 0, 'Empty address array');

     	for(uint i=0; i<addresses.length; i++) {
     		m_whitelistedAddresses[addresses[i]] = false;
     	}

     	emit LogRemovedFromWhitelist(addresses);
     	return true;
     }

    /**
     * @dev Internal function to add new addresses to the whitelist, allows to create constructor without any whitelisted address
     * @param addresses The addresses to be whitelisted
     * @return A boolean that indicates if the operation was successful
     */
     function _addToWhitelist(address[] memory addresses) internal returns (bool) {
     	for(uint i=0; i<addresses.length; i++) {
     		m_whitelistedAddresses[addresses[i]] = true;
     	}
     	return true;
     }

    /**
     * @dev Internal function to get the number of the current day
     * @param timestamp Timestamp of the date we want to get the day from
     * @return A uint corresponding to the number of the current day
     */
     function _getDay(uint timestamp) internal pure returns (uint) {
     	return timestamp.div(DAY_IN_SECONDS);
     }
 }

