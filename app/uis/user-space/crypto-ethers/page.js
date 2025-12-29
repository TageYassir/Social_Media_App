"use client";
import React, { useState, useEffect } from "react";
import { Wallet, History, RefreshCcw, LogOut, ArrowRightLeft, ExternalLink } from "lucide-react";
import ConnectWallet from "./ConnectWallet";
import SendEther from "./SendEther";

// --- HELPERS ---
const formatAddress = (addr) => {
  if (!addr) return "";
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

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

  // Handle Wallet Change Logic
  const handleChangeWallet = async () => {
    setSession(null);
    const eth = window?.ethereum;
    if (!eth || !eth.request) return;

    try {
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
        } catch (e2) { /* not supported */ }
      }

      if (!revoked) {
        try {
          await eth.request({ method: "eth_requestAccounts" });
        } catch (pickerErr) { console.error(pickerErr); }
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="crypthjo-container">
      {/* INLINE STYLES FOR IMMEDIATE FIX 
        (This ensures it looks good even without Tailwind installed)
      */}
      <style jsx>{`
        .crypthjo-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f9fafb;
          min-height: 100vh;
          padding: 40px 20px;
          color: #111827;
        }
        .wrapper {
          max-width: 1000px;
          margin: 0 auto;
        }
        /* Headers */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }
        h2 { font-size: 28px; font-weight: 700; margin: 0; color: #111827; }
        .subtitle { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .brand-highlight { color: #4f46e5; }
        
        /* Wallet Badge */
        .wallet-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          padding: 8px 16px;
          border-radius: 50px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
        .address-text { font-family: monospace; font-size: 14px; color: #374151; }
        .separator { width: 1px; height: 16px; background: #e5e7eb; }
        .change-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; font-weight: 600; color: #ef4444;
          display: flex; align-items: center; gap: 4px;
          padding: 4px 8px; border-radius: 4px;
        }
        .change-btn:hover { background: #fef2f2; }

        /* Main Grid */
        .grid-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 30px;
        }
        @media (min-width: 768px) {
          .grid-layout { grid-template-columns: 350px 1fr; }
        }

        /* Cards */
        .card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .card-padding { padding: 24px; }
        .card-header { 
          display: flex; align-items: center; gap: 8px; 
          font-weight: 600; font-size: 16px; margin-bottom: 20px; 
        }

        /* Send Ether Fixes (Targeting inputs inside the SendEther component) */
        .send-ether-wrapper input {
          width: 100%;
          padding: 10px 12px;
          margin-bottom: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          display: block;
          box-sizing: border-box; /* Fix width issues */
        }
        .send-ether-wrapper button {
          width: 100%;
          background: #4f46e5;
          color: white;
          font-weight: 600;
          padding: 10px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .send-ether-wrapper button:hover { background: #4338ca; }

        /* History List */
        .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .history-list { list-style: none; padding: 0; margin: 0; }
        .history-item {
          padding: 16px 24px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          transition: background 0.2s;
        }
        .history-item:hover { background: #f9fafb; }
        .history-item:last-child { border-bottom: none; }
        
        .tx-badge {
          font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px;
          text-transform: uppercase; letter-spacing: 0.5px; margin-right: 8px;
        }
        .badge-received { background: #ecfdf5; color: #047857; }
        .badge-sent { background: #eef2ff; color: #4338ca; }
        
        .tx-details { font-size: 13px; color: #6b7280; margin-top: 4px; font-family: monospace; }
        .tx-value { font-weight: 600; color: #111827; }
        .tx-sub { font-size: 12px; color: #9ca3af; }
        
        .empty-state {
          padding: 40px; text-align: center; color: #9ca3af;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
      `}</style>

      <div className="wrapper">
        
        {/* Header */}
        <div className="page-header">
          <div>
            <h2><span className="brand-highlight">crypthjo</span></h2>
            <div className="subtitle">MetaMask + Ethers Integration</div>
          </div>

          {!session ? (
            <ConnectWallet onConnected={(s) => setSession(s)} />
          ) : (
            <div className="wallet-badge">
              <div className="status-dot" />
              <span className="address-text">{formatAddress(session.address)}</span>
              <div className="separator" />
              <button onClick={handleChangeWallet} className="change-btn">
                <LogOut size={14} /> Change
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {session && (
          <div className="grid-layout">
            
            {/* Left Column: Send Ether Form */}
            <div className="card card-padding send-ether-wrapper">
              <div className="card-header">
                <Wallet size={20} className="brand-highlight" />
                <span>Transact</span>
              </div>
              <SendEther signer={session.signer} address={session.address} />
            </div>

            {/* Right Column: History */}
            <div className="">
              <div className="history-header">
                <h3 style={{fontSize: '18px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <History size={20} color="#6b7280" />
                  Transaction History
                </h3>
                {loadingHistory && (
                  <span style={{fontSize: '12px', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <RefreshCcw size={12} className="animate-spin" /> Updating...
                  </span>
                )}
              </div>

              <div className="card">
                {loadingHistory && history.length === 0 ? (
                  <div className="empty-state">Loading data...</div>
                ) : history.length === 0 ? (
                  <div className="empty-state">
                    <ArrowRightLeft size={32} style={{opacity: 0.3}} />
                    <span>No transactions found.</span>
                  </div>
                ) : (
                  <div className="history-list">
                    {history.map((tx) => {
                      const isReceived = tx.to?.toLowerCase() === session.address.toLowerCase();
                      return (
                        <div key={tx.hash} className="history-item">
                          <div>
                            <div style={{display: 'flex', alignItems: 'center', marginBottom: '6px'}}>
                              <span className={`tx-badge ${isReceived ? 'badge-received' : 'badge-sent'}`}>
                                {isReceived ? "Received" : "Sent"}
                              </span>
                              <span className="tx-sub">
                                {new Date(tx.timestamp).toLocaleDateString()}
                              </span>
                              <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{marginLeft: '8px', color: '#9ca3af'}}>
                                <ExternalLink size={12} />
                              </a>
                            </div>
                            <div className="tx-details">From: {formatAddress(tx.from)}</div>
                            <div className="tx-details">To: {formatAddress(tx.to)}</div>
                          </div>
                          
                          <div style={{textAlign: 'right'}}>
                            <div className="tx-value">{tx.value} <span style={{fontSize: '10px', fontWeight: 400}}>WEI</span></div>
                            <div className="tx-sub">{tx.status || "Confirmed"}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}