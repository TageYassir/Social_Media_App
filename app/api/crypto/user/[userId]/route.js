import mongoose from 'mongoose';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
function jsonError(status, message) {
  return jsonResponse({ success: false, error: message }, status);
}

export async function GET(req, { params }) {
  try {
    const userId = params?.userId || null;
    if (!userId) return jsonError(400, 'userId is required');

    const modelsMod = await import('../../../models').catch(() => null);
    const mod = modelsMod?.default || modelsMod || require('../../../models');
    const { Wallet } = mod;

    const wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) return jsonError(404, 'Wallet not found');
    return jsonResponse({ success: true, wallet });
  } catch (err) {
    console.error('get wallet error', err);
    return jsonError(500, 'Internal server error');
  }
}
