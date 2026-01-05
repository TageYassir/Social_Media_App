"use client";
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

/**
 * Helper: create a web3 provider that works with ethers v5 and v6.
 */
function createWeb3Provider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected Ethereum provider (window.ethereum) found");
  }

  if (ethers && ethers.providers && ethers.providers.Web3Provider) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }

  if (ethers && ethers.BrowserProvider) {
    return new ethers.BrowserProvider(window.ethereum);
  }

  throw new Error("Unsupported ethers version. Install ethers@^5 or update compatibility code.");
}

/**
 * Ensure we're connected to Sepolia testnet (for school project)
 */
async function ensureSepoliaNetwork() {
  if (!window.ethereum) return false;
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    
    // Sepolia chain ID: 11155111 (0xaa36a7 in hex)
    if (chainId !== '0xaa36a7') { 
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
        return true;
      } catch (switchError) {
        // If Sepolia not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Test Network',
              rpcUrls: ['https://rpc.sepolia.org'],
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18
              },
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
          return true;
        }
        console.error('Switch network error:', switchError);
        return false;
      }
    }
    return true; // Already on Sepolia
  } catch (error) {
    console.error('Network check error:', error);
    return false;
  }
}

/**
 * Format balance from wei to ETH
 */
function formatBalance(balanceWei) {
  if (!balanceWei) return '0';
  
  try {
    // Try v6 first
    if (ethers.formatEther) {
      return parseFloat(ethers.formatEther(balanceWei)).toFixed(4);
    }
    // Fallback to v5
    if (ethers.utils && ethers.utils.formatEther) {
      return parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(4);
    }
    // Last resort
    return (parseInt(balanceWei) / 1e18).toFixed(4);
  } catch (e) {
    return '0';
  }
}

/**
 * ConnectWallet Component
 */
