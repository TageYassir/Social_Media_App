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
    if (!walletId) return jsonError(400, 'walletId is required');

    const modelsMod = await import('../../../models').catch(() => null);
    const mod = modelsMod?.default || modelsMod || require('../../../models');
    const { Wallet, Transaction } = mod;

    const wallet = await Wallet.findOne({ walletId }).lean();
    if (!wallet) return jsonError(404, 'Wallet not found');

    const [sentAgg] = await Transaction.aggregate([
      { $match: { senderWalletId: walletId } },
      { $group: { _id: null, totalSent: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const [recvAgg] = await Transaction.aggregate([
      { $match: { receiverWalletId: walletId } },
      { $group: { _id: null, totalReceived: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const txCount = (sentAgg && sentAgg.count ? sentAgg.count : 0) + (recvAgg && recvAgg.count ? recvAgg.count : 0);

    return jsonResponse({
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
    return jsonError(500, 'Internal server error');
  }
}
