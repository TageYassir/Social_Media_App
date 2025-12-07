// Converted from Express-style router to Next app route handlers.
// This file implements a minimal dispatch for query-based calls your UI probes:
// - GET /api/crypto?operation=get-wallets&userId=...
// - GET /api/crypto?operation=get-transactions&walletId=... (or userId -> looks up wallet then txs)
// - POST /api/crypto with operation=create-wallet,add-balance,adjust-balance
// Any other operation returns 400 (unsupported).

import mongoose from 'mongoose';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
function jsonError(status, message) {
  return jsonResponse({ success: false, error: message }, status);
}

// Helper to import models (ESM/CommonJS safe)
async function loadModels() {
  const modelsMod = await import('../models').catch(() => null);
  return modelsMod?.default || modelsMod || require('../models');
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const operation = url.searchParams.get('operation') || null;

    const { Wallet, Transaction } = await loadModels();

    if (operation === 'get-wallets' || operation === 'get-wallet') {
      const userId = url.searchParams.get('userId') || null;
      if (!userId) return jsonError(400, 'userId is required');

      // try find one (most of your endpoints return single wallet)
      const wallet = await Wallet.findOne({ userId }).lean();
      if (!wallet) return jsonError(404, 'Wallet not found');
      return jsonResponse({ success: true, wallet });
    }

    if (operation === 'get-transactions') {
      // try walletId first; if userId provided, resolve wallet then return txs
      const walletId = url.searchParams.get('walletId') || null;
      const userId = url.searchParams.get('userId') || null;
      const limit = Math.min(100, Number(url.searchParams.get('limit')) || 20);

      let resolvedWalletId = walletId;
      if (!resolvedWalletId && userId) {
        const wallet = await Wallet.findOne({ userId }).lean();
        resolvedWalletId = wallet?.walletId || null;
        if (!resolvedWalletId) return jsonError(404, 'Wallet not found for user');
      }

      const filter = resolvedWalletId
        ? { $or: [{ senderWalletId: resolvedWalletId }, { receiverWalletId: resolvedWalletId }] }
        : {};

      const transactions = await Transaction.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
      return jsonResponse({ success: true, transactions });
    }

    // If no recognized operation, return helpful 400
    return jsonError(400, 'Unsupported or missing operation query parameter');
  } catch (err) {
    console.error('/api/crypto GET error', err);
    return jsonError(500, 'Internal server error');
  }
}

// Minimal POST handler: support create-wallet, add-balance and adjust-balance
export async function POST(req) {
  try {
    const url = new URL(req.url);
    const operation = url.searchParams.get('operation') || null;
    const body = await req.json().catch(() => ({}));
    const op = operation || body.operation || null;

    const { Wallet, Transaction } = await loadModels();

    if (op === 'create-wallet' || op === 'create') {
      const userId = body.userId || null;
      if (!userId) return jsonError(400, 'userId is required');
      let wallet = await Wallet.findOne({ userId }).lean();
      if (wallet) return jsonResponse({ success: true, wallet });

      // generate simple wallet id
      const walletId = 'w_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
      wallet = await Wallet.create({ walletId, userId, balance: 0 });
      return jsonResponse({ success: true, wallet });
    }

    if (op === 'add-balance' || op === 'topup') {
      const walletId = body.walletId || null;
      const amount = Number(body.amount || 0);
      if (!walletId) return jsonError(400, 'walletId is required');
      if (!amount || isNaN(amount) || amount <= 0) return jsonError(400, 'amount must be a positive number');

      const updated = await Wallet.findOneAndUpdate({ walletId }, { $inc: { balance: amount } }, { new: true }).lean();
      if (!updated) return jsonError(404, 'Wallet not found');
      await Transaction.create({ senderWalletId: 'SYSTEM', receiverWalletId: walletId, amount, status: 'completed' });
      return jsonResponse({ success: true, wallet: updated });
    }

    // NEW: adjust-balance supports positive (add) or negative (subtract) amounts.
    // If subtracting, ensure wallet has sufficient balance (no negative balances).
    if (op === 'adjust-balance' || op === 'adjust') {
      const walletId = body.walletId || null;
      const amount = Number(body.amount);
      if (!walletId) return jsonError(400, 'walletId is required');
      if (!Number.isFinite(amount)) return jsonError(400, 'amount must be a number');

      if (amount === 0) return jsonError(400, 'amount must be non-zero');

      if (amount < 0) {
        // subtract: require enough balance
        const dec = Math.abs(amount);
        const updated = await Wallet.findOneAndUpdate(
          { walletId, balance: { $gte: dec } },
          { $inc: { balance: -dec } },
          { new: true }
        ).lean();
        if (!updated) return jsonError(400, 'Insufficient funds or wallet not found');
        // record transaction: sender is wallet, receiver is SYSTEM (for audit)
        await Transaction.create({ senderWalletId: walletId, receiverWalletId: 'SYSTEM', amount: dec, status: 'completed' });
        return jsonResponse({ success: true, wallet: updated });
      } else {
        // positive adjust: add balance
        const updated = await Wallet.findOneAndUpdate({ walletId }, { $inc: { balance: amount } }, { new: true }).lean();
        if (!updated) return jsonError(404, 'Wallet not found');
        await Transaction.create({ senderWalletId: 'SYSTEM', receiverWalletId: walletId, amount, status: 'completed' });
        return jsonResponse({ success: true, wallet: updated });
      }
    }

    return jsonError(400, 'Unsupported POST operation');
  } catch (err) {
    console.error('/api/crypto POST error', err);
    return jsonError(500, 'Internal server error');
  }
}