const Tokencard = artifacts.require('./../Tokencard.sol');
const { BN, expectEvent, expectRevert, time } = require('openzeppelin-test-helpers');

contract('Tokencard', ([owner, whitelistedAccount, otherWhitelistedAccount, notWhitelistedAccount, ...accounts]) => {

	let dailyLimit = '1000';
	let instance = null;

	it('should create contract and log initial dailyLimit and whitelisted addresses', async () => {
		instance =  await Tokencard.new(dailyLimit, [whitelistedAccount], { from: owner });

		await expectEvent.inConstruction(
			instance, 
			'LogTokencardContractCreated');
	})

	it('should have daily limit of 1000', async () => {
		let _dailyLimit = await instance._dailyLimit();

		assert.deepEqual(_dailyLimit.toString(), dailyLimit, "Daily limit incorrect");
	})

	it('should have whitelistedAccount whitelisted', async () => {
		let isWhitelisted = await instance.m_whitelistedAddresses(whitelistedAccount);
		
		assert.deepEqual(isWhitelisted, true, "whitelistedAccount is not whitelisted");
	})

	it('should change daily limit to 100', async () => {
		dailyLimit = '100';

		let txReceipt = await instance.setDailyLimit(dailyLimit, { from: owner });

		await expectEvent.inTransaction(
			txReceipt.tx,
			Tokencard,
			'LogDailylimitChange');

		let _dailyLimit = await instance._dailyLimit();

		assert.deepEqual(_dailyLimit.toString(), dailyLimit, "Daily limit incorrect");
	})

	it('should have otherWhitelistedAccount not whitelisted yet', async () => {
		let isWhitelisted = await instance.m_whitelistedAddresses(otherWhitelistedAccount);
		
		assert.deepEqual(isWhitelisted, false, "otherWhitelistedAccount is whitelisted");
	})

	it('should add otherWhitelistedAccount to whitelist', async () => {
		let txReceipt = await instance.addToWhitelist([otherWhitelistedAccount], { from: owner });

		await expectEvent.inTransaction(
			txReceipt.tx,
			Tokencard,
			'LogAddedToWhitelist');

		let isWhitelisted = await instance.m_whitelistedAddresses(otherWhitelistedAccount);
		
		assert.deepEqual(isWhitelisted, true, "otherWhitelistedAccount is not whitelisted");
	})

	it('should remove otherWhitelistedAccount from whitelist', async () => {
		let txReceipt = await instance.removeFromWhitelist([otherWhitelistedAccount], { from: owner });

		await expectEvent.inTransaction(
			txReceipt.tx,
			Tokencard,
			'LogRemovedFromWhitelist');

		let isWhitelisted = await instance.m_whitelistedAddresses(otherWhitelistedAccount);
		
		assert.deepEqual(isWhitelisted, false, "otherWhitelistedAccount is still whitelisted");
	})

	it('should revert because contract balance is empty', async () => {
		let amount = '1000'
		await expectRevert(
			instance.spend(whitelistedAccount, amount, { from: owner }),
			'Amount exceeds current balance'
			);
	})

	it('should send 1 ether to contract', async () => {
		await web3.eth.sendTransaction({ from: owner, to: instance.address, value: web3.utils.toWei('1', 'ether') });

		let balance = await web3.eth.getBalance(instance.address);
		
		assert.deepEqual(balance, web3.utils.toWei('1', 'ether').toString(), "balance is not equal to 1 ether");
	})

	it('should send 1000 wei to whitelisted recipient', async () => {
		let amount = new BN('1000');
		let contractBalance = await web3.eth.getBalance(instance.address);
		let recipientBalance = await web3.eth.getBalance(whitelistedAccount);
		
		let txReceipt = await instance.spend(whitelistedAccount, amount, { from: owner })

		await expectEvent.inTransaction(
			txReceipt.tx,
			Tokencard,
			'LogTransfer');

		let newContractBalance = await web3.eth.getBalance(instance.address);
		let newRecipientBalance = await web3.eth.getBalance(whitelistedAccount);

		assert.deepEqual(newContractBalance.toString(), new BN(contractBalance).sub(amount).toString(), "new contract balance is incorrect");
		assert.deepEqual(newRecipientBalance.toString(), new BN(recipientBalance).add(amount).toString(), "new recipient balance is incorrect");
	})

	it('should send 80 wei to not whitelisted recipient', async () => {
		let amount = new BN('80');
		let contractBalance = await web3.eth.getBalance(instance.address);
		let recipientBalance = await web3.eth.getBalance(notWhitelistedAccount);
		
		let txReceipt = await instance.spend(notWhitelistedAccount, amount, { from: owner })

		await expectEvent.inTransaction(
			txReceipt.tx,
			Tokencard,
			'LogTransfer');

		let newContractBalance = await web3.eth.getBalance(instance.address);
		let newRecipientBalance = await web3.eth.getBalance(notWhitelistedAccount);

		assert.deepEqual(newContractBalance.toString(), new BN(contractBalance).sub(amount).toString(), "new contract balance is incorrect");
		assert.deepEqual(newRecipientBalance.toString(), new BN(recipientBalance).add(amount).toString(), "new recipient balance is incorrect");
	})

	it('should revert because recipient is not whitelisted and amount exceeds daily limit', async () => {
		let amount = new BN('80');
		
		await expectRevert(
			instance.spend(notWhitelistedAccount, amount, { from: owner }),
			'Spent amount exceeds daily limit'
			);
	})

	it('should send 80 wei to not whitelisted recipient because daily limit has been reset', async () => {
		await time.increase(time.duration.days(1));

		let amount = new BN('80');
		let contractBalance = await web3.eth.getBalance(instance.address);
		let recipientBalance = await web3.eth.getBalance(notWhitelistedAccount);
		
		let txReceipt = await instance.spend(notWhitelistedAccount, amount, { from: owner })

		await expectEvent.inTransaction(
			txReceipt.tx,
			Tokencard,
			'LogTransfer');

		let newContractBalance = await web3.eth.getBalance(instance.address);
		let newRecipientBalance = await web3.eth.getBalance(notWhitelistedAccount);

		assert.deepEqual(newContractBalance.toString(), new BN(contractBalance).sub(amount).toString(), "new contract balance is incorrect");
		assert.deepEqual(newRecipientBalance.toString(), new BN(recipientBalance).add(amount).toString(), "new recipient balance is incorrect");
	})

})