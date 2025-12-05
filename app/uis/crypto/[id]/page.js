'use client';

// Minimal starter scaffold for the crypto detail page.
// TODO: Rebuild page UI and logic from here.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CryptoDetailPage({ params }) {
  const { id } = params ?? { id: 'unknown' };

  // user / wallet state
  const [userId, setUserId] = useState('');
  const [wallet, setWallet] = useState(null);
  const [message, setMessage] = useState(null);

  // helper: try to get a userId from cookie or window (app may expose it)
  function getUserIdFromCookie() {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(/(?:^|;\s*)userId=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setUserIdCookie(idVal) {
    if (typeof document === 'undefined') return;
    document.cookie = `userId=${encodeURIComponent(idVal)}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }

  // new: clear cookie when signing out
  function clearUserIdCookie() {
    if (typeof document === 'undefined') return;
    document.cookie = 'userId=; path=/; max-age=0';
  }

  function getUserIdFromWindow() {
    if (typeof window === 'undefined') return null;
    // common patterns: window.__USER_ID__ or window.__NEXT_DATA__?.props?.pageProps?.user?.id
    if (window.__USER_ID__) return window.__USER_ID__;
    try {
      const nd = window.__NEXT_DATA__ || {};
      const maybe = nd.props?.pageProps?.user?.id || nd.props?.pageProps?.userId;
      if (maybe) return maybe;
    } catch (e) { /* ignore */ }
    return null;
  }

  // new: attempt to fetch user from known user routes and return an id if present
  async function fetchUserFromRoute() {
    if (typeof fetch === 'undefined') return null;
    const tries = ['/api/user', '/user', '/api/me', '/api/auth/user'];
    for (const path of tries) {
      try {
        const res = await fetch(path, { credentials: 'same-origin' });
        if (!res.ok) continue;
        const json = await res.json();
        // common response shapes: { u: { id } }, { user: { id } }, { id }, { userId }
        const idFromU = json?.u?.id || json?.user?.id || json?.id || json?.userId || json?.userId;
        if (idFromU) return idFromU;
      } catch (e) {
        // ignore and try next
      }
    }
    return null;
  }

  function walletStorageKey(uid, cryptoId) {
    return `wallet:${uid}:${cryptoId}`;
  }

  useEffect(() => {
    // attempt to detect user id on mount (do NOT ask for manual input)
    let mounted = true;
    (async () => {
      const fromCookie = getUserIdFromCookie();
      const fromWindow = getUserIdFromWindow();
      let detected = fromCookie || fromWindow || '';

      // if not found locally, try server-side/user route lookup (u.id)
      if (!detected) {
        try {
          const fromApi = await fetchUserFromRoute();
          if (fromApi) detected = fromApi;
        } catch (e) {
          // ignore
        }
      }

      if (mounted && detected) {
        setUserId(detected);
        // ensure cookie for future loads
        setUserIdCookie(detected);
      } else {
        // do NOT set a global message here to avoid duplicate UI notices;
        // the UI shows a clear "no connected user" hint already.
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // load wallet for current user+crypto when available
    if (!userId) {
      setWallet(null);
      return;
    }
    const key = walletStorageKey(userId, id);
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

  function handleCreateWallet() {
    if (!userId) {
      setMessage({ type: 'error', text: 'No connected user. Wallet creation disabled.' });
      return;
    }
    // enforce one wallet per user per crypto by checking storage
    const key = walletStorageKey(userId, id);
    if (localStorage.getItem(key)) {
      setMessage({ type: 'error', text: 'Wallet already exists.' });
      // load it
      try { setWallet(JSON.parse(localStorage.getItem(key))); } catch (e) {}
      return;
    }
    const newWallet = {
      idcrypto: `${userId}-${id}`,
      owner: userId,
      balance: 10, // grant 10 (BTC) as requested
      currency: id,
      createdAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(key, JSON.stringify(newWallet));
      setWallet(newWallet);
      setMessage({ type: 'success', text: `Wallet created for ${userId} with balance ${newWallet.balance} ${id}` });
    } catch (e) {
      console.error('create wallet failed', e);
      setMessage({ type: 'error', text: 'Could not create wallet (storage error).' });
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, textTransform: 'capitalize' }}>{id.replace('-', ' ')}</h2>
        <div style={{ marginTop: 6, color: '#666' }}>Manage your wallet for {id.replace('-', ' ')}.</div>
      </header>

      <main style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        {/* concise intro */}
        <p style={{ color: '#333' }}>Create or view your wallet for {id.replace('-', ' ')}.</p>

        <div style={{ marginTop: 12 }}>
          <Link href="/uis/crypto" style={{ color: '#0366d6', textDecoration: 'none' }}>Back to dashboard</Link>
        </div>

        {/* user info (automatic only; no manual entry) */}
        <div style={{ marginTop: 18, padding: 12, border: '1px solid #eee', borderRadius: 8, maxWidth: 520 }}>
          <div style={{ marginBottom: 8, color: '#444', fontWeight: 600 }}>Connected user</div>
          {userId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: '#222' }}>User id: <strong>{userId}</strong></div>
              <button onClick={() => { clearUserIdCookie(); setUserId(''); setWallet(null); setMessage({ type: 'info', text: 'Disconnected local user.' }); }} style={{ padding: '6px 10px', borderRadius: 6 }}>
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ color: '#777' }}>No connected user detected. Sign in to create or view your wallet.</div>
          )}

          <div style={{ marginTop: 12 }}>
            {wallet ? (
              <div style={{ padding: 10, borderRadius: 8, background: '#f7ffef', border: '1px solid #e6ffdf' }}>
                <div style={{ fontWeight: 700 }}>Wallet: {wallet.idcrypto}</div>
                <div style={{ color: '#444', marginTop: 6 }}>Balance: {Number(wallet.balance).toLocaleString()} {wallet.currency}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>You already have one wallet for this crypto. Create button is hidden.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={handleCreateWallet} disabled={!userId} style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: userId ? '#0b74de' : '#ccc', color: '#fff' }}>
                  Create wallet (receive 10 {String(id).toUpperCase()})
                </button>
                {!userId && <div style={{ color: '#777', fontSize: 13 }}>Wallet creation is disabled until a connected user is detected.</div>}
              </div>
            )}
          </div>

          {message && (
            <div style={{ marginTop: 12, padding: 8, borderRadius: 6, background: message.type === 'error' ? '#ffecec' : '#e6ffef', color: message.type === 'error' ? '#a33' : '#064' }}>
              {message.text}
            </div>
          )}
        </div>

        {/* TODO: add price fetch, wallet loading, tx form, and chart components */}
      </main>
    </div>
  );
}