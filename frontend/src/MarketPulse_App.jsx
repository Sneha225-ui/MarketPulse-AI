
import MarketMindChat from "./MarketMindChat";
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [history, setHistory] = useState([]);
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("marketpulse-watchlist") || "[]"); }
    catch { return []; }
  });
  const [researchCompany, setResearchCompany] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/stocks")

      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch stocks");
        }
        return response.json();
      })
      .then((data) => {
        setStocks(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Stock fetch error:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setCompanies([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`http://localhost:5000/api/companies?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to search companies");
          return response.json();
        })
        .then((data) => setCompanies(data.companies || []))
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Failed to search companies:", error);
            setCompanies([]);
          }
        });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search]);

  useEffect(() => {
    if (!selectedCompany) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }
    const controller = new AbortController();
    setHistory([]);
    setHistoryLoading(true);
    fetch(`http://localhost:5000/api/stocks/${encodeURIComponent(selectedCompany.symbol)}/history`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch historical prices");
        return response.json();
      })
      .then((data) => setHistory(Array.isArray(data) ? data : data.data || []))
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to load price history:", error);
          setHistory([]);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [selectedCompany]);

  useEffect(() => {
    localStorage.setItem("marketpulse-watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const filteredCompanies = companies.filter((company) =>
    company.symbol.toLowerCase().includes(search.toLowerCase()) ||
    company.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  const isWatched = (symbol) => watchlist.some((item) => item.symbol === symbol);
  const toggleWatchlist = (company) => {
    setWatchlist((current) => current.some((item) => item.symbol === company.symbol)
      ? current.filter((item) => item.symbol !== company.symbol)
      : [...current, company]);
  };
  const openResearch = (company) => {
    setSelectedCompany(company);
    setResearchCompany(company);
    setSearch("");
    setCompanies([]);
    setTimeout(() => document.getElementById("research")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">Market<span>Pulse</span></h2>

        <p className="menu-label">WORKSPACE</p>
        <nav>
          <a className="nav-link active" href="#dashboard">Dashboard</a>
          <a className="nav-link" href="#stocks">Stocks</a>
          <a className="nav-link" href="#research">Research</a>
          <a className="nav-link" href="#watchlist">Watchlist</a>
        </nav>

        <div className="sidebar-note">
          <p>Market data</p>
          <span>Development mode</span>
          <small>Sample prices only</small>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">MARKET WORKSPACE</p>
            <h1>Market overview</h1>
          </div>
          <span className="status-pill">● Demo mode</span>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">INDIA · NSE</p>
            <h2>Your market, in focus.</h2>
            <p>
              Explore stocks, follow companies, and build your research
              workspace.
            </p>
          </div>
          <div className="welcome-icon">↗</div>
        </section>

        
        
        <section className="search-section">
          <label htmlFor="stock-search">Search stocks or companies</label>
          
        <input
          id="stock-search"
          type="text"
          placeholder="Try TCS, INFY, Reliance..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
       />
       
{search.trim() && (
  <div className="company-search-results">
    {filteredCompanies.length > 0 ? (
      filteredCompanies.map((company) => (
        <div className="company-result" key={company.symbol}>
          <button type="button" onClick={() => { setSelectedCompany(company); setSearch(company.symbol); setCompanies([]); }}>
            <strong>{company.symbol}</strong> <span>{company.name}</span>
          </button>
          <button type="button" onClick={() => toggleWatchlist(company)}>
            {isWatched(company.symbol) ? "★ Saved" : "☆ Watch"}
          </button>
          <button type="button" onClick={() => openResearch(company)}>Research</button>
        </div>
      ))
    ) : (
      <p>No matching companies found.</p>
    )}
  </div>
)}


        </section>

      
{selectedCompany && (
  <section className="section" id="company-details">
    <div className="section-heading">
      <div>
        <h2>{selectedCompany.name}</h2>
        <p>{selectedCompany.symbol} · Historical market data</p>
      </div>
      <button onClick={() => setSelectedCompany(null)}>
        Close
      </button>
    </div>

    {history.length > 0 ? (
      <div className="stock-grid">
        {history.slice(-5).map((item, index) => (
          <article className="stock-card" key={item.date || item.timestamp || index}>
            <h3>{item.date || item.timestamp || `Record ${index + 1}`}</h3>
            <p>Open: {item.open ?? "—"}</p>
            <p>High: {item.high ?? "—"}</p>
            <p>Low: {item.low ?? "—"}</p>
            <p>Close: {item.close ?? "—"}</p>
            <p>Volume: {item.volume ?? "—"}</p>
          </article>
        ))}
      </div>
    ) : (
      <p className="message">
        No historical records found yet. Check the browser console if this continues.
      </p>
    )}
  </section>
)}


        <section className="section" id="stocks">
          <div className="section-heading">
            <div>
              <h2>Stocks to explore</h2>
              <p>Sample data for now — real market data comes next.</p>
            </div>
            <span className="count">{stocks.length} stocks</span>
          </div>

          {loading ? (
            <p className="message">Loading stocks...</p>
          ) : stocks.length > 0 ? (
            <div className="stock-grid">
              {stocks
                .filter((stock) =>
                  stock.symbol.toLowerCase().includes(search.toLowerCase())
                )
                .map((stock) => (
                <article className="stock-card" key={stock.symbol}>
                  <div className="card-top">
                    <div className="stock-avatar">
                      {stock.symbol.slice(0, 1)}
                    </div>
            
                    <span className="demo-tag">DEMO</span>
                  </div>

                  <h3>{stock.symbol}</h3>
                  <p className="stock-description">NSE-listed company</p>

                  <div className="card-bottom">
                    <div>
                      <p className="price">
                        ₹{stock.price.toLocaleString("en-IN")}
                      </p>
                      <p className="price-label">Sample price</p>
                    </div>
                    <span className="arrow-icon">↗</span>
                  </div>
                  <div className="stock-actions">
                    <button type="button" className="icon-action"
                      onClick={() => toggleWatchlist({ symbol: stock.symbol, name: stock.name || stock.symbol })}
                      title={isWatched(stock.symbol) ? "Remove from wishlist" : "Add to wishlist"}
                      aria-label={isWatched(stock.symbol) ? `Remove ${stock.symbol} from wishlist` : `Add ${stock.symbol} to wishlist`}
                      aria-pressed={isWatched(stock.symbol)}>
                      {isWatched(stock.symbol) ? "★" : "☆"}
                    </button>
                    <button type="button" className="icon-action"
                      onClick={() => openResearch({ symbol: stock.symbol, name: stock.name || stock.symbol })}
                      title={`Research ${stock.symbol}`} aria-label={`Research ${stock.symbol}`}>
                      ⌕
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="message">
              Unable to load stocks. Check that your backend is running.
            </p>
          )}
          
        </section>
        
        <section className="section" id="watchlist">
          <div className="section-heading"><div><h2>Your Watchlist</h2><p>Saved companies stay here after refresh.</p></div><span className="count">{watchlist.length} saved</span></div>
          {watchlist.length === 0 ? <p className="message">Your watchlist is empty. Add a company using the Watchlist button.</p> : (
            <div className="stock-grid">{watchlist.map((company) => (
              <article className="stock-card" key={company.symbol}>
                <h3>{company.symbol}</h3><p>{company.name}</p>
                <div className="stock-actions">
                  <button type="button" className="icon-action" onClick={() => openResearch(company)}
                    title={`Research ${company.symbol}`} aria-label={`Research ${company.symbol}`}>⌕</button>
                  <button type="button" className="icon-action remove-action" onClick={() => toggleWatchlist(company)}
                    title={`Remove ${company.symbol} from wishlist`} aria-label={`Remove ${company.symbol} from wishlist`}>×</button>
                </div>
              </article>
            ))}</div>
          )}
        </section>

        <section className="section" id="research">
          <div className="section-heading"><div><h2>Company Research</h2><p>Basic analysis from available historical price records.</p></div></div>
          {!researchCompany ? <p className="message">Click Research on a stock or search result to view its data here.</p> : (
            <div className="research-panel">
              <h3>{researchCompany.name} ({researchCompany.symbol})</h3>
              {historyLoading ? <p className="message">Loading historical data…</p> : history.length ? (
                <>
                  <p>Historical records available: {history.length}</p>
                  <p>Most recent record: {history[history.length - 1].date || history[history.length - 1].timestamp || "Date unavailable"}</p>
                  <p>Latest returned close: {history[history.length - 1].close ?? "Not provided"}</p>
                  {history.length > 1 && Number(history[0].close) !== 0 && Number.isFinite(Number(history[0].close)) && Number.isFinite(Number(history[history.length - 1].close)) && (
                    <p>Change from first to last returned close: {(((Number(history[history.length - 1].close) - Number(history[0].close)) / Number(history[0].close)) * 100).toFixed(2)}% (historical records only)</p>
                  )}
                  <p className="message">This is a simple historical calculation, not a prediction or investment recommendation.</p>
                </>
              ) : <p className="message">No historical records returned. News and company-profile data are not connected yet.</p>}
              <button type="button" onClick={() => setResearchCompany(null)}>Clear research</button>
            </div>
          )}
        </section>

        <section id="marketmind">
          <MarketMindChat />
      </section>
      
        <footer>
          MarketPulse · Learning project · Prices shown are not live.
        </footer>
      </main>
    </div>
  );
}

export default App;
