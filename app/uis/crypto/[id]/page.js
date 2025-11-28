'use client';

import { useEffect, useState } from 'react';

export default function CryptoDetailPage({ params }) {
  const { id } = params;
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Transaction form state
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);

  // Local mock transaction history
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    setLoading(true);
    // Mock fetch - replace with real API later
    const mockPrices = {
      bitcoin: 69500,
      ethereum: 3800,
      cardano: 0.45
    };

    const t = setTimeout(() => {
      setPrice(mockPrices[id] ?? null);
      setLoading(false);
    }, 400);

    return () => clearTimeout(t);
  }, [id]);

  function validateRecipient(recipient) {
    // Example simple validation: non-empty and contains at least one dash or alnum
    return typeof recipient === 'string' && recipient.trim().length >= 3;
  }

  async function handleSend(e) {
    e?.preventDefault?.();
    setMessage(null);

    if (!validateRecipient(recipientId)) {
      setMessage({ type: 'error', text: 'Please enter a valid recipient id (unique user id).' });
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter an amount greater than 0.' });
      return;
    }

    // Simulate sending transaction
    setSending(true);
    setTimeout(() => {
      const tx = {
        id: `tx-${Date.now()}`,
        to: recipientId.trim(),
        amount: numericAmount,
        currency: id,
        time: new Date().toISOString()
      };
      setTxs((prev) => [tx, ...prev]);
      setMessage({ type: 'success', text: `Sent ${numericAmount} ${id} to ${recipientId}` });
      setRecipientId('');
      setAmount('');
      setSending(false);
    }, 800);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, textTransform: 'capitalize' }}>{id.replace('-', ' ')}</h2>
        <div style={{ color: '#666', fontSize: 14 }}>Market snapshot (mock)</div>
      </div>

      <section style={{ marginTop: '1rem', background: '#fff', padding: '1rem', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div>Loading price…</div>
        ) : price == null ? (
          <div>No data for "{id}" (mock)</div>
        ) : (
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>${Number(price).toLocaleString()}</div>
              <div style={{ color: '#888', marginTop: 6 }}>24h change: +2.3% (mock)</div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ height: 80, background: '#f3f6fb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a3b0c2' }}>
                Chart placeholder
              </div>
            </div>

            {/* Transaction-only UI (no buy) */}
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: 12, color: '#444', marginBottom: 6 }}>Transactions only — send {id} to a user by their unique id</div>
              <form onSubmit={handleSend}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    aria-label="recipient id"
                    placeholder="Recipient user id (e.g. user-123)"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
                    disabled={sending}
                  />
                  <input
                    aria-label="amount"
                    placeholder={`Amount (${id})`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: 6,
                      border: 'none',
                      background: sending ? '#888' : '#0b74de',
                      color: '#fff',
                      cursor: sending ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {sending ? 'Sending…' : `Send ${id}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>

      <section style={{ marginTop: '1rem', color: '#555' }}>
        <h3 style={{ marginTop: 0 }}>Overview</h3>
        <p>This crypto-details page is transaction-only. There is no buy flow here — transactions are mock-simulated and sent by referencing the recipient unique id.</p>
      </section>

      <section style={{ marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Recent transactions (mock)</h3>
        {message && (
          <div style={{ marginBottom: 8, color: message.type === 'error' ? '#a33' : '#0a6', fontWeight: 600 }}>
            {message.text}
          </div>
        )}
        {txs.length === 0 ? (
          <div style={{ color: '#777' }}>No transactions yet. Use the form above to send {id} to a friend by their user id.</div>
        ) : (
          <ul style={{ paddingLeft: 16 }}>
            {txs.map((t) => (
              <li key={t.id} style={{ marginBottom: 8, background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #eee' }}>
                <div style={{ fontSize: 13, color: '#333' }}>
                  Sent <strong>{t.amount} {t.currency}</strong> to <code style={{ background: '#f4f6f8', padding: '2px 6px', borderRadius: 4 }}>{t.to}</code>
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{new Date(t.time).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}