const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Adjust path to your models file location. models.js should export { Crypto, CryptoTransaction }.
const { Crypto, CryptoTransaction } = require('../models');

// Helper to generate a short unique crypto id
function generateIdCrypto() {
  return (
    'c_' +
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

    let wallet = await Crypto.findOne({ userId }).lean();
    if (wallet) return res.json({ success: true, wallet });

    const idcrypto = generateIdCrypto();
    wallet = await Crypto.create({ idcrypto, userId, balance: 0 });
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

    const wallet = await Crypto.findOne({ userId }).lean();
    if (!wallet) return jsonError(res, 404, 'Wallet not found');
    return res.json({ success: true, wallet });
  } catch (err) {
    console.error('get wallet error', err);
    return jsonError(res, 500, 'Internal server error');
  }
});

// Add balance (system top-up). Records a transaction with fromCrypto=null
router.post('/add-balance', async (req, res) => {
  try {
    const { idcrypto, amount } = req.body || {};
    const amt = Number(amount);
    if (!idcrypto) return jsonError(res, 400, 'idcrypto is required');
    if (!amt || isNaN(amt) || amt <= 0) return jsonError(res, 400, 'amount must be a positive number');

    // Atomic increment
    const wallet = await Crypto.findOneAndUpdate(
      { idcrypto },
      { $inc: { balance: amt } },
      { new: true }
    ).lean();

    if (!wallet) return jsonError(res, 404, 'Wallet not found');

    await CryptoTransaction.create({
      fromCrypto: null,
      toCrypto: idcrypto,
      amount: amt,
      note: 'Top-up',
    });

    return res.json({ success: true, wallet });
  } catch (err) {
    console.error('add-balance error', err);
    return jsonError(res, 500, 'Internal server error');
  }
});

// Transfer from one crypto to another
router.post('/transfer', async (req, res) => {
  const sessionSupported = typeof mongoose.startSession === 'function';
  const { fromCrypto, toCrypto, amount } = req.body || {};
  const amt = Number(amount);

  if (!fromCrypto || !toCrypto) return jsonError(res, 400, 'fromCrypto and toCrypto are required');
  if (fromCrypto === toCrypto) return jsonError(res, 400, 'fromCrypto and toCrypto must be different');
  if (!amt || isNaN(amt) || amt <= 0) return jsonError(res, 400, 'amount must be a positive number');

  // Use transactions if available
  if (sessionSupported) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Decrement sender if sufficient funds
      const sender = await Crypto.findOneAndUpdate(
        { idcrypto: fromCrypto, balance: { $gte: amt } },
        { $inc: { balance: -amt } },
        { new: true, session }
      );

      if (!sender) {
        await session.abortTransaction();
        session.endSession();
        return jsonError(res, 400, 'Insufficient funds or sender not found');
      }

      const receiver = await Crypto.findOneAndUpdate(
        { idcrypto: toCrypto },
        { $inc: { balance: amt } },
        { new: true, session }
      );

      if (!receiver) {
        await session.abortTransaction();
        session.endSession();
        return jsonError(res, 404, 'Receiver wallet not found');
      }

      await CryptoTransaction.create(
        [
          {
            fromCrypto,
            toCrypto,
            amount: amt,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      const updatedSender = await Crypto.findOne({ idcrypto: fromCrypto }).lean();
      const updatedReceiver = await Crypto.findOne({ idcrypto: toCrypto }).lean();

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
    const sender = await Crypto.findOneAndUpdate(
      { idcrypto: fromCrypto, balance: { $gte: amt } },
      { $inc: { balance: -amt } },
      { new: true }
    );

    if (!sender) return jsonError(res, 400, 'Insufficient funds or sender not found');

    const receiver = await Crypto.findOneAndUpdate({ idcrypto: toCrypto }, { $inc: { balance: amt } }, { new: true });

    if (!receiver) {
      // attempt to rollback sender
      await Crypto.findOneAndUpdate({ idcrypto: fromCrypto }, { $inc: { balance: amt } });
      return jsonError(res, 404, 'Receiver wallet not found; rolled back');
    }

    await CryptoTransaction.create({
      fromCrypto,
      toCrypto,
      amount: amt,
    });

    const updatedSender = await Crypto.findOne({ idcrypto: fromCrypto }).lean();
    const updatedReceiver = await Crypto.findOne({ idcrypto: toCrypto }).lean();

    return res.json({ success: true, sender: updatedSender, receiver: updatedReceiver });
  } catch (err) {
    console.error('transfer error (fallback)', err);
    return jsonError(res, 500, 'Transfer failed');
  }
});

// List transactions for an idcrypto
router.get('/transactions/:idcrypto', async (req, res) => {
  try {
    const { idcrypto } = req.params;
    const limit = Math.min(100, Number(req.query.limit) || 20);

    if (!idcrypto) return jsonError(res, 400, 'idcrypto is required');

    const transactions = await CryptoTransaction.find({
      $or: [{ fromCrypto: idcrypto }, { toCrypto: idcrypto }],
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

// Stats for an idcrypto: balance, totalSent, totalReceived, txCount
router.get('/stats/:idcrypto', async (req, res) => {
  try {
    const { idcrypto } = req.params;
    if (!idcrypto) return jsonError(res, 400, 'idcrypto is required');

    const wallet = await Crypto.findOne({ idcrypto }).lean();
    if (!wallet) return jsonError(res, 404, 'Wallet not found');

    // aggregate totals
    const [sentAgg] = await CryptoTransaction.aggregate([
      { $match: { fromCrypto: idcrypto } },
      { $group: { _id: null, totalSent: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const [recvAgg] = await CryptoTransaction.aggregate([
      { $match: { toCrypto: idcrypto } },
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

module.exports = router;