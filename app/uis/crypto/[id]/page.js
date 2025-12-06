'use client';

// Crypto detail / wallet page
// Fixes:
// - Use useParams() (client hook) instead of reading params prop directly (resolves NextJS "params should be awaited" runtime error).
// - Send wallet-create requests to the correct API route (/api/crypto/create-wallet).
// - Normalize server wallet shape (idcrypto / idCrypto) when using responses.
// - Safe guards around missing params / id === 'new' redirect.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

export default function CryptoDetailPage(/* props intentionally unused - we read params client-side */) {
  const router = useRouter();
  const params = useParams(); // client-side hook (works in 'use client' components)
  const idFromParams = params?.id ?? 'unknown';
  const id = String(idFromParams);

  // user / wallet state
  const [userId, setUserId] = useState('');
  const [wallet, setWallet] = useState(null);
  const [message, setMessage] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [detecting, setDetecting] = useState(true);
  // resolved display name/pseudo for the id shown in the UI
  const [userPseudo, setUserPseudo] = useState(null);
  // transaction UI state
  const [recipientWalletId, setRecipientWalletId] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [transactions, setTransactions] = useState([]);

  // Helpers: safe references to browser globals
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';
  const hasFetch = typeof fetch !== 'undefined';
  const COOKIE_KEY = 'userId';

  // cookie helpers
  function getUserIdFromCookie() {
    if (!hasDocument) return null;
    try {
      const m = document.cookie.match(/(?:^|;\s*)userId=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) {
      return null;
    }
  }
  function setUserIdCookie(idVal) {
    if (!hasDocument) return;
    try {
      // set for 1 year
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(idVal)}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } catch (e) {
      // ignore
    }
  }
  function clearUserIdCookie() {
    if (!hasDocument) return;
    try {
      document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
    } catch (e) {
      // ignore
    }
  }

  // window/global heuristics
  function getUserIdFromWindow() {
    if (!hasWindow) return null;
    try {
      if (window.__USER_ID__) return window.__USER_ID__;
      if (window.__NEXT_DATA__) {
        const nd = window.__NEXT_DATA__;
        const maybe = nd.props?.pageProps?.user?.id || nd.props?.pageProps?.userId || nd.props?.pageProps?.user?.userId;
        if (maybe) return maybe;
      }
      if (window.app && window.app.currentUser) {
        return window.app.currentUser.id || window.app.currentUser.userId || null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  // localStorage/sessionStorage heuristics
  function getUserIdFromStorage() {
    if (!hasWindow) return null;
    try {
      const candidates = [
        'userId',
        'currentUserId',
        'currentUser',
        'user',
        'me',
        'auth.userId'
      ];
      for (const key of candidates) {
        try {
          const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (!raw) continue;
          if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
            const parsed = JSON.parse(raw);
            const maybe = parsed?.id || parsed?.userId || parsed?.uid;
            if (maybe) return maybe;
          } else {
            return raw;
          }
        } catch (e) {
          // per-key ignore
        }
      }
    } catch (e) {
      // storage not available
    }
    return null;
  }

  // try server-side user endpoints that return current user
  async function fetchUserFromRoute() {
    if (!hasFetch) return null;
    const tries = ['/api/user', '/user', '/api/me', '/api/auth/user', '/api/profile', '/api/session'];
    for (const path of tries) {
      try {
        const res = await fetch(path, { credentials: 'same-origin' });
        if (!res.ok) continue;
        const json = await res.json();
        const idFromU = json?.u?.id || json?.user?.id || json?.id || json?.userId || json?.uid || json?.data?.id;
        if (idFromU) return idFromU;
      } catch (e) {
        // ignore and try next
      }
    }
    return null;
  }

  // URL query param (e.g. ?userId=...)
  function getUserIdFromUrl() {
    if (!hasWindow) return null;
    try {
      const qp = new URLSearchParams(window.location.search);
      const v = qp.get('userId') || qp.get('uid') || qp.get('userid');
      return v;
    } catch (e) {
      return null;
    }
  }

  // try to resolve a user pseudo/display name from available client-side sources
  function findUserPseudo(idToFind) {
     if (!idToFind || !hasWindow) return null;
     try {
       // 1) common window globals
       const w = window;
       const tryObj = (obj) => {
         if (!obj) return null;
         if (obj.id === idToFind || obj.userId === idToFind || obj.uid === idToFind || obj._id === idToFind) {
           return obj.pseudo || obj.username || obj.userName || obj.name || obj.displayName || obj.handle || null;
         }
         return null;
       };
       const candidates = [w.__USER__, w.__CURRENT_USER__, w.app?.currentUser, w.__NEXT_DATA__?.props?.pageProps?.user, w.__NEXT_DATA__?.props?.pageProps];
       for (const c of candidates) {
         const maybe = tryObj(c);
         if (maybe) return maybe;
       }
 
       // 2) check a few well-known localStorage keys
       const keysToTry = ['currentUser', 'user', 'me', 'profile', 'auth.user', 'profile.user'];
       for (const k of keysToTry) {
         try {
           const raw = localStorage.getItem(k);
           if (!raw) continue;
           const parsed = JSON.parse(raw);
           const maybe = tryObj(parsed);
           if (maybe) return maybe;
         } catch (e) { /* ignore */ }
       }
 
       // 3) scan localStorage for any object that matches id
       for (let i = 0; i < localStorage.length; i++) {
         try {
           const key = localStorage.key(i);
           const raw = localStorage.getItem(key);
           if (!raw) continue;
           if (!raw.trim().startsWith('{')) continue;
           const parsed = JSON.parse(raw);
           const maybe = tryObj(parsed);
           if (maybe) return maybe;
         } catch (e) { /* ignore */ }
       }
     } catch (e) {
       // ignore and fallback
     }
     return null;
  }

  function walletStorageKey(uid, cryptoId) {
    return `wallet:${uid}:${cryptoId}`;
  }

  function txStorageKey(walletId) {
    return `tx:${walletId}`;
  }

  // scan localStorage to find a wallet by its walletId and return { key, wallet } or null
  function findWalletKeyByWalletId(targetWalletId) {
    if (!hasWindow) return null;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('wallet:')) continue;
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (parsed && parsed.walletId === targetWalletId) {
            return { key, wallet: parsed };
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    } catch (e) {
      // storage not available
    }
    return null;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setDetecting(true);
      // 1) quick sync checks (cookie/local/global/storage/url)
      const fromCookie = getUserIdFromCookie();
      const fromWindow = getUserIdFromWindow();
      const fromStorage = getUserIdFromStorage();
      const fromUrl = getUserIdFromUrl();

      let detected = fromCookie || fromWindow || fromStorage || fromUrl || '';

      // 2) if still empty, try fetching from server-side endpoints
      if (!detected) {
        try {
          const fromApi = await fetchUserFromRoute();
          if (fromApi) detected = fromApi;
        } catch (e) {
          // ignore
        }
      }

      // 3) apply result (if any)
      if (mounted && detected) {
        setUserId(String(detected));
        setUserIdCookie(String(detected));
        try {
          if (hasWindow) localStorage.setItem('userId', String(detected));
        } catch (e) {}
      }

      if (mounted) {
        setDetecting(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // If route is /uis/crypto/new, redirect to /uis/crypto/<userId> once userId is known.
  useEffect(() => {
    if (id === 'new' && userId) {
      const target = `/uis/crypto/${encodeURIComponent(String(userId))}`;
      try {
        router.replace(target);
      } catch (e) {
        // ignore router errors
      }
    }
  }, [id, userId, router]);

  useEffect(() => {
    // load wallet for current user+crypto when available
    if (!userId) {
      setWallet(null);
      return;
    }
    const cryptoId = (id === 'new') ? userId : id;
    const key = walletStorageKey(userId, cryptoId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setWallet(JSON.parse(raw));
      } else {
        setWallet(null);
      }
    } catch (e) {
      console.warn('failed reading wallet', e);
      setWallet(null);
    }
  }, [userId, id]);

  // load transactions for current wallet
  useEffect(() => {
    if (!wallet || !wallet.walletId) {
      setTransactions([]);
      return;
    }
    try {
      const raw = localStorage.getItem(txStorageKey(wallet.walletId));
      if (raw) setTransactions(JSON.parse(raw));
      else setTransactions([]);
    } catch (e) {
      setTransactions([]);
    }
  }, [wallet]);

  // NOTE: made this async so `await fetch(...)` is valid
  async function handleCreateWallet() {
    if (!userId) {
      setMessage({ type: 'error', text: 'No connected user. Wallet creation disabled.' });
      return;
    }
    const cryptoId = (id === 'new') ? userId : id;
    const key = walletStorageKey(userId, cryptoId);
    try {
      if (localStorage.getItem(key)) {
        setMessage({ type: 'error', text: 'Wallet already exists.' });
        try { setWallet(JSON.parse(localStorage.getItem(key))); } catch (e) {}
        return;
      }
    } catch (e) {
      // storage read error
    }

    // include a unique walletId so it can be used for transactions
    const newWallet = {
      idcrypto: `${userId}-${cryptoId}`,
      walletId: `${cryptoId}-${userId}-${Math.random().toString(36).slice(2, 9)}`,
      owner: userId,
      balance: 10,
      currency: cryptoId,
      createdAt: new Date().toISOString()
    };

    try {
      // save locally first
      localStorage.setItem(key, JSON.stringify(newWallet));
      try { localStorage.setItem(txStorageKey(newWallet.walletId), JSON.stringify([])); } catch (e) {}
      setWallet(newWallet);
      setMessage({ type: 'success', text: `Wallet created for ${userId} with balance ${newWallet.balance} ${cryptoId}` });

      // try persisting to server (best-effort)
      // NOTE: your API route for wallet creation is at /api/crypto/create-wallet (see app/api/crypto/route.js)
      try {
        const res = await fetch('/api/crypto/create-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json && json.success && json.wallet) {
          // server returns a wallet — normalize possible field names
          const srv = json.wallet;
          const normalized = {
            idcrypto: srv.idcrypto || srv.idCrypto || newWallet.idcrypto,
            walletId: srv.walletId || srv.idcrypto || newWallet.walletId,
            owner: srv.userId || srv.owner || userId,
            balance: srv.balance ?? newWallet.balance,
            currency: cryptoId,
            createdAt: srv.createdAt || newWallet.createdAt
          };
          // persist normalized server wallet locally (overwrite)
          try { localStorage.setItem(key, JSON.stringify(normalized)); } catch (e) {}
          setWallet(normalized);
          setMessage({ type: 'success', text: `Wallet saved to server and created for ${userId}.` });
        } else {
          setMessage({ type: 'info', text: `Wallet created locally. Server returned ${res.status || 'no-response'}.` });
        }
      } catch (e) {
        setMessage({ type: 'info', text: 'Wallet created locally (server save failed).' });
      }
    } catch (e) {
      console.error('create wallet failed', e);
      setMessage({ type: 'error', text: 'Could not create wallet (storage error).' });
    }
  }

  // perform a send/transfer from current wallet to recipientWalletId
  async function handleSend() {
    if (!wallet || !wallet.walletId) {
      setMessage({ type: 'error', text: 'No wallet available to send from.' });
      return;
    }
    const amt = Number(sendAmount);
    if (!recipientWalletId || !amt || amt <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid recipient wallet id and amount.' });
      return;
    }

    // Prevent sending to yourself
    if (recipientWalletId === wallet.walletId) {
      setMessage({ type: 'error', text: "You can't send to your own wallet." });
      return;
    }

    if (Number(wallet.balance) < amt) {
      setMessage({ type: 'error', text: 'Insufficient balance.' });
      return;
    }
    try {
      const found = findWalletKeyByWalletId(recipientWalletId);
      if (!found) {
        setMessage({ type: 'error', text: 'Recipient wallet not found.' });
        return;
      }
      const recipient = found.wallet;
      // ensure same currency (if currency exists on recipient)
      if (recipient.currency && wallet.currency && recipient.currency !== wallet.currency) {
        setMessage({ type: 'error', text: 'Recipient wallet uses a different currency.' });
        return;
      }
      // find actual sender storage key (scan localStorage), fallback to heuristics
      const possibleSender = findWalletKeyByWalletId(wallet.walletId);
      const senderKey = possibleSender?.key || walletStorageKey(wallet.owner, wallet.currency);
      const recipientKey = found.key;

      // update balances
      const updatedSender = { ...wallet, balance: Number(wallet.balance) - amt };
      const updatedRecipient = { ...recipient, balance: Number(recipient.balance) + amt };

      // persist updated wallets using the keys we found
      try {
        localStorage.setItem(senderKey, JSON.stringify(updatedSender));
        localStorage.setItem(recipientKey, JSON.stringify(updatedRecipient));
      } catch (e) {
        // if storage write fails, abort
        setMessage({ type: 'error', text: 'Send failed due to storage write error.' });
        return;
      }

      // push transactions for both wallets
      const now = new Date().toISOString();
      const txOut = { id: Math.random().toString(36).slice(2,9), type: 'send', amount: amt, to: recipient.walletId, at: now, currency: wallet.currency };
      const txIn =  { id: Math.random().toString(36).slice(2,9), type: 'receive', amount: amt, from: wallet.walletId, at: now, currency: wallet.currency };
      // persist tx lists
      try {
        const senderTxKey = txStorageKey(wallet.walletId);
        const recipientTxKey = txStorageKey(recipient.walletId);
        const senderRaw = localStorage.getItem(senderTxKey);
        const recipientRaw = localStorage.getItem(recipientTxKey);
        const senderList = senderRaw ? JSON.parse(senderRaw) : [];
        const recipientList = recipientRaw ? JSON.parse(recipientRaw) : [];
        senderList.unshift(txOut);
        recipientList.unshift(txIn);
        localStorage.setItem(senderTxKey, JSON.stringify(senderList));
        localStorage.setItem(recipientTxKey, JSON.stringify(recipientList));
      } catch (e) {
        // ignore tx write errors
      }
      // update local state
      setWallet(updatedSender);
      setTransactions(prev => [txOut, ...prev]);
      setMessage({ type: 'success', text: `Sent ${amt} ${wallet.currency || ''} to ${recipient.walletId}` });
      setSendAmount('');
      setRecipientWalletId('');
    } catch (e) {
      console.error('send failed', e);
      setMessage({ type: 'error', text: 'Send failed due to storage error.' });
    }
  }

  function handleSignOut() {
    clearUserIdCookie();
    try {
      localStorage.removeItem('userId');
    } catch (e) {}
    setUserId('');
    setWallet(null);
    setMessage({ type: 'info', text: 'Disconnected local user.' });
  }

  async function handleCopyWalletId() {
    if (!wallet || !wallet.walletId) {
      setMessage({ type: 'error', text: 'No wallet id available to copy.' });
      return;
    }
    const text = wallet.walletId;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setMessage({ type: 'success', text: 'Wallet id copied to clipboard.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to copy wallet id.' });
    }
  }

  // When id === 'new' show the connected user's id in the header while detecting/redirecting.
  const displayId = (id === 'new' && userId) ? String(userId) : String(id);

  // derive a friendly display name (pseudo) for use in headers/intros
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      // try find pseudo by id (route id or connected user id)
      const candidateId = displayId;
      const pseudo = findUserPseudo(candidateId);
      if (mounted) {
        if (pseudo) setUserPseudo(String(pseudo));
        else {
          // fallback: obfuscate long ids so the long raw id isn't shown in the UI
          if (candidateId && candidateId.length > 12) setUserPseudo(`${candidateId.slice(0, 8)}...`);
          else setUserPseudo(candidateId || '');
        }
      }
    })();
    return () => { mounted = false; };
  }, [displayId, userId, wallet]);

  return (
    <div style={{ padding: 20 }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, textTransform: 'capitalize' }}>{String(userPseudo || '').replace('-', ' ')}</h2>
        <div style={{ marginTop: 6, color: '#666' }}>Manage your wallet for {String(userPseudo || '').replace('-', ' ')}.</div>
      </header>

      <main style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        <p style={{ color: '#333' }}>Create or view your wallet for {String(userPseudo || '').replace('-', ' ')}.</p>

        <div style={{ marginTop: 12 }}>
          <Link href="/uis/crypto" style={{ color: '#0366d6', textDecoration: 'none' }}>Back to dashboard</Link>
        </div>

        <div style={{ marginTop: 18, padding: 12, border: '1px solid #eee', borderRadius: 8, maxWidth: 680 }}>
          <div style={{ marginBottom: 8, color: '#444', fontWeight: 600 }}>Connected user</div>

          {userId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ color: '#222' }}>User id: <strong>{userId}</strong></div>
              {/* Sign out button removed from this page.
                  Sign out control is now provided in: d:\Saas_MongoDB\mongo\app\uis\user-space\layout.js */}
            </div>
          ) : (
            <div style={{ color: '#777' }}>
              {detecting ? 'Detecting connected user...' : 'No connected user detected.'}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            {wallet ? (
              <div style={{ padding: 10, borderRadius: 8, background: '#f7ffef', border: '1px solid #e6ffdf' }}>
                <div style={{ fontWeight: 700 }}>Wallet: {wallet.idcrypto}</div>
                <div style={{ marginTop: 6 }}>
                  <div style={{ color: '#444' }}>
                    Wallet ID:{' '}
                    <strong style={{ wordBreak: 'break-all', display: 'inline-block' }}>{wallet.walletId}</strong>
                    {' '}
                    <button
                      onClick={handleCopyWalletId}
                      title="Copy wallet id"
                      style={{
                        marginLeft: 8,
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #ddd',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <div style={{ color: '#444', marginTop: 6 }}>
                    Balance: {Number(wallet.balance).toLocaleString()}
                  </div>
                </div>

                {/* Transaction send form */}
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    aria-label="recipient wallet id"
                    placeholder="Recipient wallet id"
                    value={recipientWalletId}
                    onChange={(e) => setRecipientWalletId(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', minWidth: 240 }}
                  />
                  <input
                    aria-label="amount"
                    placeholder="Amount"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', width: 120 }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!recipientWalletId || !sendAmount}
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

                {/* Transaction history */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Transactions</div>
                  {transactions.length === 0 ? (
                    <div style={{ color: '#666', fontSize: 13 }}>No transactions yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {transactions.slice(0, 20).map(tx => (
                        <div key={tx.id} style={{ padding: 8, borderRadius: 6, background: '#fff', border: '1px solid #eee', fontSize: 13 }}>
                          <div><strong>{tx.type === 'send' ? 'Sent' : 'Received'} {tx.amount} {tx.currency}</strong></div>
                          <div style={{ color: '#666', marginTop: 4, fontSize: 12 }}>
                            {tx.type === 'send' ? `To: ${tx.to}` : `From: ${tx.from}`} — {new Date(tx.at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <button
                  onClick={handleCreateWallet}
                  disabled={!userId}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: userId ? '#0b74de' : '#ccc',
                    color: '#fff',
                    cursor: userId ? 'pointer' : 'not-allowed'
                  }}
                >
                  Create wallet (receive 10 {String(displayId).toUpperCase()})
                </button>
                {!userId && <div style={{ color: '#777', fontSize: 13 }}>Wallet creation is disabled until a connected user is detected or you provide a user id.</div>}
              </div>
            )}
          </div>

          {message && (
            <div style={{
              marginTop: 12,
              padding: 8,
              borderRadius: 6,
              background: message.type === 'error' ? '#ffecec' : message.type === 'success' ? '#e6ffef' : '#fffbe6',
              color: message.type === 'error' ? '#a33' : message.type === 'success' ? '#064' : '#664'
            }}>
              {message.text}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, color: '#999', fontSize: 12 }}>
          Note: the page tries cookies, window globals, localStorage, URL query param (userId) and common /api endpoints to detect a connected user automatically.
        </div>
      </main>
    </div>
  );
}