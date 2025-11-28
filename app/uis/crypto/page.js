import Link from 'next/link';

const SAMPLE_COINS = [
  { id: 'bitcoin', name: 'Bitcoin (BTC)' },
  { id: 'ethereum', name: 'Ethereum (ETH)' },
  { id: 'cardano', name: 'Cardano (ADA)' }
];

export default function CryptoIndex() {
  return (
    <section>
      <h2 style={{ marginTop: 0 }}>Crypto Dashboard</h2>
      <p>A minimal starting page for the crypto/bitcoin section. Click a coin to open its crypto page.</p>

      <ul style={{ paddingLeft: 20 }}>
        {SAMPLE_COINS.map((coin) => (
          <li key={coin.id} style={{ margin: '0.5rem 0' }}>
            <Link href={`/uis/crypto/${coin.id}`} style={{ color: '#0366d6', textDecoration: 'none' }}>
              {coin.name}
            </Link>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 20, color: '#555' }}>
        <small>This is a simple placeholder. We'll add live data, charts and controls step by step.</small>
      </div>
    </section>
  );
}