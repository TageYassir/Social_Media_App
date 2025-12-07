import mongoose from 'mongoose';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
function jsonError(status, message) {
  return jsonResponse({ success: false, error: message }, status);
}
function generateWalletId() {
  return 'w_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = (body && body.userId) || null;
    if (!userId) return jsonError(400, 'userId is required');

    // import models (works with both ESM and CommonJS exports)
    const modelsMod = await import('../../models').catch(() => null);
    const mod = modelsMod?.default || modelsMod || require('../../models');
    const { Wallet } = mod;

    let wallet = await Wallet.findOne({ userId }).lean();
    if (wallet) return jsonResponse({ success: true, wallet });

    const walletId = generateWalletId();
    // default balance 10 (frontend expects default 10)
    wallet = await Wallet.create({ walletId, userId, balance: 10 });
    return jsonResponse({ success: true, wallet });
  } catch (err) {
    console.error('create-wallet error', err);
    return jsonError(500, 'Internal server error');
  }
}
