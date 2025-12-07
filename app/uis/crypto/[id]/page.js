'use client'

import React, { useEffect, useState } from 'react';

/*
  Minimal wallet/send UI
  - Detects a connected user id (cookie / window / localStorage heuristics)
  - Allows the user to create a single wallet (one wallet per user) with default balance 10
  - Shows wallet id and balance
  - Provides two inputs: recipient wallet id and amount, and a Send button
  - Uses localStorage for persistence and attempts to POST to /api/wallets/create-wallet when creating
*/

export default function CryptoDetailSimple() {
  const [userId, setUserId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // new state: transactions (chart removed)
  const [transactions, setTransactions] = useState([]);

  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';
  const COOKIE_KEY = 'userId';

  // small resilient API helpers
  async function tryFetchJson(path, opts = {}) {
    try {
      const res = await fetch(path, { credentials: 'same-origin', ...opts });
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch (e) { return null; }
  }
  async function tryPostJson(path, body) {
    try {
      const res = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch (e) { return null; }
  }

  // simple detection heuristics (cookie / window globals / localStorage)
  function getUserIdFromCookie() {
    if (!hasDocument) return null;
    try {
      const m = document.cookie.match(/(?:^|;\s*)userId=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) {
      return null;
    }
  }
  function getUserIdFromWindow() {
    if (!hasWindow) return null;
    try {
      if (window.__USER_ID__) return window.__USER_ID__;
      if (window.__NEXT_DATA__) {
        const nd = window.__NEXT_DATA__;
        return nd.props?.pageProps?.user?.id || nd.props?.pageProps?.userId || nd.props?.pageProps?.user?._id || null;
      }
      if (window.app && window.app.currentUser) {
        return window.app.currentUser.id || window.app.currentUser.userId || null;
      }
    } catch (e) {}
    return null;
  }

  // Prefer explicit authenticated user objects saved by the login page.
  // Look for JSON objects first (user, currentUser, auth, appUser), then simple keys.
  function getUserIdFromStorage() {
    if (!hasWindow) return null;
    try {
      const jsonKeys = ['user', 'currentUser', 'auth', 'appUser'];
      for (const k of jsonKeys) {
        try {
          const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (raw && raw.trim().startsWith('{')) {
            try {
              const p = JSON.parse(raw);
              const id = p?.id || p?._id || p?.userId || p?.user?.id || p?.user?._id || null;
              if (id) return String(id);
            } catch (e) {}
          }
        } catch (e) {}
      }

      // fallback to simple stored ids
      const keys = ['userId', 'connectedUserId', 'currentUserId'];
      for (const k of keys) {
        try {
          const v = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (v) return v;
        } catch (e) {}
      }
    } catch (e) {}
    return null;
  }

  // find wallet by walletId — ONLY try server APIs now (removed localStorage scan)
  async function findWalletByWalletId(walletId) {
    if (!walletId) return null;
    const candidates = [
      `/api/crypto/wallets/${encodeURIComponent(walletId)}`,
      `/api/crypto/wallet/${encodeURIComponent(walletId)}`,
      `/api/crypto/by-wallet-id/${encodeURIComponent(walletId)}`,
      `/api/crypto?walletId=${encodeURIComponent(walletId)}`,
      `/api/wallets/${encodeURIComponent(walletId)}`,
      `/api/wallets/by-wallet-id/${encodeURIComponent(walletId)}`,
      `/api/wallets/wallet/${encodeURIComponent(walletId)}`,
      `/api/wallets?walletId=${encodeURIComponent(walletId)}`,
    ];
    for (const p of candidates) {
      try {
        const json = await tryFetchJson(p);
        if (!json) continue;
        const wallet = json?.wallet || json?.data || (typeof json === 'object' && !Array.isArray(json) ? json : null);
        if (wallet && (wallet.walletId || wallet.id || wallet._id)) {
          return { key: null, wallet };
        }
      } catch (e) {}
    }
    return null;
  }

  // helper: load transactions for user/wallet (resilient endpoints)
  async function loadTransactionsFor(userIdParam, walletIdParam) {
    if (!userIdParam && !walletIdParam) return setTransactions([]);
    const candidates = [
      `/api/crypto/transactions?userId=${encodeURIComponent(String(userIdParam || ''))}`,
      `/api/crypto/transactions?walletId=${encodeURIComponent(String(walletIdParam || ''))}`,
      `/api/transactions?userId=${encodeURIComponent(String(userIdParam || ''))}`,
      `/api/transactions?walletId=${encodeURIComponent(String(walletIdParam || ''))}`,
      `/api/crypto/wallets/${encodeURIComponent(String(walletIdParam))}/transactions`,
      `/api/wallets/${encodeURIComponent(String(walletIdParam))}/transactions`,
      `/api/users/${encodeURIComponent(String(userIdParam))}/transactions`,
      `/api/transactions/user/${encodeURIComponent(String(userIdParam))}`
    ];
    for (const p of candidates) {
      try {
        const json = await tryFetchJson(p);
        if (!json) continue;
        // normalize: array or { transactions: [...]} or { data: [...] }
        const arr = Array.isArray(json) ? json : (json.transactions || json.data || json.items || null);
        if (Array.isArray(arr) && arr.length) {
          // normalize each tx
          const norm = arr.map(tx => ({
            id: tx.id || tx._id || tx.transactionId || tx.txId || String(Math.random()).slice(2),
            amount: Number(tx.amount ?? tx.value ?? 0),
            fromWalletId: tx.fromWalletId || tx.from || tx.sender || null,
            toWalletId: tx.toWalletId || tx.to || tx.receiver || null,
            status: tx.status || (tx.success ? 'ok' : 'unknown'),
            createdAt: tx.createdAt || tx.timestamp || tx.date || tx.time || null,
            raw: tx
          }));
          // sort desc by date
          norm.sort((a,b) => (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0)));
          setTransactions(norm);
          return;
        }
      } catch (e) {
        // try next
      }
    }
    // no transactions found
    setTransactions([]);
  }

  // load connected user and wallet on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      // prefer authenticated storage (login page). fall back to window/cookie heuristics.
      const fromStorage = getUserIdFromStorage();
      const fromWindow = getUserIdFromWindow();
      const fromCookie = getUserIdFromCookie();
      const detected = fromStorage || fromWindow || fromCookie || null;
       if (!mounted) return;
       if (detected) {
         setUserId(String(detected));
         // stop persisting detected id into localStorage — removed local write
       } else {
         setUserId(null);
       }
 
       if (detected) {
         // attempt to load the wallet from server APIs first (try /api/crypto first)
         setLoading(true);
         let loaded = null;
         try {
           const pCandidates = [
             `/api/crypto/user/${encodeURIComponent(String(detected))}`,
             `/api/crypto/wallets/user/${encodeURIComponent(String(detected))}`,
             `/api/crypto/user-wallets/${encodeURIComponent(String(detected))}`,
             `/api/crypto/wallets?userId=${encodeURIComponent(String(detected))}`,
             `/api/wallets/user/${encodeURIComponent(String(detected))}`,
             `/api/wallet/user/${encodeURIComponent(String(detected))}`,
             `/api/users/${encodeURIComponent(String(detected))}/wallets`,
             `/api/wallets?userId=${encodeURIComponent(String(detected))}`,
           ];
           for (const p of pCandidates) {
             const json = await tryFetchJson(p);
             if (!json) continue;
             // shapes: { wallet }, { wallets: [...] }, array
             const walletObj = json?.wallet || (Array.isArray(json) && json[0]) || json?.data || json?.wallets || null;
             if (walletObj) {
               const w = walletObj.walletId ? walletObj : { ...walletObj, walletId: walletObj.walletId || walletObj.id || walletObj._id };
               loaded = w;
               break;
             }
           }
         } catch (e) { /* ignore API load error */ }
         finally { setLoading(false); }

         if (loaded) {
           setWallet(loaded);
         } else {
           // Do not fall back to localStorage; rely on DB. Show null wallet if not found.
           setWallet(null);
         }
       }
     })();
     return () => { mounted = false; };
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

  // when wallet/user changes, load transactions
  useEffect(() => {
    if (wallet || userId) {
      loadTransactionsFor(userId, wallet?.walletId);
    } else {
      setTransactions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, userId]);

  // create wallet (use server only; do not persist to localStorage)
  async function handleCreateWallet() {
    if (!userId) {
      setMessage({ type: 'error', text: 'No connected user detected.' });
      return;
    }

    setMessage(null);
    setLoading(true);
    // try server create endpoints first (and check exist)
    try {
      const existChecks = [
        `/api/crypto/wallets?userId=${encodeURIComponent(userId)}`,
        `/api/crypto/user/${encodeURIComponent(userId)}`,
        `/api/crypto/wallets/user/${encodeURIComponent(userId)}`,
        `/api/wallets/user/${encodeURIComponent(userId)}`,
        `/api/wallet/user/${encodeURIComponent(userId)}`,
        `/api/wallets?userId=${encodeURIComponent(userId)}`,
      ];
      for (const p of existChecks) {
        const j = await tryFetchJson(p);
        const existing = j?.wallet || (Array.isArray(j) && j[0]) || j?.data || null;
        if (existing) {
          const normalized = existing.walletId ? existing : { ...existing, walletId: existing.walletId || existing.id || existing._id };
          setWallet(normalized);
          setMessage({ type: 'info', text: 'You already have a wallet (from server).' });
          setLoading(false);
          return;
        }
      }

      const createCandidates = [
        '/api/crypto/create-wallet',
        '/api/crypto/wallets/create-wallet',
        '/api/crypto/wallets',
        '/api/crypto/wallet/create',
        '/api/wallets/create-wallet',
        '/api/wallets',
        '/api/wallet/create'
      ];
      for (const p of createCandidates) {
        const resp = await tryPostJson(p, { userId });
        const newWallet = resp?.wallet || resp?.data || resp || null;
        if (newWallet && (newWallet.walletId || newWallet.id || newWallet._id)) {
          const normalized = newWallet.walletId ? newWallet : { ...newWallet, walletId: newWallet.walletId || newWallet.id || newWallet._id };
          // verify persistence by fetching from server by walletId or userId
          let verified = null;
          try {
            if (normalized.walletId) {
              verified = await tryFetchJson(`/api/crypto/wallets/${encodeURIComponent(normalized.walletId)}`);
              if (verified && verified.wallet) verified = verified.wallet;
            }
            if (!verified) {
              // try user lookup
              verified = await tryFetchJson(`/api/crypto/user/${encodeURIComponent(userId)}`);
              if (verified && verified.wallet) verified = verified.wallet;
            }
            if (!verified) {
              verified = await tryFetchJson(`/api/wallets/user/${encodeURIComponent(userId)}`);
              if (verified && verified.wallet) verified = verified.wallet;
            }
          } catch (e) { verified = null; }

          if (verified && (verified.walletId || verified.id || verified._id)) {
            const v = verified.walletId ? verified : { ...verified, walletId: verified.walletId || verified.id || verified._id };
            setWallet(v);
            setMessage({ type: 'success', text: `Wallet created and verified in DB (balance ${Number(v.balance || 0)}).` });
            setLoading(false);
            return;
          } else {
            // created but could not verify persistence
            setWallet(normalized);
            setMessage({ type: 'warning', text: `Wallet created but verification failed — it may not have been saved to DB.` });
            setLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      // fall through to final error below
    } finally {
      setLoading(false);
    }

    // If we reach here, server creation failed — do not create a local-only wallet
    setMessage({ type: 'error', text: 'Could not create wallet on server. Ensure API/DB is available.' });
  }

  // copy wallet id to clipboard (with fallback)
  async function handleCopyWalletId() {
    if (!wallet || !wallet.walletId) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(String(wallet.walletId));
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = String(wallet.walletId);
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Copy failed.' });
    }
  }

  // perform send using server APIs only (no local fallback)
  async function handleSend() {
    setMessage(null);
    setLoading(true);
    if (!wallet || !wallet.walletId) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Create a wallet first.' });
      return;
    }
    const amt = Number(amount);
    if (!recipient || !amt || amt <= 0) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Enter a valid recipient wallet id and a positive amount.' });
      return;
    }
    if (recipient === wallet.walletId) {
      setLoading(false);
      setMessage({ type: 'error', text: "You can't send to your own wallet." });
      return;
    }
    if (Number(wallet.balance) < amt) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Insufficient balance.' });
      return;
    }

    try {
      const transferCandidates = [
        '/api/crypto/transfer',
        '/api/crypto/wallets/transfer',
        '/api/crypto/transactions',
        '/api/crypto/wallets/send',
        '/api/crypto/transfer-funds',
        '/api/wallets/transfer',
        '/api/transactions',
        '/api/wallets/send',
        '/api/wallets/transfer-funds'
      ];
      for (const p of transferCandidates) {
        const resp = await tryPostJson(p, { fromWalletId: wallet.walletId, toWalletId: recipient, amount: amt });
        if (resp) {
          const updatedSender = resp?.sender || resp?.fromWallet || resp?.updatedSender || resp?.wallet || (resp?.data && resp.data.sender) || null;
          const updatedReceiver = resp?.receiver || resp?.toWallet || resp?.updatedReceiver || resp?.wallet || (resp?.data && resp.data.receiver) || null;

          if (updatedSender && (updatedSender.walletId || updatedSender.id || updatedSender._id)) {
            const normSender = updatedSender.walletId ? updatedSender : { ...updatedSender, walletId: updatedSender.walletId || updatedSender.id || updatedSender._id };
            setWallet(normSender);
            setAmount('');
            setRecipient('');
            setMessage({ type: 'success', text: `Sent ${amt} to ${recipient} (server).` });
            setLoading(false);

            // optimistic: add tx to history
            const now = Date.now();
            const tx = {
              id: resp.transactionId || resp.txId || `tx-${now}`,
              amount: amt,
              fromWalletId: wallet.walletId,
              toWalletId: recipient,
              status: 'ok',
              createdAt: new Date().toISOString(),
              raw: resp
            };
            setTransactions(prev => [tx, ...(prev || [])]);
            return;
          }

          if (resp.success || resp.status === 'ok' || resp.transactionId) {
            // attempt to refresh sender wallet from server
            const ref =
              (await tryFetchJson(`/api/crypto/wallets/${encodeURIComponent(wallet.walletId)}`)) ||
              (await tryFetchJson(`/api/crypto/wallets?userId=${encodeURIComponent(userId)}`)) ||
              (await tryFetchJson(`/api/wallets/${encodeURIComponent(wallet.walletId)}`)) ||
              (await tryFetchJson(`/api/wallets/user/${encodeURIComponent(userId)}`));

            if (ref && (ref.wallet || ref.balance || ref.id)) {
              const w = ref.wallet || ref;
              const norm = w.walletId ? w : { ...w, walletId: w.walletId || w.id || w._id };
              setWallet(norm);
              // update history
              const now = Date.now();
              const tx = {
                id: resp.transactionId || resp.txId || `tx-${now}`,
                amount: amt,
                fromWalletId: wallet.walletId,
                toWalletId: recipient,
                status: resp.success ? 'ok' : (resp.status || 'ok'),
                createdAt: new Date().toISOString(),
                raw: resp
              };
              setTransactions(prev => [tx, ...(prev || [])]);
            } else {
              // optimistic UI update if server gave only generic success
              setWallet(prev => (prev ? { ...prev, balance: Number(prev.balance) - amt } : prev));
              const now = Date.now();
              const tx = {
                id: resp.transactionId || resp.txId || `tx-${now}`,
                amount: amt,
                fromWalletId: wallet.walletId,
                toWalletId: recipient,
                status: 'ok',
                createdAt: new Date().toISOString(),
                raw: resp
              };
              setTransactions(prev => [tx, ...(prev || [])]);
            }

            setAmount('');
            setRecipient('');
            setMessage({ type: 'success', text: `Sent ${amt} to ${recipient} (server acknowledged).` });
            setLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      // ignore and fall through to error path
    }

    setLoading(false);
    setMessage({ type: 'error', text: 'Transfer failed: could not complete transfer on server.' });
  }

  // render small line chart SVG
  function renderLineChart(points = [], width = 420, height = 120) {
    if (!points || points.length === 0) {
      return <div style={{ color: '#666', fontSize: 12 }}>No chart data</div>;
    }
    const minT = Math.min(...points.map(p => p.t));
    const maxT = Math.max(...points.map(p => p.t));
    const minB = Math.min(...points.map(p => p.b));
    const maxB = Math.max(...points.map(p => p.b));
    const pad = 8;
    const innerW = width - pad*2;
    const innerH = height - pad*2 || 1;
    const toX = t => pad + ((t - minT) / (Math.max(1, maxT - minT))) * innerW;
    const toY = b => pad + (1 - ((b - minB) / Math.max(1, (maxB - minB)))) * innerH;
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.t)} ${toY(p.b)}`).join(' ');
    return (
      <svg width={width} height={height} style={{ background: '#fff' }}>
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d0ebff" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="#0b74de" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* area under curve */}
        <path d={`${path} L ${toX(maxT)} ${height-pad} L ${toX(minT)} ${height-pad} Z`} fill="url(#g)" opacity="0.8"/>
        {/* small circles */}
        {points.map((p, i) => <circle key={i} cx={toX(p.t)} cy={toY(p.b)} r={2.2} fill="#0b74de" />)}
      </svg>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 760, fontFamily: 'Arial, sans-serif', margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>Simple Wallet</h2>

      {loading && <div style={{ marginBottom: 10, color: '#666' }}>Loading…</div>}

      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#666' }}>Connected user:</div>
        <div style={{ fontWeight: 600 }}>{userId ?? 'Not detected'}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        {wallet ? (
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <strong>Wallet ID:</strong>{' '}
                <span style={{ wordBreak: 'break-all' }}>{wallet.walletId}</span>
              </div>
              <button
                onClick={handleCopyWalletId}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                Copy
              </button>
              {copied && <div style={{ color: '#064', fontSize: 12 }}>Copied!</div>}
            </div>
            <div style={{ marginTop: 6 }}><strong>Balance:</strong> {Number(wallet.balance || 0)}</div>
          </div>
        ) : (
          <div style={{ marginBottom: 8, color: '#666' }}>No wallet found in DB. Use "Create wallet" to create one on the server.</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={handleCreateWallet}
          disabled={!userId}
          style={{
            padding: '10px 14px',
            background: userId ? '#0b74de' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: userId ? 'pointer' : 'not-allowed'
          }}
        >
          Create wallet (default balance 10)
        </button>
      </div>

      {/* Transactions panel (responsive) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Recent transactions</div>
          {transactions && transactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {transactions.map(tx => {
                const isOut = String(tx.fromWalletId) === String(wallet?.walletId);
                const date = new Date(tx.createdAt || tx.raw?.createdAt || tx.raw?.timestamp || Date.now());
                return (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '8px', borderRadius: 6, background: '#fafafa' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{isOut ? 'Sent' : 'Received'} {Number(tx.amount || 0)}</div>
                      <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isOut ? `to ${tx.toWalletId}` : `from ${tx.fromWalletId}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 96 }}>
                      <div style={{ fontSize: 12, color: tx.status === 'ok' ? '#064' : '#a33' }}>{tx.status}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{date.toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: '#666', fontSize: 13 }}>No recent transactions found.</div>
          )}
        </div>
      </div>

      <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, maxWidth: '100%' }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Send funds</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Recipient wallet id"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            style={{ flex: '1 1 200px', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', minWidth: 0 }}
          />
          <input
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ flex: '0 0 120px', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }}
          />
          <button
            onClick={handleSend}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: '#0b74de',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Send
          </button>
        </div>

        {message && (
          <div style={{
            padding: 8,
            borderRadius: 6,
            background: message.type === 'error' ? '#ffecec' : '#e6ffef',
            color: message.type === 'error' ? '#a33' : '#064'
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}