export default function ConnectWallet({ onConnected, allowDisconnect = true }) {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [balanceETH, setBalanceETH] = useState('0');
  const [chainId, setChainId] = useState(null);
  const [networkName, setNetworkName] = useState('Not Connected');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (!window.ethereum) {
      setError("⚠️ MetaMask / Ethereum provider not found in browser");
      return;
    }

    const handleAccounts = (accounts) => {
      if (!accounts || accounts.length === 0) {
        clearLocalSession();
        return;
      }
      connectUsingAddress(accounts[0]).catch((e) => {
        console.error("connectUsingAddress error on accountsChanged:", e);
      });
    };

    const handleChainChanged = (newChainId) => {
      console.log('Chain changed to:', newChainId);
      window.location.reload(); // Simple reload for chain changes
    };

    // Initial check
    window.ethereum
      .request({ method: "eth_accounts" })
      .then(handleAccounts)
      .catch(() => {
        /* ignore initial permission error */
      });

    // Event listeners
    window.ethereum.on && window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on && window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccounts);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  async function connect() {
    setError(null);
    setLoading(true);
    
    if (!window.ethereum) {
      setError("⚠️ MetaMask not installed. Please install MetaMask first.");
      setLoading(false);
      return;
    }
    
    try {
      // 1. Ensure Sepolia network (for school project)
      const switched = await ensureSepoliaNetwork();
      if (!switched) {
        setError("⚠️ Please switch to Sepolia testnet in MetaMask");
        setLoading(false);
        return;
      }
      
      // 2. Request account access
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      
      if (accounts && accounts[0]) {
        await connectUsingAddress(accounts[0]);
      }
    } catch (err) {
      setError(err?.message || "❌ User rejected connection request");
    } finally {
      setLoading(false);
    }
  }

  function clearLocalSession() {
    setAddress(null);
    setBalance(null);
    setBalanceETH('0');
    setChainId(null);
    setNetworkName('Not Connected');
    setError(null);
    if (onConnected) onConnected(null);
  }

  async function disconnect() {
    clearLocalSession();
    
    try {
      if (window.ethereum && window.ethereum.request) {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (e) {
      // Not all wallets support programmatic revocation
      console.debug("Permission revocation not supported:", e?.message || e);
    }
  }

  async function connectUsingAddress(addr) {
    try {
      const web3Provider = createWeb3Provider();

      // Get signer
      const signer = web3Provider.getSigner ? await web3Provider.getSigner() : null;
      
      // Get balance
      const balanceWei = await web3Provider.getBalance(addr);
      const formattedBalance = formatBalance(balanceWei);
      
      // Get network
      const network = await web3Provider.getNetwork();
      
      // Set states
      const normalizedAddr = ethers.getAddress ? ethers.getAddress(addr) : addr;
      setAddress(normalizedAddr);
      setBalance(balanceWei?.toString ? balanceWei.toString() : String(balanceWei));
      setBalanceETH(formattedBalance);
      setChainId(network?.chainId ?? null);
      setNetworkName(network?.name || 'Unknown Network');

      // Callback
      if (onConnected) {
        onConnected({ 
          provider: web3Provider, 
          signer, 
          address: normalizedAddr, 
          balanceWei: balanceWei?.toString ? balanceWei.toString() : String(balanceWei),
          balanceETH: formattedBalance,
          chainId: network?.chainId ?? null,
          networkName: network?.name || 'Unknown'
        });
      }
    } catch (err) {
      console.error("Failed to connect:", err);
      setError("❌ Connection failed: " + (err?.message || err));
    }
  }

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="connect-wallet-container">
      <style jsx>{`
        .connect-wallet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .wallet-connected {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          max-width: 400px;
        }
        .wallet-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f3f4f6;
        }
        .wallet-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 14px;
        }
        .wallet-value {
          font-family: monospace;
          color: #111827;
          font-size: 14px;
        }
        .balance-eth {
          font-size: 24px;
          font-weight: 700;
          color: #059669;
          text-align: center;
          margin: 15px 0;
        }
        .address-box {
          background: #f9fafb;
          padding: 10px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 14px;
          margin: 10px 0;
          word-break: break-all;
        }
        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .connect-button, .action-button {
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }
        .connect-button {
          background: #1565C0;
          color: white;
        }
        .connect-button:hover:not(:disabled) {
          background: #1565C0;
        }
        .connect-button:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
        }
        .copy-button {
          background: #6b7280;
          color: white;
        }
        .copy-button:hover {
          background: #4b5563;
        }
        .disconnect-button {
          background: #ef4444;
          color: white;
        }
        .disconnect-button:hover {
          background: #dc2626;
        }
        .error-message {
          color: #dc2626;
          background: #fef2f2;
          padding: 12px;
          border-radius: 8px;
          margin-top: 10px;
          font-size: 14px;
        }
        .info-message {
          color: #6b7280;
          font-size: 12px;
          margin-top: 10px;
          text-align: center;
        }
        .network-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        }
      `}</style>

      {address ? (
        <div className="wallet-connected">
          <h3 style={{ margin: '0 0 15px 0', color: '#111827' }}>
            MetaMask Connected
            <span className="network-badge">
              {networkName.includes('Sepolia') ? 'Sepolia' : networkName}
            </span>
          </h3>
          
          <div className="balance-eth">{balanceETH} ETH</div>
          
          <div className="address-box">
            {address}
          </div>
          
          <div className="wallet-info-row">
            <span className="wallet-label">Chain ID:</span>
            <span className="wallet-value">{chainId || 'Unknown'}</span>
          </div>
          
          <div className="wallet-info-row">
            <span className="wallet-label">Balance (wei):</span>
            <span className="wallet-value">{balance ? balance.slice(0, 10) + '...' : '0'}</span>
          </div>
          
          <div className="button-group">
            <button 
              onClick={() => navigator.clipboard.writeText(address)}
              className="action-button copy-button"
            >
              Copy Address
            </button>
            
            {allowDisconnect && (
              <button 
                onClick={disconnect}
                className="action-button disconnect-button"
              >
                Disconnect
              </button>
            )}
          </div>
          
          <div className="info-message">
            Using Sepolia testnet. Get free test ETH from sepoliafaucet.com
          </div>
        </div>
      ) : (
        <div>
          <button 
            onClick={connect} 
            disabled={loading}
            className="connect-button"
          >
            {loading ? (
              <>
                <span style={{ marginRight: '8px' }}>⏳</span>
                Connecting...
              </>
            ) : (
              'Connect MetaMask'
            )}
          </button>
          
          {error && (
            <div className="error-message">
              {error}
              {error.includes('MetaMask not installed') && (
                <div style={{ marginTop: '8px' }}>
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#1565C0', textDecoration: 'underline' }}
                  >
                    Download MetaMask
                  </a>
                </div>
              )}
            </div>
          )}
          
          <div className="info-message">
            For school project testing on Sepolia testnet
          </div>
        </div>
      )}
    </div>
  );
}