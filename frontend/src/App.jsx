
import MarketMindChat from "./MarketMindChat";
import { useEffect, useMemo, useState } from "react";

const PERIODS = [
  { label: "1D", count: 1 },
  { label: "1W", count: 5 },
  { label: "1M", count: 20 },
  { label: "2M", count: 40 },
  { label: "3M", count: 60 }
];

const money = (v) => Number.isFinite(Number(v))
  ? `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
  : "—";

const number = (v) => Number.isFinite(Number(v))
  ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })
  : "—";

function PriceChart({ records, period, onPeriodChange }) {
  const selected = PERIODS.find(p => p.label === period) || PERIODS[4];
  const points = records.slice(-selected.count)
    .filter(r => Number.isFinite(Number(r.close)));

  if (!points.length) {
    return <div className="mp-chart-empty">Historical chart data unavailable.</div>;
  }

  const values = points.map(r => Number(r.close));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;

  const coords = values.map((v, i) => ({
    x: 12 + (i / Math.max(values.length - 1, 1)) * 976,
    y: 12 + ((max - v) / spread) * 216
  }));

  const line = coords.map(p => `${p.x},${p.y}`).join(" ");
  const area = `12,240 ${line} 988,240`;
  const first = values[0];
  const last = values[values.length - 1];
  const change = first ? ((last - first) / first) * 100 : 0;
  const up = change >= 0;

  return (
    <div className="mp-chart-wrap">
      <div className="mp-chart-head">
        <div>
          <span className="mp-muted">LATEST RECORDED CLOSE</span>
          <div className="mp-chart-price">{money(last)}</div>
        </div>
        <div className={`mp-change ${up ? "positive" : "negative"}`}>
          {up ? "↗" : "↘"} {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
          <small> over selected records</small>
        </div>
      </div>

      <svg className="mp-chart" viewBox="0 0 1000 250"
        preserveAspectRatio="none"
        role="img"
        aria-label="Historical closing price chart">
        <defs>
          <linearGradient id="mpArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#19c69a" stopOpacity=".28" />
            <stop offset="100%" stopColor="#19c69a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[55, 115, 175, 235].map(y => (
          <line key={y} x1="0" x2="1000" y1={y} y2={y}
            stroke="#283442" strokeDasharray="5 8" />
        ))}

        <polygon points={area} fill="url(#mpArea)" />
        <polyline points={line} fill="none"
          stroke={up ? "#18c99a" : "#ff6b72"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke" />

        <circle cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r="5" fill={up ? "#18c99a" : "#ff6b72"} />
      </svg>

      <div className="mp-chart-dates">
        <span>{points[0].date || "Oldest record"}</span>
        <span>{points[points.length - 1].date || "Latest record"}</span>
      </div>

      <div className="mp-periods">
        {PERIODS.map(item => (
          <button key={item.label}
            className={period === item.label ? "selected" : ""}
            onClick={() => onPeriodChange(item.label)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="mp-chart-note">
        Daily historical closing records. Not intraday/live ticks.
      </div>
    </div>
  );
}

function App() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [period, setPeriod] = useState("3M");

  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("marketpulse-watchlist") || "[]");
    } catch {
      return [];
    }
  });

  const [researchCompany, setResearchCompany] = useState(null);
  const [aiResearch, setAiResearch] = useState(null);
  const [aiResearchLoading, setAiResearchLoading] = useState(false);
  const [aiResearchError, setAiResearchError] = useState("");
  const [activeInsight, setActiveInsight] = useState("overview");

  useEffect(() => {
    fetch("http://localhost:5000/api/stocks")
      .then(r => {
        if (!r.ok) throw new Error("Stocks unavailable");
        return r.json();
      })
      .then(setStocks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setCompanies([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetch(
        `http://localhost:5000/api/companies?q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      )
        .then(r => {
          if (!r.ok) throw new Error("Company search failed");
          return r.json();
        })
        .then(data => setCompanies(data.companies || []))
        .catch(e => {
          if (e.name !== "AbortError") setCompanies([]);
        });
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  useEffect(() => {
    if (!selectedCompany?.symbol) {
      setHistory([]);
      return;
    }

    const controller = new AbortController();
    setHistoryLoading(true);

    fetch(
      `http://localhost:5000/api/stocks/${encodeURIComponent(selectedCompany.symbol)}/history`,
      { signal: controller.signal }
    )
      .then(r => {
        if (!r.ok) throw new Error("Historical data unavailable");
        return r.json();
      })
      .then(data => setHistory(Array.isArray(data) ? data : data.data || []))
      .catch(e => {
        if (e.name !== "AbortError") {
          console.error(e);
          setHistory([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });

    return () => controller.abort();
  }, [selectedCompany]);

  useEffect(() => {
    localStorage.setItem("marketpulse-watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const filteredCompanies = useMemo(() =>
    companies.filter(c =>
      c.symbol?.toLowerCase().includes(search.toLowerCase()) ||
      c.name?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 15),
    [companies, search]
  );

  const latest = history.length ? history[history.length - 1] : null;
  const previous = history.length > 1 ? history[history.length - 2] : null;

  const dailyChange = latest && previous && Number(previous.close)
    ? ((Number(latest.close) - Number(previous.close)) /
        Number(previous.close)) * 100
    : null;

  const indicators =
    aiResearch?.analysis?.technical_indicators ||
    aiResearch?.analysis || {};

  const marketContext = aiResearch?.analysis?.market_context || {};

  const isWatched = symbol =>
    watchlist.some(item => item.symbol === symbol);

  const toggleWatchlist = company => {
    setWatchlist(current =>
      current.some(item => item.symbol === company.symbol)
        ? current.filter(item => item.symbol !== company.symbol)
        : [...current, company]
    );
  };

  const openResearch = company => {
    setSelectedCompany(company);
    setResearchCompany(company);
    setAiResearch(null);
    setAiResearchError("");
    setSearch("");
    setCompanies([]);
    setActiveInsight("overview");

    setTimeout(() =>
      document.getElementById("research")
        ?.scrollIntoView({ behavior: "smooth" }), 60
    );
  };

  const runAIResearch = async () => {
    if (!researchCompany?.symbol) return;

    setAiResearchLoading(true);
    setAiResearchError("");
    setAiResearch(null);

    try {
      const response = await fetch(
        "http://localhost:5000/api/ai/research",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: researchCompany.symbol })
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "AI research failed");
      }

      setAiResearch(data);
    } catch (e) {
      setAiResearchError(e.message || "Could not generate report");
    } finally {
      setAiResearchLoading(false);
    }
  };

  const reportSections = (aiResearch?.report || "")
    .split(/\n(?=\s*(?:\d+\.|#{1,3}\s))/g)
    .filter(Boolean);

  return (
    <div className="mp-app">
      <style>{`
        *{box-sizing:border-box}
        .mp-app{min-height:100vh;background:#080d12;color:#edf3f5;font-family:Inter,Segoe UI,Arial,sans-serif;display:flex}
        .mp-sidebar{width:230px;flex-shrink:0;position:fixed;inset:0 auto 0 0;background:#0b1219;border-right:1px solid #1e2a32;padding:28px 18px;display:flex;flex-direction:column;z-index:5}
        .mp-logo{font-size:24px;font-weight:800;letter-spacing:-1px;margin:0 0 42px}
        .mp-logo span{color:#17c99a}
        .mp-side-label{font-size:10px;letter-spacing:1.8px;color:#71818a;font-weight:700;margin:0 0 12px 10px}
        .mp-nav{display:grid;gap:6px}
        .mp-nav a{color:#9aabb2;text-decoration:none;padding:12px;border-radius:9px;font-size:13px}
        .mp-nav a:hover,.mp-nav a.active{background:#122a28;color:#24d2a4}
        .mp-side-foot{margin-top:auto;padding:14px;border:1px solid #25343b;border-radius:12px;color:#9aabb2;font-size:12px;line-height:1.6}
        .mp-side-foot strong{color:#e9f1f2;display:block}
        .mp-main{width:calc(100% - 230px);margin-left:230px;padding:30px 38px 50px;max-width:1600px}
        .mp-top{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:26px}
        .mp-eyebrow{font-size:10px;letter-spacing:1.8px;color:#7d9098;font-weight:700;margin:0 0 7px}
        .mp-top h1{font-size:26px;margin:0;letter-spacing:-.7px}
        .mp-status{border:1px solid #34443f;color:#24d2a4;border-radius:30px;padding:8px 12px;font-size:11px}
        .mp-welcome{border:1px solid #1c4540;background:linear-gradient(110deg,#102824,#101d27 75%);padding:24px 26px;border-radius:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
        .mp-welcome h2{margin:0 0 8px;font-size:23px}
        .mp-welcome p{color:#9eb0b4;margin:0;font-size:13px}
        .mp-search{position:relative;margin:24px 0 30px}
        .mp-search label{display:block;color:#9eafb5;font-size:12px;margin-bottom:9px}
        .mp-search input{width:100%;max-width:620px;padding:14px 16px;border:1px solid #2b3a42;background:#0d171e;color:#eef5f5;border-radius:10px;font-size:14px;outline:none}
        .mp-search input:focus{border-color:#18bd94}
        .mp-results{position:absolute;z-index:8;top:68px;left:0;width:min(620px,100%);background:#111d24;border:1px solid #30434a;border-radius:12px;overflow:hidden;box-shadow:0 16px 40px #0009}
        .mp-result{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid #26343a}
        .mp-result-main{flex:1;text-align:left;background:none;border:0;color:#eaf1f1;cursor:pointer}
        .mp-result-main strong{display:block}
        .mp-result-main small{color:#90a2a8}
        .mp-btn,.mp-icon-btn{background:#14251f;border:1px solid #2a5145;color:#39d7aa;border-radius:8px;padding:8px 11px;cursor:pointer}
        .mp-btn:disabled{opacity:.5;cursor:wait}
        .mp-section{margin:28px 0}
        .mp-section-head{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:15px}
        .mp-section-head h2{font-size:18px;margin:0}
        .mp-section-head p{color:#7f929a;font-size:12px;margin:6px 0 0}
        .mp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}
        .mp-card{background:#0d171e;border:1px solid #22323a;border-radius:13px;padding:17px}
        .mp-card:hover{border-color:#326b5d}
        .mp-card-top{display:flex;justify-content:space-between;color:#91a3a8;font-size:11px}
        .mp-card h3{font-size:17px;margin:18px 0 5px}
        .mp-card .mp-price{font-size:21px;font-weight:750;margin:0}
        .mp-muted{font-size:10px;color:#84979e;letter-spacing:.8px}
        .mp-research{background:#0b141a;border:1px solid #24343c;border-radius:17px;overflow:hidden}
        .mp-stock-head{padding:24px 25px 18px;border-bottom:1px solid #203039;display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
        .mp-stock-name{font-size:12px;color:#8fa2a9}
        .mp-stock-head h2{font-size:22px;margin:5px 0 12px}
        .mp-big-price{font-size:34px;font-weight:800;letter-spacing:-1px}
        .mp-delta{font-size:13px;margin-top:4px}
        .positive{color:#21c99a}.negative{color:#ff7378}
        .mp-chart-wrap{padding:18px 24px 20px}
        .mp-chart-head{display:flex;align-items:end;justify-content:space-between}
        .mp-chart-price{font-size:28px;font-weight:800;margin-top:5px}
        .mp-change{font-size:14px;font-weight:700}
        .mp-change small{font-weight:400;color:#84969d}
        .mp-chart{width:100%;height:255px;display:block;margin-top:12px;overflow:visible}
        .mp-chart-dates{display:flex;justify-content:space-between;color:#84969d;font-size:10px}
        .mp-periods{display:flex;gap:7px;flex-wrap:wrap;margin-top:17px}
        .mp-periods button{background:transparent;border:1px solid transparent;color:#8ea0a6;padding:7px 13px;border-radius:20px;font-size:11px;cursor:pointer}
        .mp-periods button.selected{border-color:#20bd92;color:#2bd4a7;background:#102c27}
        .mp-chart-note{font-size:10px;color:#71848b;margin-top:13px}
        .mp-chart-empty{padding:55px 20px;text-align:center;color:#8da0a6}
        .mp-tabs{display:flex;gap:8px;padding:15px 22px;border-top:1px solid #203039;border-bottom:1px solid #203039;overflow:auto}
        .mp-tabs button{white-space:nowrap;background:none;border:0;color:#8ea0a6;padding:9px 13px;cursor:pointer;border-bottom:2px solid transparent}
        .mp-tabs button.active{color:#25d0a1;border-color:#25d0a1}
        .mp-insights{padding:22px}
        .mp-insight-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .mp-metric{background:#101e25;border:1px solid #263941;border-radius:11px;padding:15px}
        .mp-metric span{display:block;color:#8ba0a6;font-size:11px}
        .mp-metric strong{display:block;font-size:20px;margin-top:8px}
        .mp-metric small{display:block;color:#7e9298;margin-top:5px;font-size:10px}
        .mp-panel{background:#101b22;border:1px solid #263740;border-radius:12px;padding:17px;margin-top:14px}
        .mp-panel h3{font-size:14px;margin:0 0 12px}
        .mp-report{white-space:pre-wrap;color:#c0cdd0;font-size:13px;line-height:1.75}
        .mp-report p{margin:0 0 12px}
        .mp-error{color:#ff8989;font-size:12px}
        .mp-stock-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}
        .mp-watch-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .mp-empty{color:#87999f;font-size:13px;padding:16px 0}
        .mp-footer{border-top:1px solid #1d2b32;margin-top:40px;padding-top:18px;color:#6f8289;font-size:11px;line-height:1.6}
        @media(max-width:1050px){.mp-grid,.mp-stock-list{grid-template-columns:repeat(2,minmax(0,1fr))}.mp-insight-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:760px){.mp-app{display:block}.mp-sidebar{position:static;width:100%;padding:15px 17px}.mp-logo{margin:0 0 12px}.mp-side-label,.mp-side-foot{display:none}.mp-nav{display:flex;overflow:auto}.mp-nav a{white-space:nowrap;padding:9px 11px}.mp-main{width:100%;margin:0;padding:18px 14px 36px}.mp-top h1{font-size:21px}.mp-welcome{padding:18px}.mp-welcome h2{font-size:19px}.mp-grid,.mp-stock-list{grid-template-columns:repeat(2,minmax(0,1fr))}.mp-insight-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mp-stock-head{padding:18px;display:block}.mp-stock-head .mp-btn{margin-top:14px}.mp-chart-wrap{padding:16px}.mp-chart{height:190px}.mp-chart-price{font-size:25px}.mp-tabs{padding:12px}.mp-insights{padding:15px}}
        @media(max-width:390px){.mp-grid,.mp-stock-list,.mp-insight-grid{grid-template-columns:1fr}.mp-big-price{font-size:29px}}
      `}</style>

      <aside className="mp-sidebar">
        <h2 className="mp-logo">Market<span>Pulse</span></h2>
        <p className="mp-side-label">WORKSPACE</p>
        <nav className="mp-nav">
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="#stocks">Stocks</a>
          <a href="#research">Research</a>
          <a href="#watchlist">Watchlist</a>
        </nav>
        <div className="mp-side-foot">
          <strong>Market data</strong>
          Historical NSE records<br />
          AI research · Development build
        </div>
      </aside>

      <main className="mp-main" id="dashboard">
        <header className="mp-top">
          <div>
            <p className="mp-eyebrow">INDIA · NSE MARKET WORKSPACE</p>
            <h1>Market overview</h1>
          </div>
          <span className="mp-status">● Data-connected demo</span>
        </header>

        <section className="mp-welcome">
          <div>
            <h2>Research beyond the numbers.</h2>
            <p>Explore historical price action, technical signals and AI-generated market insights.</p>
          </div>
          <span style={{ fontSize: 34, color: "#20c99b" }}>↗</span>
        </section>

        <section className="mp-search">
          <label htmlFor="mp-search">Search NSE stocks and companies</label>
          <input id="mp-search" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search TCS, INFY, Reliance..." />

          {search.trim() && (
            <div className="mp-results">
              {filteredCompanies.length ? filteredCompanies.map(company => (
                <div className="mp-result" key={company.symbol}>
                  <button className="mp-result-main"
                    onClick={() => { setSelectedCompany(company); setSearch(""); }}>
                    <strong>{company.symbol}</strong>
                    <small>{company.name}</small>
                  </button>
                  <button className="mp-btn"
                    onClick={() => toggleWatchlist(company)}>
                    {isWatched(company.symbol) ? "★ Saved" : "☆ Watch"}
                  </button>
                  <button className="mp-btn"
                    onClick={() => openResearch(company)}>Research</button>
                </div>
              )) : <div className="mp-empty">Searching NSE company list…</div>}
            </div>
          )}
        </section>

        {selectedCompany && (
          <section className="mp-section" id="company-details">
            <div className="mp-section-head">
              <div>
                <h2>{selectedCompany.name}</h2>
                <p>{selectedCompany.symbol} · Historical market records</p>
              </div>
              <button className="mp-btn"
                onClick={() => setSelectedCompany(null)}>Close</button>
            </div>
            {historyLoading
              ? <p className="mp-empty">Loading historical records…</p>
              : <div className="mp-grid">
                {history.slice(-4).map((row, i) => (
                  <div className="mp-card" key={row.date || i}>
                    <span className="mp-muted">{row.date || `Record ${i + 1}`}</span>
                    <h3>Close {money(row.close)}</h3>
                    <span className="mp-muted">
                      O {money(row.open)} · H {money(row.high)} · L {money(row.low)}
                    </span>
                  </div>
                ))}
              </div>
            }
          </section>
        )}

        <section className="mp-section" id="research">
          <div className="mp-section-head">
            <div>
              <h2>Company research</h2>
              <p>Price action first. Evidence-led insights below.</p>
            </div>
          </div>

          {!researchCompany ? (
            <div className="mp-research">
              <div className="mp-empty" style={{ padding: 28 }}>
                Search for a company and select <b>Research</b> to open its market workspace.
              </div>
            </div>
          ) : (
            <div className="mp-research">
              <div className="mp-stock-head">
                <div>
                  <div className="mp-stock-name">
                    {researchCompany.symbol} · NSE · Historical data
                  </div>
                  <h2>{researchCompany.name}</h2>
                  <div className="mp-big-price">{money(latest?.close)}</div>
                  <div className={`mp-delta ${dailyChange >= 0 ? "positive" : "negative"}`}>
                    {dailyChange == null ? "Change unavailable" :
                      `${dailyChange >= 0 ? "+" : ""}${dailyChange.toFixed(2)}% vs previous returned record`}
                    <span style={{ color: "#82949a" }}> · {latest?.date || "Latest returned record"}</span>
                  </div>
                </div>
                <div>
                  <button className="mp-btn"
                    onClick={() => toggleWatchlist(researchCompany)}>
                    {isWatched(researchCompany.symbol) ? "★ In watchlist" : "☆ Add to watchlist"}
                  </button>
                </div>
              </div>

              {historyLoading
                ? <div className="mp-chart-empty">Loading price chart…</div>
                : <PriceChart records={history} period={period} onPeriodChange={setPeriod} />
              }

              <div className="mp-tabs">
                <button className={activeInsight === "overview" ? "active" : ""}
                  onClick={() => setActiveInsight("overview")}>Overview</button>
                <button className={activeInsight === "technical" ? "active" : ""}
                  onClick={() => setActiveInsight("technical")}>Technicals</button>
                <button className={activeInsight === "ai" ? "active" : ""}
                  onClick={() => setActiveInsight("ai")}>AI Insights</button>
              </div>

              <div className="mp-insights">
                {activeInsight === "overview" && (
                  <>
                    <div className="mp-insight-grid">
                      <div className="mp-metric">
                        <span>Latest recorded close</span>
                        <strong>{money(latest?.close)}</strong>
                        <small>{latest?.date || "Date unavailable"}</small>
                      </div>
                      <div className="mp-metric">
                        <span>Previous close</span>
                        <strong>{money(previous?.close)}</strong>
                        <small>Previous returned record</small>
                      </div>
                      <div className="mp-metric">
                        <span>Day range</span>
                        <strong>{money(latest?.low)} – {money(latest?.high)}</strong>
                        <small>Latest returned OHLC record</small>
                      </div>
                      <div className="mp-metric">
                        <span>Volume</span>
                        <strong>{number(latest?.volume)}</strong>
                        <small>Latest returned record</small>
                      </div>
                    </div>
                    <div className="mp-panel">
                      <h3>Historical data coverage</h3>
                      <div className="mp-report">
                        {history.length} OHLCV records returned
                        {history.length ? `, from ${history[0].date || "earliest available record"} to ${latest?.date || "latest available record"}.` : "."}
                        {" "}Values represent provider-returned historical records and may not be live.
                      </div>
                    </div>
                  </>
                )}

                {activeInsight === "technical" && (
                  <>
                    <div className="mp-insight-grid">
                      <div className="mp-metric">
                        <span>RSI (14)</span>
                        <strong>{number(indicators.rsi_14)}</strong>
                        <small>
                          {Number(indicators.rsi_14) > 70 ? "Potentially overbought" :
                            Number(indicators.rsi_14) < 30 ? "Potentially oversold" :
                              "Within 30–70 range"}
                        </small>
                      </div>
                      <div className="mp-metric">
                        <span>SMA 20</span>
                        <strong>{money(indicators.sma_20)}</strong>
                        <small>20-record simple average</small>
                      </div>
                      <div className="mp-metric">
                        <span>SMA 50</span>
                        <strong>{money(indicators.sma_50)}</strong>
                        <small>50-record simple average</small>
                      </div>
                      <div className="mp-metric">
                        <span>Average volume (20)</span>
                        <strong>{number(indicators.average_volume_20 ?? marketContext.average_volume_20_records)}</strong>
                        <small>Records-based average</small>
                      </div>
                      <div className="mp-metric">
                        <span>5-record return</span>
                        <strong>{marketContext.return_5_records_percent == null ? "—" : `${marketContext.return_5_records_percent}%`}</strong>
                        <small>Historical return</small>
                      </div>
                      <div className="mp-metric">
                        <span>20-record return</span>
                        <strong>{marketContext.return_20_records_percent == null ? "—" : `${marketContext.return_20_records_percent}%`}</strong>
                        <small>Historical return</small>
                      </div>
                    </div>
                    <div className="mp-panel">
                      <h3>Technical interpretation</h3>
                      <div className="mp-report">
                        Generate AI research to receive an interpretation of the indicators. Indicators are descriptive, not predictions.
                      </div>
                    </div>
                  </>
                )}

                {activeInsight === "ai" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ margin: "0 0 5px" }}>MarketPulse AI Insights</h3>
                        <span className="mp-muted">Historical price and technical research</span>
                      </div>
                      <button className="mp-btn"
                        onClick={runAIResearch}
                        disabled={aiResearchLoading}>
                        {aiResearchLoading ? "Analysing…" :
                          aiResearch ? "Regenerate report" : "✦ Generate AI insights"}
                      </button>
                    </div>

                    {aiResearchError && <p className="mp-error">{aiResearchError}</p>}

                    {!aiResearch && !aiResearchLoading && (
                      <div className="mp-panel">
                        <div className="mp-empty">
                          Generate an AI report for trend interpretation, bullish and bearish evidence, risk factors and scenario analysis.
                        </div>
                      </div>
                    )}

                    {aiResearchLoading && (
                      <div className="mp-panel">
                        <div className="mp-empty">
                          Analysing historical records with your local AI model. This may take a little while…
                        </div>
                      </div>
                    )}

                    {aiResearch && (
                      <>
                        <div className="mp-insight-grid" style={{ marginTop: 15 }}>
                          <div className="mp-metric">
                            <span>RSI (14)</span>
                            <strong>{number(indicators.rsi_14)}</strong>
                            <small>Momentum indicator</small>
                          </div>
                          <div className="mp-metric">
                            <span>SMA 20</span>
                            <strong>{money(indicators.sma_20)}</strong>
                            <small>Shorter trend reference</small>
                          </div>
                          <div className="mp-metric">
                            <span>SMA 50</span>
                            <strong>{money(indicators.sma_50)}</strong>
                            <small>Longer trend reference</small>
                          </div>
                        </div>
                        <div className="mp-panel">
                          <h3>AI research report</h3>
                          <div className="mp-report">
                            {reportSections.length
                              ? reportSections.map((section, i) => <p key={i}>{section}</p>)
                              : aiResearch.report || "No report text returned."}
                          </div>
                          <small className="mp-muted">
                            Generated from available historical records. Not investment advice. News and company fundamentals are not included.
                          </small>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mp-section" id="stocks">
          <div className="mp-section-head">
            <div>
              <h2>Stocks to explore</h2>
              <p>Sample dashboard cards; use search for NSE company history.</p>
            </div>
            <span className="mp-status">{stocks.length} sample symbols</span>
          </div>

          {loading ? <p className="mp-empty">Loading…</p> : (
            <div className="mp-stock-list">
              {stocks.map(stock => (
                <article className="mp-card" key={stock.symbol}>
                  <div className="mp-card-top">
                    <span>NSE · {stock.symbol}</span>
                    <button className="mp-icon-btn"
                      onClick={() => toggleWatchlist({
                        symbol: stock.symbol,
                        name: stock.name || stock.symbol
                      })}>
                      {isWatched(stock.symbol) ? "★" : "☆"}
                    </button>
                  </div>
                  <h3>{stock.name || stock.symbol}</h3>
                  <p className="mp-price">{money(stock.price)}</p>
                  <span className="mp-muted">Sample display price</span>
                  <div style={{ marginTop: 14 }}>
                    <button className="mp-btn"
                      onClick={() => openResearch({
                        symbol: stock.symbol,
                        name: stock.name || stock.symbol
                      })}>
                      Research ↗
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mp-section" id="watchlist">
          <div className="mp-section-head">
            <div>
              <h2>Your watchlist</h2>
              <p>Saved companies stay here after refresh.</p>
            </div>
            <span className="mp-muted">{watchlist.length} saved</span>
          </div>

          {watchlist.length ? (
            <div className="mp-stock-list">
              {watchlist.map(company => (
                <article className="mp-card" key={company.symbol}>
                  <div className="mp-watch-row">
                    <div>
                      <h3 style={{ margin: "0 0 5px" }}>{company.symbol}</h3>
                      <span className="mp-muted">{company.name}</span>
                    </div>
                    <button className="mp-btn"
                      onClick={() => openResearch(company)}>Research</button>
                    <button className="mp-icon-btn"
                      onClick={() => toggleWatchlist(company)}>×</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mp-empty">
              Your watchlist is empty. Save a company from search or research.
            </p>
          )}
        </section>

        <section className="mp-section" id="marketmind">
          <div className="mp-section-head">
            <div>
              <h2>MarketMind assistant</h2>
              <p>Ask questions about your market research.</p>
            </div>
          </div>
          <MarketMindChat />
        </section>

        <footer className="mp-footer">
          MarketPulse · AI-powered NSE research learning project.
          Sample dashboard card prices are demo values; research charts use
          returned historical records. Not investment advice.
        </footer>
      </main>
    </div>
  );
}

export default App;
