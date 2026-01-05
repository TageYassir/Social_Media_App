"use client";
import React, { useState, useEffect } from "react";
import { Wallet, History, RefreshCcw, LogOut, ArrowRightLeft, ExternalLink, CreditCard, Globe } from "lucide-react";
import ConnectWallet from "./ConnectWallet";
import SendEther from "./SendEther";

// Helper function
const formatAddress = (addr) => {
  if (!addr) return "";
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

export default function CrypthjoPage() {
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');

  useEffect(() => {
    if (session && session.address) {
      fetchHistory(session.address);
    } else {
      setHistory([]);
    }
  }, [session]);

  async function fetchHistory(address) {
    setLoadingHistory(true);
    try {
      // Use REAL blockchain history API
      const res = await fetch(`/api/crypto-ethers/blockchain-history/${encodeURIComponent(address)}`);
      const json = await res.json();
      
      if (json && json.rows) {
        setHistory(json.rows);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  const handleChangeWallet = async () => {
    setSession(null);
    const eth = window?.ethereum;
    if (!eth || !eth.request) return;

    try {
      // Try to revoke permissions
      try {
        await eth.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (e) {
        // Try alternative method
        try {
          await eth.request({
            method: "wallet_revokePermissions",
            params: [{ permissions: ["eth_accounts"] }],
          });
        } catch (e2) {
          // Not supported, just clear local state
        }
      }
    } catch (err) {
      console.error("Wallet change error:", err);
    }
  };

  const getNetworkName = (chainId) => {
    switch (chainId) {
      case 11155111: return 'Sepolia Testnet';
      case 1: return 'Ethereum Mainnet';
      case 5: return 'Goerli Testnet';
      default: return `Chain ${chainId}`;
    }
  };

  return (
    <div className="crypthjo-container">
      {/* INLINE STYLES */}
      <style jsx>{`
        .crypthjo-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: linear-gradient(135deg, #ffffffff 0%, #ffffffff 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .wrapper {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        /* Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 30px 40px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }
        .header-left h1 {
          font-size: 32px;
          font-weight: 800;
          margin: 0;
          background: linear-gradient(135deg, #1565C0 0%, #1565C0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .subtitle {
          font-size: 14px;
          color: #6b7280;
          margin-top: 4px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .wallet-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f9fafb;
          padding: 10px 20px;
          border-radius: 50px;
          border: 1px solid #e5e7eb;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .address-text {
          font-family: monospace;
          font-size: 14px;
          color: #374151;
          font-weight: 600;
        }
        .network-tag {
          background: #dbeafe;
          color: #1565C0;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .change-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: #ef4444;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .change-btn:hover {
          background: #fef2f2;
        }
        /* Main Content */
        .main-content {
          padding: 40px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
        }
        @media (min-width: 1024px) {
          .main-content {
            grid-template-columns: 1fr 1fr;
          }
        }
        /* Cards */
        .card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .card-header {
          padding: 24px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        .card-content {
          padding: 24px;
        }
        /* Balance Card */
        .balance-card {
          background: linear-gradient(135deg, #1565C0 0%, #1565C0 100%);
          color: white;
          border: none;
        }
        .balance-amount {
          font-size: 48px;
          font-weight: 800;
          margin: 20px 0;
          text-align: center;
        }
        .balance-label {
          font-size: 14px;
          opacity: 0.9;
          text-align: center;
        }
        /* Tabs */
        .tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 20px;
        }
        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }
        .tab:hover {
          color: #1565C0;
        }
        .tab.active {
          color: #1565C0;
          border-bottom-color: #1565C0;
        }
        /* History */
        .history-list {
          max-height: 500px;
          overflow-y: auto;
        }
        .history-item {
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.2s;
        }
        .history-item:hover {
          background: #f9fafb;
        }
        .tx-type {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .tx-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }
        .badge-received {
          background: #ecfdf5;
          color: #047857;
        }
        .badge-sent {
          background: #fee2e2;
          color: #dc2626;
        }
        .tx-details {
          font-size: 12px;
          color: #6b7280;
          font-family: monospace;
        }
        .tx-amount {
          font-weight: 700;
          font-size: 16px;
          text-align: right;
        }
        .tx-amount.received {
          color: #059669;
        }
        .tx-amount.sent {
          color: #dc2626;
        }
        .tx-time {
          font-size: 11px;
          color: #9ca3af;
          text-align: right;
        }
        /* Empty States */
        .empty-state {
          padding: 60px 20px;
          text-align: center;
          color: #9ca3af;
        }
        .empty-icon {
          opacity: 0.3;
          margin-bottom: 16px;
        }
        /* Footer */
        .footer {
          padding: 30px 40px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
        .demo-note {
          background: #fef3c7;
          color: #92400e;
          padding: 12px;
          border-radius: 8px;
          margin-top: 20px;
          font-size: 13px;
        }
        .demo-note a {
          color: #92400e;
          font-weight: 600;
          text-decoration: underline;
        }
        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div className="wrapper">
        {/* Header */}
        <div className="page-header">
          <div className="header-left">
            <h1>AymenBTC</h1>
          </div>
          
          <div className="header-right">
            {!session ? (
              <ConnectWallet onConnected={(s) => setSession(s)} />
            ) : (
              <div className="wallet-badge">
                <div className="status-dot" />
                <span className="address-text">{formatAddress(session.address)}</span>
                <div className="network-tag">
                  <Globe size={12} />
                  {getNetworkName(session.chainId)}
                </div>
                <button onClick={handleChangeWallet} className="change-btn">
                  <LogOut size={14} /> Change
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Left Column */}
          <div>
            {/* Balance Card */}
            <div className="card balance-card">
              <div className="card-header">
                <div className="card-title">
                  <CreditCard size={20} />
                  Wallet Balance
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="status-dot" />
                  <span style={{ fontSize: '12px', opacity: 0.9 }}>Connected</span>
                </div>
              </div>
              <div className="card-content">
                {session ? (
                  <>
                    <div className="balance-amount">
                      {session.balanceETH || '0'} ETH
                    </div>
                    <div className="balance-label">
                      Sepolia Test Network • {session.balanceWei ? session.balanceWei.slice(0, 10) + '...' : '0'} wei
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '12px' }}>
                      Connect your wallet to see balance
                    </div>
                    <ConnectWallet onConnected={(s) => setSession(s)} />
                  </div>
                )}
              </div>
            </div>

            {/* Send Ether Card */}
            <div className="card" style={{ marginTop: '30px' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <Wallet size={20} />
                  Send Ether
                </h3>
              </div>
              <div className="card-content">
                {session ? (
                  <SendEther signer={session.signer} address={session.address} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <Wallet size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <div style={{ color: '#6b7280', marginBottom: '20px' }}>
                      Connect your wallet to send transactions
                    </div>
                    <ConnectWallet onConnected={(s) => setSession(s)} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - History */}
          <div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <History size={20} />
                  Transaction History
                </h3>
                {session && (
                  <button 
                    onClick={() => fetchHistory(session.address)}
                    disabled={loadingHistory}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1565C0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    <RefreshCcw size={14} className={loadingHistory ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                )}
              </div>
              
              <div className="card-content">
                {!session ? (
                  <div className="empty-state">
                    <History size={48} className="empty-icon" />
                    <div>Connect your wallet to view transaction history</div>
                  </div>
                ) : loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      border: '3px solid #e5e7eb',
                      borderTop: '3px solid #1565C0',
                      borderRadius: '50%',
                      margin: '0 auto 16px',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <div>Loading transactions from blockchain...</div>
                  </div>
                ) : history.length === 0 ? (
                  <div className="empty-state">
                    <ArrowRightLeft size={48} className="empty-icon" />
                    <div>No transactions found</div>
                    <div style={{ fontSize: '13px', marginTop: '8px' }}>
                      Send a transaction to see it here
                    </div>
                  </div>
                ) : (
                  <div className="tabs">
                    <button 
                      className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
                      onClick={() => setActiveTab('transactions')}
                    >
                      Transactions ({history.length})
                    </button>
                    <button 
                      className={`tab ${activeTab === 'blocks' ? 'active' : ''}`}
                      onClick={() => setActiveTab('blocks')}
                    >
                      Explorer
                    </button>
                  </div>
                )}

                {session && history.length > 0 && activeTab === 'transactions' && (
                  <div className="history-list">
                    {history.map((tx, index) => {
                      const isReceived = tx.to?.toLowerCase() === session.address.toLowerCase();
                      const date = new Date(tx.timestamp);
                      
                      return (
                        <div key={index} className="history-item">
                          <div style={{ flex: 1 }}>
                            <div className="tx-type">
                              <span className={`tx-badge ${isReceived ? 'badge-received' : 'badge-sent'}`}>
                                {isReceived ? "RECEIVED" : "SENT"}
                              </span>
                              <span className="tx-details">
                                Block #{tx.blockNumber || 'Pending'}
                              </span>
                            </div>
                            <div className="tx-details">
                              From: {formatAddress(tx.from)}
                            </div>
                            <div className="tx-details">
                              To: {formatAddress(tx.to)}
                            </div>
                            <div className="tx-time">
                              {date.toLocaleDateString()} {date.toLocaleTimeString()}
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <div className={`tx-amount ${isReceived ? 'received' : 'sent'}`}>
                              {isReceived ? '+' : '-'}{tx.amount} ETH
                            </div>
                            <div style={{ marginTop: '8px' }}>
                              <a 
                                href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '12px',
                                  color: '#1565C0',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  justifyContent: 'flex-end'
                                }}
                              >
                                <ExternalLink size={12} />
                                View
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {session && activeTab === 'blocks' && (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Globe size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <div style={{ marginBottom: '16px', fontWeight: '600' }}>
                      View Full History on Blockchain Explorer
                    </div>
                    <a 
                      href={`https://sepolia.etherscan.io/address/${session.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        background: '#1565C0',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        justifyContent: 'center'
                      }}
                    >
                      <ExternalLink size={16} />
                      Open Sepolia Etherscan
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}