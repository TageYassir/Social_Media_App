// contents of file
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { Wallet, Transaction } = require('../models');

// Helper to generate a short unique wallet id
function generateWalletId() {
  return (
    'w_' +
    Date.now().toString(36) +
    Math.random()
      .toString(16)
      .slice(2, 8)
  );
}

function jsonError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

// Create or return existing wallet for a userId
router.post('/create-wallet', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return jsonError(res, 400, 'userId is required');

    let wallet = await Wallet.findOne({ userId }).lean();
    if (wallet) return res.json({ success: true, wallet });

    const walletId = generateWalletId();
    wallet = await Wallet.create({ walletId, userId, balance: 0 });
    return res.json({ success: true, wallet });
  } catch (err) {
    console.error('create-wallet error', err);
    return jsonError(res, 500, 'Internal server error');
  }
});

// Get wallet by userId
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return jsonError(res, 400, 'userId is required');

    const wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) return jsonError(res, 404, 'Wallet not found');
    return res.json({ success: true, wallet });
  } catch (err) {
    console.error('get wallet error', err);
    return jsonError(res, 500, 'Internal server error');
  }
});

// Add balance (system top-up). Records a transaction with senderWalletId='SYSTEM'
router.post('/add-balance', async (req, res) => {
  try {
    const { walletId, amount } = req.body || {};
    const amt = Number(amount);
    if (!walletId) return jsonError(res, 400, 'walletId is required');
    if (!amt || isNaN(amt) || amt <= 0) return jsonError(res, 400, 'amount must be a positive number');

    // Atomic increment
    const wallet = await Wallet.findOneAndUpdate(
      { walletId },
      { $inc: { balance: amt } },
      { new: true }
    ).lean();

    if (!wallet) return jsonError(res, 404, 'Wallet not found');

    // record top-up as coming from SYSTEM
    await Transaction.create({
      senderWalletId: 'SYSTEM',
      receiverWalletId: walletId,
      amount: amt,
      status: 'completed',
    });

    return res.json({ success: true, wallet });
  } catch (err) {
    console.error('add-balance error', err);
    return jsonError(res, 500, 'Internal server error');
  }
});

// Transfer from one wallet to another
router.post('/transfer', async (req, res) => {
  const sessionSupported = typeof mongoose.startSession === 'function';
  const { fromWalletId, toWalletId, amount } = req.body || {};
  const amt = Number(amount);

  if (!fromWalletId || !toWalletId) return jsonError(res, 400, 'fromWalletId and toWalletId are required');
  if (fromWalletId === toWalletId) return jsonError(res, 400, 'fromWalletId and toWalletId must be different');
  if (!amt || isNaN(amt) || amt <= 0) return jsonError(res, 400, 'amount must be a positive number');

  // Use transactions if available
  if (sessionSupported) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Decrement sender if sufficient funds
      const sender = await Wallet.findOneAndUpdate(
        { walletId: fromWalletId, balance: { $gte: amt } },
        { $inc: { balance: -amt } },
        { new: true, session }
      );

      if (!sender) {
        await session.abortTransaction();
        session.endSession();
        return jsonError(res, 400, 'Insufficient funds or sender not found');
      }

      const receiver = await Wallet.findOneAndUpdate(
        { walletId: toWalletId },
        { $inc: { balance: amt } },
        { new: true, session }
      );

      if (!receiver) {
        await session.abortTransaction();
        session.endSession();
        return jsonError(res, 404, 'Receiver wallet not found');
      }

      await Transaction.create(
        [
          {
            senderWalletId: fromWalletId,
            receiverWalletId: toWalletId,
            amount: amt,
            status: 'completed',
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      const updatedSender = await Wallet.findOne({ walletId: fromWalletId }).lean();
      const updatedReceiver = await Wallet.findOne({ walletId: toWalletId }).lean();

      return res.json({ success: true, sender: updatedSender, receiver: updatedReceiver });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error('transfer error (txn)', err);
      return jsonError(res, 500, 'Transfer failed');
    }
  }

  // Fallback (no transactions): use guarded atomic updates and basic rollback
  try {
    const sender = await Wallet.findOneAndUpdate(
      { walletId: fromWalletId, balance: { $gte: amt } },
      { $inc: { balance: -amt } },
      { new: true }
    );

    if (!sender) return jsonError(res, 400, 'Insufficient funds or sender not found');

    const receiver = await Wallet.findOneAndUpdate({ walletId: toWalletId }, { $inc: { balance: amt } }, { new: true });

    if (!receiver) {
      // attempt to rollback sender
      await Wallet.findOneAndUpdate({ walletId: fromWalletId }, { $inc: { balance: amt } });
      return jsonError(res, 404, 'Receiver wallet not found; rolled back');
    }

    await Transaction.create({
      senderWalletId: fromWalletId,
      receiverWalletId: toWalletId,
      amount: amt,
      status: 'completed',
    });

    const updatedSender = await Wallet.findOne({ walletId: fromWalletId }).lean();
    const updatedReceiver = await Wallet.findOne({ walletId: toWalletId }).lean();

    return res.json({ success: true, sender: updatedSender, receiver: updatedReceiver });
  } catch (err) {
    console.error('transfer error (fallback)', err);
    return jsonError(res, 500, 'Transfer failed');
  }
});

// List transactions for a walletId
router.get('/transactions/:walletId', async (req, res) => {
  try {
    const { walletId } = req.params;
    const limit = Math.min(100, Number(req.query.limit) || 20);

    if (!walletId) return jsonError(res, 400, 'walletId is required');

    const transactions = await Transaction.find({
      $or: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, transactions });
  } catch (err) {
    console.error('transactions error', err);
    return jsonError(res, 500, 'Internal server error');
  }
});

// Stats for a walletId: balance, totalSent, totalReceived, txCount
router.get('/stats/:walletId', async (req, res) => {
  try {
    const { walletId } = req.params;
    if (!walletId) return jsonError(res, 400, 'walletId is required');

    const wallet = await Wallet.findOne({ walletId }).lean();
    if (!wallet) return jsonError(res, 404, 'Wallet not found');

    // aggregate totals
    const [sentAgg] = await Transaction.aggregate([
      { $match: { senderWalletId: walletId } },
      { $group: { _id: null, totalSent: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const [recvAgg] = await Transaction.aggregate([
      { $match: { receiverWalletId: walletId } },
      { $group: { _id: null, totalReceived: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const txCount =
      (sentAgg && sentAgg.count ? sentAgg.count : 0) + (recvAgg && recvAgg.count ? recvAgg.count : 0);

    return res.json({
      success: true,
      stats: {
        balance: wallet.balance,
        totalSent: (sentAgg && sentAgg.totalSent) || 0,
        totalReceived: (recvAgg && recvAgg.totalReceived) || 0,
        txCount,
      },
    });
  } catch (err) {
    console.error('stats error', err);
    return jsonError(res, 500, 'Internal server error');
  }
});

export default router;