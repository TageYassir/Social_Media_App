"use client";
import React, { useState } from "react";
import { ethers } from "ethers";

/**
 * SendEther
 * Props:
 *  - signer: ethers.Signer (from ConnectWallet)
 *  - address: string (connected address)
 *
 * This component attempts to be compatible with ethers v5 and v6 signers.
 */
export default function SendEther({ signer, address }) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('0.01'); // ETH
  const [status, setStatus] = useState(null);

  async function send() {
    setStatus('Preparing transaction...');
    if (!signer) {
      setStatus('No signer available - connect wallet first');
      return;
    }

    // Basic validation for receiving address
    try {
      const isAddr = ethers.utils.isAddress(to);
      if (!isAddr) {
        setStatus('Invalid recipient address');
        return;
      }
    } catch (e) {
      // In rare cases utils may be missing if ethers version weird — show clear error
      setStatus('Ethers utils not available: ' + (e.message || e));
      return;
    }

    try {
      const value = ethers.utils.parseEther(amount);
      setStatus('Sending transaction via MetaMask...');
      // signer may be v5 or v6 signer; both expose sendTransaction
      const txResponse = await signer.sendTransaction({ to, value });
      setStatus('Transaction sent. Waiting for confirmation: ' + txResponse.hash);

      // Wait for a confirmation. In v5/v6 txResponse.wait() exists.
      const receipt = await txResponse.wait();
      const confirmed = receipt && (receipt.status === 1 || receipt.status === 0 ? receipt.status === 1 : true);
      setStatus(confirmed ? ('Confirmed in block ' + receipt.blockNumber) : 'Transaction failed');

      // Record transaction on server for history/audit (best-effort)
      try {
        await fetch('/api/crypthjo/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: address,
            from: txResponse.from,
            to: txResponse.to,
            value: value.toString(),
            hash: txResponse.hash,
            chainId: receipt.chainId || null,
            status: confirmed ? 'confirmed' : 'failed',
          }),
        });
      } catch (err) {
        console.warn('Failed to record tx on server (non-fatal):', err);
      }
    } catch (err) {
      console.error(err);
      setStatus('Send failed: ' + (err?.message || err));
    }
  }

  return (
    <div>
      <h4>Send Ether</h4>
      <div>
        <label>To: <input value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div>
        <label>Amount (ETH): <input value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      </div>
      <div>
        <button onClick={send}>Send</button>
      </div>
      {status && <div>{status}</div>}
    </div>
  );
}