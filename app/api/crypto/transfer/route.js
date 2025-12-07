import mongoose from 'mongoose';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
function jsonError(status, message) {
  return jsonResponse({ success: false, error: message }, status);
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fromWalletId, toWalletId, amount } = body || {};
    const amt = Number(amount);
    if (!fromWalletId || !toWalletId) return jsonError(400, 'fromWalletId and toWalletId are required');
    if (fromWalletId === toWalletId) return jsonError(400, 'fromWalletId and toWalletId must be different');
    if (!amt || isNaN(amt) || amt <= 0) return jsonError(400, 'amount must be a positive number');

    // import models
    const modelsMod = await import('../../models').catch(() => null);
    const mod = modelsMod?.default || modelsMod || require('../../models');
    const { Wallet, Transaction } = mod;

    const sessionSupported = typeof mongoose.startSession === 'function';
    if (sessionSupported) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const sender = await Wallet.findOneAndUpdate(
          { walletId: fromWalletId, balance: { $gte: amt } },
          { $inc: { balance: -amt } },
          { new: true, session }
        );
        if (!sender) {
          await session.abortTransaction();
          session.endSession();
          return jsonError(400, 'Insufficient funds or sender not found');
        }

        const receiver = await Wallet.findOneAndUpdate(
          { walletId: toWalletId },
          { $inc: { balance: amt } },
          { new: true, session }
        );
        if (!receiver) {
          await session.abortTransaction();
          session.endSession();
          return jsonError(404, 'Receiver wallet not found');
        }

        await Transaction.create(
          [
            { senderWalletId: fromWalletId, receiverWalletId: toWalletId, amount: amt, status: 'completed' }
          ],
          { session }
        );

        await session.commitTransaction();
        session.endSession();

        const updatedSender = await Wallet.findOne({ walletId: fromWalletId }).lean();
        const updatedReceiver = await Wallet.findOne({ walletId: toWalletId }).lean();

        return jsonResponse({ success: true, sender: updatedSender, receiver: updatedReceiver });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('transfer error (txn)', err);
        return jsonError(500, 'Transfer failed');
      }
    }

    // Fallback: guarded updates with rollback
    try {
      const sender = await Wallet.findOneAndUpdate(
        { walletId: fromWalletId, balance: { $gte: amt } },
        { $inc: { balance: -amt } },
        { new: true }
      );
      if (!sender) return jsonError(400, 'Insufficient funds or sender not found');

      const receiver = await Wallet.findOneAndUpdate(
        { walletId: toWalletId },
        { $inc: { balance: amt } },
        { new: true }
      );
      if (!receiver) {
        await Wallet.findOneAndUpdate({ walletId: fromWalletId }, { $inc: { balance: amt } });
        return jsonError(404, 'Receiver wallet not found; rolled back');
      }

      await Transaction.create({ senderWalletId: fromWalletId, receiverWalletId: toWalletId, amount: amt, status: 'completed' });

      const updatedSender = await Wallet.findOne({ walletId: fromWalletId }).lean();
      const updatedReceiver = await Wallet.findOne({ walletId: toWalletId }).lean();

      return jsonResponse({ success: true, sender: updatedSender, receiver: updatedReceiver });
    } catch (err) {
      console.error('transfer error (fallback)', err);
      return jsonError(500, 'Transfer failed');
    }
  } catch (err) {
    console.error('transfer error', err);
    return jsonError(500, 'Internal server error');
  }
}
