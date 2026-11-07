
import { useEffect, useState } from "react";
import "./MarketMindChat.css";

const API_BASE = "http://localhost:5000";

const STARTERS = [
  "What does this company do?",
  "Summarize its recent stock performance",
  "What information should I research before investing?",
  "Generate AI research report",
];

export default function MarketMindChat() {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState(null);
  const [searching, setSearching] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm MarketMind. Search for an NSE-listed company, explore its historical prices, or generate an AI-powered technical research report.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  // Company search
  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setCompanies([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(
          `${API_BASE}/api/companies?q=${encodeURIComponent(term)}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Company search failed");

        const result = await response.json();
        const list = Array.isArray(result)
          ? result
          : result.companies || result.data || [];

        setCompanies(list.slice(0, 8));
      } catch (error) {
        if (error.name !== "AbortError") setCompanies([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function selectCompany(item) {
    setCompany(item);
    setQuery(item.symbol || item.name || item.companyName || "");
    setCompanies([]);

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        text: `Selected ${item.symbol} — ${
          item.name || item.companyName || item.symbol
        }. You can now explore historical performance or generate a detailed AI research report.`,
      },
    ]);
  }

  // Historical stock summary
  async function getHistoricalSummary(clean) {
    const response = await fetch(
      `${API_BASE}/api/stocks/${encodeURIComponent(company.symbol)}/history`
    );

    if (!response.ok) {
      throw new Error("Stock history endpoint returned an error.");
    }

    const result = await response.json();
    const rows = Array.isArray(result)
      ? result
      : result.data || result.history || [];

    if (!rows.length) {
      return `No historical price records were found for ${company.symbol}.`;
    }

    const normalized = rows
      .map((row) => ({
        date: row.date || row.timestamp || row.tradedate || "Unknown date",
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close ?? row.last),
        volume: Number(row.volume),
      }))
      .filter((row) => Number.isFinite(row.close));

    const latest = normalized[normalized.length - 1];
    const first = normalized[0];
    const change = latest.close - first.close;
    const pct = first.close ? (change / first.close) * 100 : 0;
    const recent = normalized.slice(-5).reverse();

    const money = (value) =>
      Number.isFinite(value)
        ? `₹${value.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
          })}`
        : "not supplied";

    return `Historical price summary for ${company.symbol} (${
      company.name || company.companyName || company.symbol
    }):

• Latest available close: ${money(latest.close)} (${latest.date}).
• First-to-last change across ${normalized.length} records: ${
      change >= 0 ? "+" : ""
    }${money(change)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%).

Recent returned records:
${recent
  .map(
    (row) =>
      `• ${row.date}: close ${money(row.close)}, high ${money(
        row.high
      )}, low ${money(row.low)}, volume ${
        Number.isFinite(row.volume)
          ? row.volume.toLocaleString("en-IN")
          : "not supplied"
      }`
  )
  .join("\n")}

This uses returned historical API records, not a live quote or prediction.`;
  }

  // LangGraph + Ollama AI research
  async function getAIResearch() {
    setLoadingText("MarketMind AI is analyzing stock data...");

    const response = await fetch(`${API_BASE}/api/ai/research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol: company.symbol,
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(
        result.error || "AI research could not be generated."
      );
    }

    if (!result.report) {
      throw new Error("The AI engine returned an empty research report.");
    }

    return `AI RESEARCH REPORT — ${result.symbol}

${result.report}

Data source: NSE historical records.
Records available: ${result.data_meta?.count ?? "Not supplied"}.
Research generated by MarketPulse AI using LangGraph and Ollama.

This report is for educational research only, not financial advice.`;
  }

  // Chat handler
  async function sendQuestion(text = question) {
    const clean = text.trim();

    if (!clean || loading) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: clean },
    ]);

    setQuestion("");
    setLoading(true);
    setLoadingText("Looking up available data...");

    try {
      if (!company?.symbol) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            text: "Please search for and select an NSE company first.",
          },
        ]);
        return;
      }

      const lowerQuestion = clean.toLowerCase();

      const wantsAI =
        lowerQuestion.includes("generate ai research") ||
        lowerQuestion.includes("ai research report") ||
        lowerQuestion.includes("detailed stock research") ||
        lowerQuestion.includes("technical analysis report") ||
        lowerQuestion.includes("analyze this stock");

      let answer = "";

      if (wantsAI) {
        answer = await getAIResearch();
      } else if (
        lowerQuestion.includes("performance") ||
        lowerQuestion.includes("history") ||
        lowerQuestion.includes("price") ||
        lowerQuestion.includes("trend") ||
        lowerQuestion.includes("movement")
      ) {
        answer = await getHistoricalSummary(clean);
      } else if (
        lowerQuestion.includes("news") ||
        lowerQuestion.includes("latest update") ||
        lowerQuestion.includes("recent update")
      ) {
        answer =
          "A verified news feed is not connected yet. MarketMind currently retrieves historical stock records and generates technical research reports.";
      } else if (
        lowerQuestion.includes("what does") ||
        lowerQuestion.includes("business") ||
        lowerQuestion.includes("company do") ||
        lowerQuestion.includes("profile")
      ) {
        answer = `I found ${company.symbol} in the NSE company list as ${
          company.name || company.companyName || company.symbol
        }. A verified company profile source is not connected yet, so I cannot confirm its business details from the available data.`;
      } else if (
        lowerQuestion.includes("risk") ||
        lowerQuestion.includes("invest") ||
        lowerQuestion.includes("should i buy") ||
        lowerQuestion.includes("recommend")
      ) {
        answer = `Before making an investment decision about ${
          company.symbol
        }, research its official results, debt, cash flow, valuation, competition, risks and recent announcements.

You can also ask MarketMind to generate an AI research report for its available technical indicators and historical market data. The report is not a buy/sell recommendation.`;
      } else {
        answer =
          `For ${company.symbol}, I can retrieve historical price performance or generate a detailed AI research report. Try the Generate AI research report option below.`;
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: answer,
          isReport: wantsAI,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `MarketMind couldn't complete this request: ${error.message}

Check that the Node backend, Python AI engine and Ollama are running.`,
        },
      ]);
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  }

  return (
    <section className="marketmind-page">
      <header className="marketmind-header">
        <div className="marketmind-logo">M</div>

        <div>
          <h2>MarketMind AI</h2>
          <p>Your company research assistant · AI-powered prototype</p>
        </div>

        <span className="marketmind-status">
          <i /> Data-connected
        </span>
      </header>

      <div className="marketmind-company-search">
        <label htmlFor="marketmind-company">
          Find an NSE-listed company
        </label>

        <div className="marketmind-search-wrap">
          <input
            id="marketmind-company"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company name or symbol (e.g. Reliance)"
            autoComplete="off"
          />

          {searching && (
            <span className="marketmind-search-status">
              Searching…
            </span>
          )}

          {companies.length > 0 && (
            <div className="marketmind-results">
              {companies.map((item, index) => (
                <button
                  type="button"
                  key={`${item.symbol || item.name}-${index}`}
                  onClick={() => selectCompany(item)}
                >
                  <strong>{item.symbol || "NSE"}</strong>
                  <span>
                    {item.name || item.companyName || "Company"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {company && (
          <div className="marketmind-selected">
            <span>Selected company</span>
            <strong>{company.symbol}</strong>
            <span>{company.name || company.companyName || ""}</span>
          </div>
        )}
      </div>

      <div className="marketmind-chat">
        <div className="marketmind-messages" aria-live="polite">
          {messages.map((message, index) => (
            <div
              className={`marketmind-message ${message.role}`}
              key={`${message.role}-${index}`}
            >
              {message.role === "assistant" && (
                <span className="marketmind-avatar">M</span>
              )}

              <div
                className={`marketmind-bubble ${
                  message.isReport ? "marketmind-ai-report" : ""
                }`}
              >
                <span className="marketmind-role">
                  {message.role === "assistant" ? "MarketMind" : "You"}
                </span>

                <p style={{ whiteSpace: "pre-wrap" }}>
                  {message.text}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="marketmind-thinking">
              {loadingText || "MarketMind is thinking…"}
            </div>
          )}
        </div>

        <div className="marketmind-starters">
          {STARTERS.map((starter) => (
            <button
              type="button"
              key={starter}
              onClick={() => sendQuestion(starter)}
              disabled={loading}
            >
              {starter}
            </button>
          ))}
        </div>

        <form
          className="marketmind-composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendQuestion();
          }}
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about a company, its price history, or research..."
            aria-label="Ask MarketMind a question"
          />

          <button
            type="submit"
            disabled={loading || !question.trim()}
          >
            {loading ? "…" : "Send ↑"}
          </button>
        </form>

        <p className="marketmind-disclaimer">
          MarketMind combines retrieved NSE historical records,
          technical indicators and AI-generated research. Company
          fundamentals and verified news are not connected yet.
          Research is educational, not financial advice.
        </p>
      </div>
    </section>
  );
}
