const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const EthersTx =  require("../models.js");

// Provider setup: prefer an env var (INFURA/ALCHEMY or custom RPC), otherwise fall back to default provider
const RPC_URL = process.env.ETH_PROVIDER_URL || null;
const provider = RPC_URL ? new ethers.providers.JsonRpcProvider(RPC_URL) : ethers.getDefaultProvider();

/**
 * GET /api/crypto-ethers/nonce/:address
 * Returns the transaction count (nonce) for an address on the configured network.
 */
router.get('/nonce/:address', async (req, res) => {
  try {
    const address = req.params.address;
    if (!ethers.utils.isAddress(address)) return res.status(400).json({ error: 'Invalid address' });
    const nonce = await provider.getTransactionCount(address);
    res.json({ address, nonce });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get nonce' });
  }
});

/**
 * POST /api/crypto-ethers/record-tx
 * Expected body: { userId, from, to, value, hash, chainId, status }
 * Records a transaction in the DB for auditing / history.
 */
router.post('/record-tx', async (req, res) => {
  try {
    const { userId, from, to, value, hash, chainId, status } = req.body;
    if (!hash || !from || !to) return res.status(400).json({ error: 'Missing fields' });
    const doc = new EthersTx({
      userId: userId || null,
      from,
      to,
      value: value || '0',
      hash,
      chainId: chainId || null,
      status: status || 'pending',
      timestamp: new Date(),
    });
    await doc.save();
    res.json({ ok: true, tx: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record tx' });
  }
});

/**
 * GET /api/crypto-ethers/history/:userId
 * Returns transaction records associated with userId (or query by address)
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const rows = await EthersTx.find({ userId }).sort({ timestamp: -1 }).limit(200).lean().exec();
    res.json({ userId, count: rows.length, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;