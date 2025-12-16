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
 * ConnectWallet
 * Props:
 *  - onConnected({ provider, signer, address, balanceWei, chainId })
 *  - allowDisconnect (optional boolean) - if true, shows a local "Disconnect" button
 */
export default function ConnectWallet({ onConnected, allowDisconnect = true }) {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.ethereum) {
      setError("MetaMask / Ethereum provider not found in browser");
      return;
    }

    const handleAccounts = (accounts) => {
      if (!accounts || accounts.length === 0) {
        // user disconnected in wallet UI or no account available
        clearLocalSession();
        return;
      }
      connectUsingAddress(accounts[0]).catch((e) => {
        console.error("connectUsingAddress error on accountsChanged:", e);
      });
    };

    // initial check
    window.ethereum
      .request({ method: "eth_accounts" })
      .then(handleAccounts)
      .catch(() => {
        /* ignore initial permission error */
      });

    window.ethereum.on && window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on && window.ethereum.on("chainChanged", () => window.location.reload());

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccounts);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask / Ethereum provider not found in browser");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts[0]) {
        await connectUsingAddress(accounts[0]);
      }
    } catch (err) {
      setError(err?.message || "User rejected request");
    }
  }

  function clearLocalSession() {
    setAddress(null);
    setBalance(null);
    setChainId(null);
    setError(null);
    if (onConnected) onConnected(null);
  }

  async function disconnect() {
    // Clear app state; full permission revocation must be done in wallet UI.
    clearLocalSession();

    try {
      if (window.ethereum && window.ethereum.request) {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (e) {
      // ignore - not all wallets support programmatic revocation
      console.debug("wallet_requestPermissions (revoke) not supported or failed:", e?.message || e);
    }
  }

  async function connectUsingAddress(addr) {
    try {
      const web3Provider = createWeb3Provider();

      // getSigner exists for v5 and v6 providers
      const signer = web3Provider.getSigner ? web3Provider.getSigner() : null;
      const balanceWei = await web3Provider.getBalance(addr);
      const network = await web3Provider.getNetwork();

      const normalizedAddr = addr;
      setAddress(normalizedAddr);
      setBalance(balanceWei?.toString ? balanceWei.toString() : String(balanceWei));
      setChainId(network?.chainId ?? null);

      if (onConnected) onConnected({ provider: web3Provider, signer, address: normalizedAddr, balanceWei: balanceWei?.toString ? balanceWei.toString() : String(balanceWei), chainId: network?.chainId ?? null });
    } catch (err) {
      console.error("Failed to connect:", err);
      setError("Failed to connect: " + (err?.message || err));
    }
  }

  return (
    <div>
      {address ? (
        <div>
          <div>Connected: {address}</div>
          <div>Balance (wei): {balance}</div>
          <div>Chain ID: {chainId}</div>

          <div style={{ marginTop: 8 }}>
            <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(address); }}>
              Copy address
            </button>

            {allowDisconnect && (
              <button style={{ marginLeft: 8 }} onClick={disconnect}>
                Disconnect
              </button>
            )}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
            Note: "Disconnect" clears the app's local connection state. To fully revoke permissions, disconnect from the wallet extension UI.
          </div>
        </div>
      ) : (
        <div>
          <button onClick={connect}>Connect MetaMask</button>
          {error && <div style={{ color: "red", marginTop: 6 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}