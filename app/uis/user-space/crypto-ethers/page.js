"use client";
import React, { useState, useEffect } from "react";
import Layout from "../layout"; // aligns with your project's uis/layout.js
import ConnectWallet from "./ConnectWallet";
import SendEther from "./SendEther";

/**
 * crypthjo page - main UI entry for the new crypto feature.
 * Keeps page logic here and re-uses your app layout.
 */
export default function CrypthjoPage() {
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (session && session.address) {
      fetchHistory(session.address);
    } else {
      setHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function fetchHistory(idOrAddress) {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/crypto-ethers/history/${encodeURIComponent(idOrAddress)}`);
      const json = await res.json();
      if (json && json.rows) setHistory(json.rows);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <Layout>
      <div style={{ padding: 16 }}>
        <h2>crypthjo — MetaMask + ethers integration</h2>

        {/* Replace the disconnect UI with a "Change wallet" action:
            - When no session: show the ConnectWallet component (used to connect).
            - When session exists: show address + "Change wallet" button that clears session
              so user can re-connect with a different wallet/account. */}
        {!session ? (
          <ConnectWallet onConnected={(s) => setSession(s)} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "monospace" }}>{session.address}</div>
            <button
              onClick={async () => {
                // Clear the UI session so user can pick another wallet/account.
                setSession(null);

                const eth = window?.ethereum;
                if (!eth || !eth.request) return;

                try {
                  // Try to revoke the eth_accounts permission (provider may support this).
                  // Try a couple of possible parameter formats then fall back to prompting account picker.
                  let revoked = false;
                  try {
                    await eth.request({
                      method: "wallet_revokePermissions",
                      params: [{ eth_accounts: {} }],
                    });
                    revoked = true;
                  } catch (e1) {
                    try {
                      await eth.request({
                        method: "wallet_revokePermissions",
                        params: [{ permissions: ["eth_accounts"] }],
                      });
                      revoked = true;
                    } catch (e2) {
                      // revoke not supported / failed, will fallback
                    }
                  }

                  if (!revoked) {
                    // Fallback: open the wallet's account selector so user can choose another account
                    try {
                      await eth.request({ method: "eth_requestAccounts" });
                    } catch (pickerErr) {
                      // ignore picker failure
                      console.error("Account picker request failed", pickerErr);
                    }
                  }
                } catch (err) {
                  console.error("Change wallet error:", err);
                }
              }}
            >
              Change wallet
            </button>
          </div>
        )}

        {session && (
          <div style={{ marginTop: 12 }}>
            <SendEther signer={session.signer} address={session.address} />
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <h3>Transaction history</h3>
          {loadingHistory ? (
            <div>Loading...</div>
          ) : history.length === 0 ? (
            <div>No transactions found for connected address or user.</div>
          ) : (
            <ul>
              {history.map((tx) => (
                <li key={tx.hash}>
                  <div>Hash: {tx.hash}</div>
                  <div>From: {tx.from}</div>
                  <div>To: {tx.to}</div>
                  <div>Value (wei): {tx.value}</div>
                  <div>Status: {tx.status}</div>
                  <div>Time: {new Date(tx.timestamp).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}