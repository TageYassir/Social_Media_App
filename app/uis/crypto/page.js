'use client'

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// Minimal placeholder for the Crypto dashboard page — cleaned so you can start again.
export default function CryptoIndex() {
  // sample transactions between users (fromId, toId, amount in units of crypto, currency, date)
  const transactions = useMemo(
    () => [
      { id: "t1", fromId: "u100", toId: "u201", amount: 0.1245, currency: "BTC", date: "2025-11-01" },
      { id: "t2", fromId: "u110", toId: "u100", amount: 1.3, currency: "ETH", date: "2025-11-02" },
      { id: "t3", fromId: "u100", toId: "u120", amount: 0.01, currency: "BTC", date: "2025-11-03" },
      { id: "t4", fromId: "u130", toId: "u201", amount: 2.5, currency: "LTC", date: "2025-11-03" },
      { id: "t5", fromId: "u201", toId: "u140", amount: 0.5, currency: "ETH", date: "2025-11-04" },
      { id: "t6", fromId: "u150", toId: "u100", amount: 0.005, currency: "BTC", date: "2025-11-05" },
      { id: "t7", fromId: "u160", toId: "u170", amount: 10, currency: "LTC", date: "2025-11-06" },
      // ...add more transactions as needed...
    ],
    []
  );

  const currencies = ["BTC", "ETH", "LTC"];
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");

  // connected user id state (updated from cookie, window globals, localStorage, or server endpoints)
  const [connectedUserId, setConnectedUserId] = useState(null);
  const mountedRef = useRef(false);
  const router = useRouter();

  // detection helpers
  const hasWindow = typeof window !== "undefined";
  const hasDocument = typeof document !== "undefined";

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
      // some apps store a user object on window.app.currentUser
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
      // check explicit keys first
      const keys = ["connectedUserId", "userId", "currentUserId"];
      for (const k of keys) {
        try {
          const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (raw) return raw;
        } catch (e) {}
      }
      // check 'user' object stored as JSON
      try {
        const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          return parsed?.id || parsed?._id || parsed?.userId || null;
        }
      } catch (e) {}
      // scan for other likely keys (defensive)
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
              // some sites store a plain id
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
    // 1) cookie
    const cookie = getUserIdFromCookie();
    if (cookie) return String(cookie);

    // 2) window globals
    const w = getUserIdFromWindow();
    if (w) return String(w);

    // 3) localStorage/sessionStorage
    const s = getUserIdFromStorage();
    if (s) return String(s);

    // 4) server endpoints (best-effort)
    try {
      const fromApi = await fetchUserFromRoute();
      if (fromApi) return String(fromApi);
    } catch (e) {}

    return null;
  }

  // initial detection + subscribe to storage changes to remain in sync with login/logout flows
  useEffect(() => {
    mountedRef.current = true;
    let canceled = false;

    (async () => {
      const id = await detectConnectedUserId();
      if (canceled) return;
      if (id) setConnectedUserId(String(id));
      else setConnectedUserId(null);
    })();

    function onStorage(e) {
      try {
        if (!e) return;
        // if user markers changed, re-run detection
        if (e.key === "connectedUserId" || e.key === "userId" || e.key === "user" || e.key?.startsWith("auth") || e.key === "user-logout-ts") {
          // small debounce to allow the login/logout flow to fully commit multiple keys
          setTimeout(async () => {
            if (!mountedRef.current) return;
            const id = await detectConnectedUserId();
            if (id) setConnectedUserId(String(id));
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

  // generate simple mock price history per currency (client-only)
  function generateSeries(currency, points = 30) {
    // seed base prices
    const base = { BTC: 60000, ETH: 3800, LTC: 120 }[currency] ?? 100;
    const volatility = { BTC: 800, ETH: 120, LTC: 8 }[currency] ?? 5;
    const out = [];
    let value = base;
    for (let i = 0; i < points; i++) {
      // random-ish walk deterministic-ish by index and currency
      const drift = Math.sin((i + currency.length) * 0.3) * volatility * 0.2;
      const noise = ((i * 37 + currency.charCodeAt(0)) % 11 - 5) * (volatility / 40);
      value = Math.max(1, value + drift + noise);
      out.push({ x: i, y: Math.round(value * 100) / 100 });
    }
    return out;
  }

  const series = useMemo(() => generateSeries(selectedCurrency, 40), [selectedCurrency]);

  const filtered = useMemo(
    () => transactions.filter((t) => t.currency === selectedCurrency),
    [transactions, selectedCurrency]
  );

  const totalVolume = useMemo(
    () => filtered.reduce((s, t) => s + t.amount, 0),
    [filtered]
  );

  const data = useMemo(() => {
    return {
      labels: series.map((s) => `T-${s.x}`),
      datasets: [
        {
          label: `${selectedCurrency} price`,
          data: series.map((s) => s.y),
          fill: true,
          backgroundColor: "rgba(25,118,210,0.08)",
          borderColor: "#1976d2",
          tension: 0.25,
          pointRadius: 0,
        },
      ],
    };
  }, [series, selectedCurrency]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { display: false },
      y: { ticks: { callback: (v) => v } },
    },
  };

  return (
    <section style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 900 }}>
      <h1 style={{ margin: 0 }}>Crypto Dashboard</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        Select a currency to view its price chart and transactions between users.
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <strong>Currency</strong>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            style={{ marginLeft: 8, padding: "6px 8px" }}
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div style={{ marginLeft: "auto", color: "#333" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Total volume ({selectedCurrency})</div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{totalVolume.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #eee", padding: 12, borderRadius: 6, height: 220 }}>
        {/* Chart.js line chart */}
        <Line data={data} options={options} />
      </div>

      {/* NEW: single big action button (navigates to dynamic user page using connectedUserId) */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => {
            if (connectedUserId) {
              router.push(`/uis/crypto/${encodeURIComponent(String(connectedUserId))}`);
            } else {
              // no connected user detected — navigate to generic /new where the crypto page will attempt to detect and redirect
              router.push(`/uis/crypto/new`);
            }
          }}
          style={{
            padding: "12px 20px",
            background: connectedUserId ? "#0b74de" : "#999",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            opacity: connectedUserId ? 1 : 0.95
          }}
          title={connectedUserId ? `Open wallet for ${connectedUserId}` : "No connected user detected"}
        >
          Make Transaction
        </button>
      </div>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "8px 0" }}>Transactions ({selectedCurrency})</h2>
        {filtered.length === 0 ? (
          <p style={{ color: "#777" }}>No transactions for {selectedCurrency}.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "8px 6px" }}>Date</th>
                <th style={{ padding: "8px 6px" }}>From (userId)</th>
                <th style={{ padding: "8px 6px" }}>To (userId)</th>
                <th style={{ padding: "8px 6px" }}>Amount</th>
                {/* removed Action column */}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #fafafa" }}>
                  <td style={{ padding: "8px 6px", color: "#555" }}>{t.date}</td>
                  <td style={{ padding: "8px 6px" }}>{t.fromId}</td>
                  <td style={{ padding: "8px 6px" }}>{t.toId}</td>
                  <td style={{ padding: "8px 6px", fontWeight: 600 }}>{t.amount}</td>
                  {/* removed per-row action button */}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}