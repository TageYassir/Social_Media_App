export default function CryptoLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Inter, system-ui, Arial' }}>
      <header style={{ padding: '1rem 1.25rem', background: '#0b1221', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: '1.1rem' }}>User Space — Crypto</h1>
          <nav>
            <a href="/uis/crypto" style={{ color: '#9fb4ff', textDecoration: 'none', marginRight: 12 }}>Dashboard</a>
            <a href="/" style={{ color: '#9fb4ff', textDecoration: 'none' }}>Home</a>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, padding: '1.5rem', background: '#f5f7fb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>{children}</div>
      </main>

      <footer style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: '#666', fontSize: 13 }}>
        © {new Date().getFullYear()} — Crypto section
      </footer>
    </div>
  );
}