'use client'

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// CryptoIndex — improved detection + robust transaction fetching.
// This client component will attempt to detect a connected user but will also
// fall back to fetching all transactions when no user is detected. It tries
// a wide set of API paths and normalizes results for display.
export default function CryptoIndex() {
  const [connectedUserId, setConnectedUserId] = useState(null);
  const mountedRef = useRef(false);
  const router = useRouter();

  // detection helpers
  const hasWindow = typeof window !== "undefined";
  const hasDocument = typeof document !== "undefined";

  function isBlockedUser(id) {
    if (!id) return false;
    try {
      const s = String(id).trim();
      return s === "691735cf8c82afe3706c8db9";
    } catch (e) {
      return false;
    }
  }

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
        const maybe = nd.props?.pageProps?.user?.id || nd.props?.pageProps?.userId || nd.props?.pageProps?.user?._id;
        if (maybe) return maybe;
      }
      if (window.app && window.app.currentUser) {
        return window.app.currentUser.id || window.app.currentUser.userId || window.app.currentUser._id || null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  function getUserIdFromStorage() {
    if (!hasWindow) return null;
    try {
      const keys = ["connectedUserId", "userId", "currentUserId"];
      for (const k of keys) {
        try {
          const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (raw) return raw;
        } catch (e) {}
      }
      try {
        const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          return parsed?.id || parsed?._id || parsed?.userId || null;
        }
      } catch (e) {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (/user/i.test(key) || /auth/i.test(key)) {
          try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            if (raw.trim().startsWith("{")) {
              const parsed = JSON.parse(raw);
              const maybe = parsed?.id || parsed?._id || parsed?.userId;
              if (maybe) return maybe;
            } else if (raw.length > 5) {
              return raw;
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      // storage not available
    }
    return null;
  }

  async function fetchUserFromRoute() {
    if (!hasWindow) return null;
    const tries = ["/api/auth/me", "/api/users?operation=get-current", "/api/users?operation=get-current-user", "/api/user", "/api/me"];
    for (const p of tries) {
      try {
        const res = await fetch(p, { credentials: "same-origin" });
        if (!res.ok) continue;
        const json = await res.json().catch(() => null);
        const maybe = json?.user?._id || json?.user?.id || json?.id || json?.userId || null;
        if (maybe) return maybe;
      } catch (e) {}
    }
    return null;
  }

  // central detection function
  async function detectConnectedUserId() {
    const cookie = getUserIdFromCookie();
    if (cookie) {
      if (isBlockedUser(cookie)) return null;
      return String(cookie);
    }

    const w = getUserIdFromWindow();
    if (w) {
      if (isBlockedUser(w)) return null;
      return String(w);
    }

    const s = getUserIdFromStorage();
    if (s) {
      if (isBlockedUser(s)) return null;
      return String(s);
    }

    try {
      const fromApi = await fetchUserFromRoute();
      if (fromApi) {
        if (isBlockedUser(fromApi)) return null;
        return String(fromApi);
      }
    } catch (e) {}

    return null;
  }

  useEffect(() => {
    mountedRef.current = true;
    let canceled = false;

    (async () => {
      const id = await detectConnectedUserId();
      if (canceled) return;
      if (id && !isBlockedUser(id)) setConnectedUserId(String(id));
      else setConnectedUserId(null);
    })();

    function onStorage(e) {
      try {
        if (!e) return;
        if (e.key === "connectedUserId" || e.key === "userId" || e.key === "user" || e.key?.startsWith("auth") || e.key === "user-logout-ts") {
          setTimeout(async () => {
            if (!mountedRef.current) return;
            const id = await detectConnectedUserId();
            if (id && !isBlockedUser(id)) setConnectedUserId(String(id));
            else setConnectedUserId(null);
          }, 120);
        }
      } catch (err) {}
    }

    try {
      window.addEventListener("storage", onStorage);
    } catch (e) {}

    return () => {
      canceled = true;
      mountedRef.current = false;
      try {
        window.removeEventListener("storage", onStorage);
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // new: mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Normalize server transaction to UI-friendly shape
  function normalizeTransaction(t) {
    const id = t.id || t._id || (t._id && String(t._id)) || null;
    const sentAt = t.sentAt || t.sent_at || t.createdAt || t.created_at || t.date || t.timestamp || null;
    const dateISO = sentAt ? new Date(sentAt).toISOString() : null;
    const fromId = t.fromId || t.senderWalletId || t.sender || t.from || t.from_wallet || null;
    const toId = t.toId || t.receiverWalletId || t.receiver || t.to || t.to_wallet || null;
    const amount = typeof t.amount === "number" ? t.amount : Number(t.amount || 0);

    return {
      raw: t,
      id,
      date: dateISO,
      fromId,
      toId,
      amount,
      status: t.status || t.state || null,
    };
  }

  // fetch and return normalized array
  async function fetchAllTransactions(userId) {
    async function tryFetchJson(path) {
      try {
        const res = await fetch(path, { credentials: "same-origin" });
        if (!res.ok) {
          // try to parse body for debugging messages but return null for data
          try { await res.json().catch(() => null); } catch (_) {}
          return null;
        }
        return await res.json().catch(() => null);
      } catch (e) {
        return null;
      }
    }

    // Build candidate endpoints widely (covers common variants)
    const candidates = [];

    // If userId present, try endpoints that accept userId
    if (userId) {
      candidates.push(
        `/api/crypto/transactions?userId=${encodeURIComponent(userId)}`,
        `/api/crypto/transactions/${encodeURIComponent(userId)}`,
        `/api/transactions?userId=${encodeURIComponent(userId)}`,
        `/api/transactions/${encodeURIComponent(userId)}`,
        `/api/wallets/transactions/${encodeURIComponent(userId)}`,
        `/api/wallets/transactions?walletId=${encodeURIComponent(userId)}`,
        `/api/transactions?walletId=${encodeURIComponent(userId)}`,
        `/api/crypto?operation=get-transactions&userId=${encodeURIComponent(userId)}`
      );
    }

    // Try wallet discovery first (many backends store transactions linked to wallets)
    if (userId) {
      const walletLookupCandidates = [
        `/api/crypto/user/${encodeURIComponent(userId)}`,
        `/api/crypto/wallets?userId=${encodeURIComponent(userId)}`,
        `/api/wallets?userId=${encodeURIComponent(userId)}`,
        `/api/wallets/user/${encodeURIComponent(userId)}`,
        `/api/users/${encodeURIComponent(userId)}/wallets`,
      ];
      for (const p of walletLookupCandidates) {
        const walletJson = await tryFetchJson(p);
        if (!walletJson) continue;
        const walletObj = walletJson?.wallet || (Array.isArray(walletJson) && walletJson[0]) || walletJson?.data || walletJson?.wallets || null;
        const walletId = walletObj?.walletId || walletObj?._id || walletObj?.id || null;
        if (walletId) {
          // try transaction endpoints for that walletId
          const txPaths = [
            `/api/wallets/transactions/${encodeURIComponent(walletId)}`,
            `/api/transactions/${encodeURIComponent(walletId)}`,
            `/api/transactions?walletId=${encodeURIComponent(walletId)}`,
            `/api/crypto/wallets/${encodeURIComponent(walletId)}/transactions`,
            `/api/crypto/wallets/transactions/${encodeURIComponent(walletId)}`,
            `/api/crypto/transactions/${encodeURIComponent(walletId)}`,
          ];
          for (const tp of txPaths) {
            const txJson = await tryFetchJson(tp);
            if (!txJson) continue;
            const list = Array.isArray(txJson) ? txJson : txJson?.transactions || txJson?.data || txJson?.items || txJson?.transactionsData || null;
            if (Array.isArray(list)) return list.map(normalizeTransaction);
          }
        }
      }
    }

    // Generic candidates (global transactions or alternative endpoints)
    candidates.push(
      `/api/crypto/transactions`,
      `/api/crypto?operation=get-transactions`,
      `/api/crypto?operation=get-transactions&limit=100`,
      `/api/transactions`,
      `/api/txs`,
      `/api/transactions/all`,
      `/api/transactions?limit=100`
    );

    // Also include direct wallet-like candidates even when userId is not present
    candidates.push(
      `/api/wallets/transactions`,
      `/api/wallets/transactions?limit=100`,
      `/api/crypto`
    );

    // Walk candidate endpoints until we find an array
    for (const p of candidates) {
      const json = await tryFetchJson(p);
      if (!json) continue;
      const list = Array.isArray(json) ? json : json?.transactions || json?.data || json?.items || json?.txs || json?.rows || null;
      if (Array.isArray(list)) {
        return list.map(normalizeTransaction);
      }
      // Some backends return { success: true, data: [...] }
      if (json && Array.isArray(json.data)) return json.data.map(normalizeTransaction);
    }

    // nothing found
    return [];
  }

  useEffect(() => {
    let canceled = false;
    (async () => {
      // we allow fetch even if connectedUserId is null (global transactions)
      if (!mountedRef.current) mountedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const txs = await fetchAllTransactions(connectedUserId);
        if (canceled) return;
        setTransactions(txs);
      } catch (err) {
        if (!canceled) setError("Failed to load transactions");
        console.error("fetch transactions error:", err);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedUserId]);

  function refresh() {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const txs = await fetchAllTransactions(connectedUserId);
        setTransactions(txs);
      } catch (e) {
        setError("Failed to refresh transactions");
        console.error("refresh error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }

  function formatDate(iso) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch (e) {
      return iso;
    }
  }

  return (
    <section style={{ padding: isMobile ? 16 : 24, fontFamily: "Arial, sans-serif", maxWidth: 900, margin: '0 auto', boxSizing: 'border-box' }}>
      <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>Wallet Transactions</h1>
      <p style={{ color: "#666", marginTop: 8, fontSize: isMobile ? 13 : 14 }}>
        Showing transactions. The page will attempt many common API paths to locate transactions.
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{
          marginLeft: isMobile ? 0 : "auto",
          display: "flex",
          gap: 8,
          flexDirection: isMobile ? 'column' : 'row',
          width: isMobile ? '100%' : 'auto'
        }}>
          <button
            onClick={() => {
              if (connectedUserId) {
                router.push(`/uis/crypto/${encodeURIComponent(String(connectedUserId))}`);
              } else {
                router.push(`/uis/crypto/new`);
              }
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #1976d2",
              background: "#1976d2",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              width: isMobile ? '100%' : 'auto'
            }}
            title={connectedUserId ? `Create transaction for ${connectedUserId}` : "Create transaction"}
          >
            Add Transaction
          </button>

          <button
            onClick={refresh}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              width: isMobile ? '100%' : 'auto'
            }}
            title="Refresh transactions"
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #eee", padding: isMobile ? 10 : 12, borderRadius: 6 }}>
        <div style={{ marginTop: 12 }}>
          {loading ? (
            <div style={{ color: "#666" }}>Loading transactions...</div>
          ) : error ? (
            <div style={{ color: "red" }}>{error}</div>
          ) : transactions.length === 0 ? (
            <div style={{ color: "#777" }}>No transactions available.</div>
          ) : (
            // responsive: table on desktop, stacked cards on mobile
            isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {transactions.map((t) => {
                  const date = formatDate(t.date);
                  const from = t.fromId || "-";
                  const to = t.toId || "-";
                  const amount = Number(t.amount || 0).toFixed(2);
                  return (
                    <div key={t.id || `${from}-${to}-${t.date}`} style={{ background: '#fff', padding: 10, borderRadius: 8, boxShadow: '0 0 0 1px #f3f3f3 inset' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{amount} <span style={{ fontWeight: 500, color: '#666' }}>USD</span></div>
                          <div style={{ fontSize: 13, color: '#444', marginTop: 6 }}>
                            <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>From: {from}</div>
                            <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>To: {to}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 92 }}>
                          <div style={{ fontSize: 12, color: t.status === 'ok' ? '#064' : '#a33', fontWeight: 600 }}>{t.status || '-'}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>{date}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                      <th style={{ padding: "8px 6px" }}>Date</th>
                      <th style={{ padding: "8px 6px" }}>From Wallet</th>
                      <th style={{ padding: "8px 6px" }}>To Wallet</th>
                      <th style={{ padding: "8px 6px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id || `${t.fromId}-${t.toId}-${t.date}`} style={{ borderBottom: "1px solid #fafafa" }}>
                        <td style={{ padding: "8px 6px", color: "#555" }}>{formatDate(t.date)}</td>
                        <td style={{ padding: "8px 6px" }}>{t.fromId || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{t.toId || "-"}</td>
                        <td style={{ padding: "8px 6px", fontWeight: 600 }}>{Number(t.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}