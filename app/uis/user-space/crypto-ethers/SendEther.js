"use client";
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Send, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

export default function SendEther({ signer, address }) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('0.001');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gasEstimate, setGasEstimate] = useState(null);
  const [recipientValid, setRecipientValid] = useState(null);

  // Validate recipient address on change
  useEffect(() => {
    if (!to || to.length < 10) {
      setRecipientValid(null);
      return;
    }

    try {
      let isValid = false;
      
      // Try v6 first
      if (ethers.isAddress) {
        isValid = ethers.isAddress(to);
      } 
      // Fallback to v5
      else if (ethers.utils && ethers.utils.isAddress) {
        isValid = ethers.utils.isAddress(to);
      }
      
      setRecipientValid(isValid);
      
      // If valid, estimate gas
      if (isValid && signer && amount && parseFloat(amount) > 0) {
        estimateGas();
      } else {
        setGasEstimate(null);
      }
    } catch (e) {
      setRecipientValid(false);
    }
  }, [to, amount, signer]);

  async function estimateGas() {
    try {
      let value;
      if (ethers.parseEther) {
        value = ethers.parseEther(amount);
      } else if (ethers.utils && ethers.utils.parseEther) {
        value = ethers.utils.parseEther(amount);
      } else {
        return;
      }

      const gasEstimate = await signer.estimateGas({
        to: to,
        value: value
      });
      
      // Get gas price
      const provider = signer.provider;
      const gasPrice = await provider.getGasPrice();
      
      // Calculate total cost
      const gasCost = gasEstimate * gasPrice;
      const gasCostETH = ethers.formatEther ? ethers.formatEther(gasCost) : (parseInt(gasCost) / 1e18).toFixed(6);
      
      setGasEstimate({
        gasLimit: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        estimatedCost: gasCostETH,
        total: (parseFloat(amount) + parseFloat(gasCostETH)).toFixed(6)
      });
    } catch (error) {
      console.log('Gas estimation failed:', error.message);
      setGasEstimate(null);
    }
  }

  async function send() {
    if (loading) return;
    
    setStatus(null);
    setLoading(true);
    
    // Validate inputs
    if (!signer) {
      setStatus({ type: 'error', message: 'No signer available. Please connect wallet first.' });
      setLoading(false);
      return;
    }
    
    if (!recipientValid) {
      setStatus({ type: 'error', message: 'Invalid recipient Ethereum address.' });
      setLoading(false);
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setStatus({ type: 'error', message: 'Amount must be greater than 0.' });
      setLoading(false);
      return;
    }

    try {
      // Parse amount to wei
      let value;
      if (ethers.parseEther) {
        value = ethers.parseEther(amount); // v6
      } else if (ethers.utils && ethers.utils.parseEther) {
        value = ethers.utils.parseEther(amount); // v5
      } else {
        setStatus({ type: 'error', message: 'Ethers library version incompatible.' });
        setLoading(false);
        return;
      }

      setStatus({ type: 'info', message: 'Preparing transaction...' });

      // Send transaction
      const txResponse = await signer.sendTransaction({
        to: to,
        value: value,
        chainId: 11155111 // Force Sepolia
      });
      
      setStatus({ 
        type: 'info', 
        message: `Transaction sent! Hash: ${txResponse.hash}\nWaiting for confirmation...` 
      });

      // Record in database (for school project history)
      try {
        await fetch('/api/crypto-ethers/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: address,
            to: to,
            amount: amount,
            amountWei: value.toString(),
            txHash: txResponse.hash,
            network: 'sepolia',
            status: 'pending',
            timestamp: new Date().toISOString()
          }),
        });
      } catch (dbError) {
        console.warn('Failed to save to database (non-critical):', dbError);
      }

      // Wait for confirmation
      setStatus({ type: 'info', message: '⏳ Waiting for blockchain confirmation...' });
      
      const receipt = await txResponse.wait();
      
      // Update database with confirmation
      try {
        await fetch('/api/crypto-ethers/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: address,
            to: to,
            amount: amount,
            amountWei: value.toString(),
            txHash: txResponse.hash,
            network: 'sepolia',
            status: receipt.status === 1 ? 'confirmed' : 'failed',
            blockNumber: receipt.blockNumber,
            timestamp: new Date().toISOString()
          }),
        });
      } catch (dbError) {
        console.warn('Failed to update transaction status:', dbError);
      }

      if (receipt && receipt.status === 1) {
        setStatus({ 
          type: 'success', 
          message: `✅ Transaction confirmed in block ${receipt.blockNumber}!`,
          hash: txResponse.hash
        });
        
        // Clear form on success
        setTimeout(() => {
          setTo('');
          setAmount('0.001');
        }, 3000);
      } else {
        setStatus({ type: 'error', message: '❌ Transaction failed or reverted.' });
      }

    } catch (err) {
      console.error('Transaction error:', err);
      
      let errorMessage = err.message || 'Unknown error';
      
      // User-friendly error messages
      if (errorMessage.includes('user rejected') || errorMessage.includes('rejected')) {
        errorMessage = 'Transaction rejected by user in MetaMask';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient balance for transaction and gas fees';
      } else if (errorMessage.includes('gas')) {
        errorMessage = 'Gas estimation failed. Try adjusting amount.';
      }
      
      setStatus({ type: 'error', message: `❌ ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  }

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="send-ether-container">
      <style jsx>{`
        .send-ether-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .form-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
          color: #111827;
          font-size: 20px;
          font-weight: 600;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }
        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .form-input:focus {
          outline: none;
          border-color: #1565C0;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        .form-input.invalid {
          border-color: #ef4444;
          background-color: #fef2f2;
        }
        .form-input.valid {
          border-color: #10b981;
          background-color: #f0fdf4;
        }
        .validation-message {
          font-size: 12px;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .validation-valid {
          color: #10b981;
        }
        .validation-invalid {
          color: #ef4444;
        }
        .gas-estimate {
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          margin: 16px 0;
          font-size: 13px;
        }
        .gas-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .gas-label {
          color: #6b7280;
        }
        .gas-value {
          font-family: monospace;
          font-weight: 600;
        }
        .send-button {
          width: 100%;
          padding: 16px;
          background: #1565C0;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }
        .send-button:hover:not(:disabled) {
          background: #1565C0;
        }
        .send-button:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
        }
        .status-box {
          margin-top: 20px;
          padding: 16px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
        }
        .status-info {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #93c5fd;
        }
        .status-success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .status-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }
        .tx-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #1565C0;
          text-decoration: none;
          margin-top: 8px;
          font-weight: 600;
        }
        .tx-link:hover {
          text-decoration: underline;
        }
        .demo-note {
          font-size: 12px;
          color: #6b7280;
          margin-top: 8px;
          text-align: center;
          font-style: italic;
        }
      `}</style>

      <div className="form-title">
        <Send size={24} />
        Send ETH (Sepolia Testnet)
      </div>

      <div className="form-group">
        <label className="form-label">Your Address (Sender)</label>
        <input 
          type="text" 
          value={address || 'Not connected'}
          readOnly
          className="form-input"
          style={{ background: '#f9fafb', color: '#6b7280' }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Recipient Address</label>
        <input 
          type="text" 
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x742d35Cc6634C0532925a3b844Bc9e..."
          className={`form-input ${recipientValid === true ? 'valid' : recipientValid === false ? 'invalid' : ''}`}
          disabled={!signer}
        />
        {recipientValid === true && (
          <div className="validation-message validation-valid">
            <CheckCircle size={12} />
            Valid Ethereum address
          </div>
        )}
        {recipientValid === false && (
          <div className="validation-message validation-invalid">
            <AlertCircle size={12} />
            Invalid Ethereum address
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Amount (ETH)</label>
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0.000001"
          step="0.001"
          className="form-input"
          disabled={!signer}
        />
        <div className="demo-note">
          Recommended: 0.001 ETH for testing
        </div>
      </div>

      {gasEstimate && (
        <div className="gas-estimate">
          <div className="gas-row">
            <span className="gas-label">Amount:</span>
            <span className="gas-value">{amount} ETH</span>
          </div>
          <div className="gas-row">
            <span className="gas-label">Gas Estimate:</span>
            <span className="gas-value">~{gasEstimate.estimatedCost} ETH</span>
          </div>
          <div className="gas-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
            <span className="gas-label" style={{ fontWeight: '600' }}>Total:</span>
            <span className="gas-value" style={{ color: '#059669', fontWeight: '700' }}>
              {gasEstimate.total} ETH
            </span>
          </div>
        </div>
      )}

      <button 
        onClick={send} 
        disabled={!signer || !recipientValid || loading || !amount || parseFloat(amount) <= 0}
        className="send-button"
      >
        {loading ? (
          <>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              border: '2px solid white',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Processing...
          </>
        ) : (
          <>
            <Send size={18} />
            Send Transaction
          </>
        )}
      </button>

      {status && (
        <div className={`status-box status-${status.type}`}>
          {status.message.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          
          {status.hash && (
            <a 
              href={`https://sepolia.etherscan.io/tx/${status.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              <ExternalLink size={14} />
              View on Etherscan
            </a>
          )}
        </div>
      )}

      <div className="demo-note">
        This sends REAL test ETH on Sepolia network. Get free test ETH from sepoliafaucet.com
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}