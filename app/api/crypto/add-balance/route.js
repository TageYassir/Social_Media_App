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
    const { walletId, amount } = body || {};
    const amt = Number(amount);
    if (!walletId) return jsonError(400, 'walletId is required');
    if (!amt || isNaN(amt) || amt <= 0) return jsonError(400, 'amount must be a positive number');

    const modelsMod = await import('../../models').catch(() => null);
    const mod = modelsMod?.default || modelsMod || require('../../models');
    const { Wallet, Transaction } = mod;

    const wallet = await Wallet.findOneAndUpdate({ walletId }, { $inc: { balance: amt } }, { new: true }).lean();
    if (!wallet) return jsonError(404, 'Wallet not found');

    await Transaction.create({ senderWalletId: 'SYSTEM', receiverWalletId: walletId, amount: amt, status: 'completed' });

    return jsonResponse({ success: true, wallet });
  } catch (err) {
    console.error('add-balance error', err);
    return jsonError(500, 'Internal server error');
  }
}
