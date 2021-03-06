/**
 * Copyright (c) 2019-present, deora.earth
 *
 * This source code is licensed under the Mozilla Public License, version 2,
 * found in the LICENSE file in the root directory of this source tree.
 */
const chai = require('chai');
const ethUtil = require('ethereumjs-util');
const VotingBooth = artifacts.require('./VotingBooth.sol');
const SimpleToken = artifacts.require('./mocks/SimpleToken');
const ERC1948 = artifacts.require('./mocks/ERC1948');
const SmtLib = require('./helpers/SmtLib.js');

const should = chai
  .use(require('chai-as-promised'))
  .should();

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace.replace('0x', '').toLowerCase());
}


contract('Voting Booth', (accounts) => {
  const voter = accounts[1];
  const YES_BOX = accounts[2];
  const NO_BOX = accounts[3];
  const balanceCardId = 123;
  const voterPriv = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201';
  const voiceBudget = '400000000000000000000';
  const totalVotes = '400000000000000000000';
  let voiceCredits;
  let votes;
  let balanceCards;
  let originalByteCode;

  beforeEach(async () => {
    voiceCredits = await SimpleToken.new(voiceBudget);
    votes = await SimpleToken.new(totalVotes);
    balanceCards = await ERC1948.new();
    originalByteCode = VotingBooth._json.bytecode;
  });

  afterEach(() => {
    VotingBooth._json.bytecode = originalByteCode;
  });

  it('should allow to cast ballot', async () => {

    const motionId = `000000000000`;

    // deploy vote contract
    let tmp = VotingBooth._json.bytecode;
    // replace token address placeholder to real token address
    tmp = replaceAll(tmp, '1231111111111111111111111111111111111123', voiceCredits.address);
    tmp = replaceAll(tmp, '2341111111111111111111111111111111111234', votes.address);
    tmp = replaceAll(tmp, '3451111111111111111111111111111111111345', balanceCards.address);
    tmp = replaceAll(tmp, '4561111111111111111111111111111111111456', YES_BOX);
    tmp = replaceAll(tmp, '5671111111111111111111111111111111111567', NO_BOX);
    tmp = replaceAll(tmp, 'deadbeef0001', motionId);
    VotingBooth._json.bytecode = tmp;
    const voteContract = await VotingBooth.new();

    // fund voter
    await voiceCredits.transfer(voter, voiceBudget);
    await votes.transfer(voteContract.address, totalVotes);

    // print balance card for voter
    await balanceCards.mint(voter, balanceCardId);
    await balanceCards.approve(voteContract.address, balanceCardId, {from: voter});

    // voter signing transaction
    await voiceCredits.approve(voteContract.address, voiceBudget, {from: voter});
    let tree = new SmtLib(9);

    // sending transaction
    const tx = await voteContract.castBallot(
      balanceCardId,
      tree.createMerkleProof(0),
      0,
      '3000000000000000000',
    ).should.be.fulfilled;

    // check result
    const credits = await voiceCredits.balanceOf(YES_BOX);
    assert.equal(credits.toString(10), '9000000000000000000');
    const voteAmount = await votes.balanceOf(YES_BOX);
    assert.equal(voteAmount.toString(10), '3000000000000000000');
    const card = await balanceCards.readData(balanceCardId);
    tree = new SmtLib(9, {
      '0': '0x00000000000000000000000000000000000000000000000029A2241AF62C0000'
    });
    assert.equal(card, tree.root);
  });

  it('should allow to change casted ballot', async () => {

    const motionId = `000000000005`;
    // deploy vote contract
    let tmp = VotingBooth._json.bytecode;
    // replace token address placeholder to real token address
    tmp = replaceAll(tmp, '1231111111111111111111111111111111111123', voiceCredits.address);
    tmp = replaceAll(tmp, '2341111111111111111111111111111111111234', votes.address);
    tmp = replaceAll(tmp, '3451111111111111111111111111111111111345', balanceCards.address);
    tmp = replaceAll(tmp, '4561111111111111111111111111111111111456', YES_BOX);
    tmp = replaceAll(tmp, '5671111111111111111111111111111111111567', NO_BOX);
    tmp = replaceAll(tmp, 'deadbeef0001', motionId);
    VotingBooth._json.bytecode = tmp;
    const voteContract = await VotingBooth.new();

    // fund voter
    await voiceCredits.transfer(voter, voiceBudget);
    await votes.transfer(voteContract.address, totalVotes);

    // print balance card for voter
    await balanceCards.mint(voter, balanceCardId);

    let tree = new SmtLib(9, {
      '5': '0x0000000000000000000000000000000000000000000000001BC16D674EC80000',
      '7': '0x0000000000000000000000000000000000000000000000001BC16D674EC80000'
    });

    await balanceCards.writeData(balanceCardId, tree.root, {from: voter});
    await balanceCards.approve(voteContract.address, balanceCardId, {from: voter});

    // voter signing transaction
    await voiceCredits.approve(voteContract.address, voiceBudget, {from: voter});

    // sending transaction
    const tx = await voteContract.castBallot(
      balanceCardId,
      tree.createMerkleProof(5),
      '2000000000000000000',
      '3000000000000000000',
    ).should.be.fulfilled;

    // check result
    const credits = await voiceCredits.balanceOf(YES_BOX);
    assert.equal(credits.toString(10), '5000000000000000000');
    const voteAmount = await votes.balanceOf(YES_BOX);
    assert.equal(voteAmount.toString(10), '1000000000000000000');
    const card = await balanceCards.readData(balanceCardId);
    tree = new SmtLib(9, {
      '5': '0x00000000000000000000000000000000000000000000000029A2241AF62C0000',
      '7': '0x0000000000000000000000000000000000000000000000001BC16D674EC80000'
    });
    assert.equal(card, tree.root);
  });

  it('should allow to change add 1 to 1', async () => {

    const motionId = `000000000000`;
    // deploy vote contract
    let tmp = VotingBooth._json.bytecode;
    // replace token address placeholder to real token address
    tmp = replaceAll(tmp, '1231111111111111111111111111111111111123', voiceCredits.address);
    tmp = replaceAll(tmp, '2341111111111111111111111111111111111234', votes.address);
    tmp = replaceAll(tmp, '3451111111111111111111111111111111111345', balanceCards.address);
    tmp = replaceAll(tmp, '4561111111111111111111111111111111111456', YES_BOX);
    tmp = replaceAll(tmp, '5671111111111111111111111111111111111567', NO_BOX);
    tmp = replaceAll(tmp, 'deadbeef0001', motionId);
    VotingBooth._json.bytecode = tmp;
    const voteContract = await VotingBooth.new();

    // fund voter
    await voiceCredits.transfer(voter, voiceBudget);
    await votes.transfer(voteContract.address, totalVotes);

    // print balance card for voter
    await balanceCards.mint(voter, balanceCardId);

    let tree = new SmtLib(9, {
      '0': '0x0000000000000000000000000000000000000000000000000DE0B6B3A7640000',
      '7': '0x0000000000000000000000000000000000000000000000001BC16D674EC80000'
    });

    await balanceCards.writeData(balanceCardId, tree.root, {from: voter});
    await balanceCards.approve(voteContract.address, balanceCardId, {from: voter});

    // voter signing transaction
    await voiceCredits.approve(voteContract.address, voiceBudget, {from: voter});

    // sending transaction
    const tx = await voteContract.castBallot(
      balanceCardId,
      tree.createMerkleProof(0),
      '1000000000000000000',
      '2000000000000000000',
    ).should.be.fulfilled;

    // check result
    const credits = await voiceCredits.balanceOf(YES_BOX);
    assert.equal(credits.toString(10), '3000000000000000000');
    const voteAmount = await votes.balanceOf(YES_BOX);
    assert.equal(voteAmount.toString(10), '1000000000000000000');
    const card = await balanceCards.readData(balanceCardId);
    tree = new SmtLib(9, {
      '0': '0x0000000000000000000000000000000000000000000000001BC16D674EC80000',
      '7': '0x0000000000000000000000000000000000000000000000001BC16D674EC80000'
    });
    assert.equal(card, tree.root);
  });

  it('should allow to cast no', async () => {

    const motionId = `000000000000`;
    // deploy vote contract
    let tmp = VotingBooth._json.bytecode;
    // replace token address placeholder to real token address
    tmp = replaceAll(tmp, '1231111111111111111111111111111111111123', voiceCredits.address);
    tmp = replaceAll(tmp, '2341111111111111111111111111111111111234', votes.address);
    tmp = replaceAll(tmp, '3451111111111111111111111111111111111345', balanceCards.address);
    tmp = replaceAll(tmp, '4561111111111111111111111111111111111456', YES_BOX);
    tmp = replaceAll(tmp, '5671111111111111111111111111111111111567', NO_BOX);
    tmp = replaceAll(tmp, 'deadbeef0001', motionId);
    VotingBooth._json.bytecode = tmp;
    const voteContract = await VotingBooth.new();

    // fund voter
    await voiceCredits.transfer(voter, voiceBudget);
    await votes.transfer(voteContract.address, totalVotes);

    // print balance card for voter
    await balanceCards.mint(voter, balanceCardId);

    let tree = new SmtLib(9, {
      '0': '0x0000000000000000000000000000000000000000000000000000000000000000',
      '7': '0x0000000000000000000000000000000000000000000000001BC16D674EC80000'
    });

    await balanceCards.writeData(balanceCardId, tree.root, {from: voter});
    await balanceCards.approve(voteContract.address, balanceCardId, {from: voter});

    // voter signing transaction
    await voiceCredits.approve(voteContract.address, voiceBudget, {from: voter});

    // sending transaction
    const tx = await voteContract.castBallot(
      balanceCardId,
      tree.createMerkleProof(0),
      0,
      '-1000000000000000000',
    ).should.be.fulfilled;

    // check result
    const credits = await voiceCredits.balanceOf(NO_BOX);
    assert.equal(credits.toString(10), '1000000000000000000');
    const voteAmount = await votes.balanceOf(NO_BOX);
    assert.equal(voteAmount.toString(10), '1000000000000000000');
    const card = await balanceCards.readData(balanceCardId);
    tree = new SmtLib(9, {
      '0': '0xffffffffffffffffffffffffffffffffffffffffffffffffF21F494C589C0000',
      '7': '0x0000000000000000000000000000000000000000000000001BC16D674EC80000'
    });
    assert.equal(card, tree.root);
  });

  it('should allow to consolidate', async () => {
    // deploy earth
    let tmp = VotingBooth._json.bytecode;
    // replace token address placeholder to real token address
    tmp = replaceAll(tmp, '7891111111111111111111111111111111111789', voter.replace('0x', ''));
    VotingBooth._json.bytecode = tmp;
    const voteContract = await VotingBooth.new();

    await votes.transfer(voteContract.address, totalVotes);

    const buf = Buffer.alloc(32, 0);
    Buffer.from(voteContract.address.replace('0x', ''), 'hex').copy(buf, 12, 0, 20);
    const sig = ethUtil.ecsign(buf, Buffer.from(voterPriv.replace('0x', '') , 'hex'));

    // sending transaction
    const tx = await voteContract.consolidate(votes.address, sig.v, sig.r, sig.s).should.be.fulfilled;
  });

  it('test tree', async () => {
    // this is what we see from local storage
    const tree1 = new SmtLib(9, {
      '0': '0x0000000000000000000000000000000000000000000000001bc16d674ec80000',
      '1': '0x0000000000000000000000000000000000000000000000000000000000000000',
      '2': '0x0000000000000000000000000000000000000000000000000000000000000000',
      '3': '0x0000000000000000000000000000000000000000000000000000000000000000'
    });
    // this is what the smart contract produces
    const tree2 = new SmtLib(9, {
      '0': '0x0000000000000000000000000000000000000000000000001bc16d674ec80000'
    });
    assert.equal(tree1.root, tree2.root);
  });

});
