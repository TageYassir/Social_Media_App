import mongoose from 'mongoose';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
function jsonError(status, message) {
  return jsonResponse({ success: false, error: message }, status);
}

export async function GET(req, { params }) {
  try {
    const walletId = params?.walletId || null;
    const url = new URL(req.url);
    const limit = Math.min(100, Number(url.searchParams.get('limit')) || 20);

    if (!walletId) return jsonError(400, 'walletId is required');

    const modelsMod = await import('../../../models').catch(() => null);
    const mod = modelsMod?.default || modelsMod || require('../../../models');
    const { Transaction } = mod;

    const transactions = await Transaction.find({
      $or: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return jsonResponse({ success: true, transactions });
  } catch (err) {
    console.error('transactions error', err);
    return jsonError(500, 'Internal server error');
  }
}
