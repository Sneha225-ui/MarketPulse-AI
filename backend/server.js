
require("dotenv").config();
console.log(
  "TejHQ API key loaded:",
  Boolean(process.env.TEJ_API_KEY)
);

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Homepage
app.get("/", (req, res) => {
    res.send("NSE Stock Market API is running!");
});

// Stocks API
app.get("/api/stocks", (req, res) => {
    const stocks = [
        { symbol: "RELIANCE", price: 1450 },
        { symbol: "TCS", price: 3200 },
        { symbol: "INFY", price: 1500 },
        { symbol: "HDFCBANK", price: 1700 }
    ];

    res.json(stocks);
});


app.get("/api/stocks/:symbol/history", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    if (!/^[A-Z0-9][A-Z0-9\-&]{0,29}$/.test(symbol)) {
      return res.status(400).json({ error: "Invalid stock symbol" });
    }

    const response = await fetch(
      `https://api.tejhq.dev/v1/ohlcv/nse/${encodeURIComponent(symbol)}`
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Could not fetch historical stock data"
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Historical data request failed:", error.message);
    res.status(500).json({ error: "Server error fetching stock history" });
  }
});
  

app.get("/api/companies", (req, res) => {
  try {
    const csvPath = path.join(__dirname, "..", "data", "EQUITY_L.csv");
    const csv = fs.readFileSync(csvPath, "utf8");
    const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);

    const headers = lines[0].split(",").map((h) => h.trim());
    const symbolIndex = headers.indexOf("SYMBOL");
    const nameIndex = headers.indexOf("NAME OF COMPANY");
    const isinIndex = headers.indexOf("ISIN NUMBER");

    if (symbolIndex === -1 || nameIndex === -1) {
      return res.status(500).json({
        error: "CSV must contain SYMBOL and NAME OF COMPANY columns"
      });
    }

    const query = (req.query.q || "").trim().toLowerCase();

    const companies = lines.slice(1).map((line) => {
      const columns = line.split(",").map((value) => value.trim());

      return {
        symbol: columns[symbolIndex],
        name: columns[nameIndex],
        isin: isinIndex === -1 ? "" : columns[isinIndex]
      };
    }).filter((company) => company.symbol && company.name);

    const results = query
      ? companies.filter((company) =>
          company.symbol.toLowerCase().includes(query) ||
          company.name.toLowerCase().includes(query)
        ).slice(0, 20)
      : companies.slice(0, 20);

    res.json({
      count: results.length,
      companies: results
    });
  } catch (error) {
    console.error("Company search failed:", error.message);
    res.status(500).json({
      error: "Could not read the NSE company list"
    });
  }
});

// Check connection with MarketPulse Python AI Engine
app.get("/api/ai/health", async (req, res) => {
    try {
        const response = await fetch("http://127.0.0.1:8000/health");
        const data = await response.json();

        res.json({
            node: "connected",
            ai_engine: data
        });
    } catch (error) {
        res.status(503).json({
            node: "connected",
            ai_engine: "unavailable"
        });
    }
});

app.post("/api/ai/research", async (req, res) => {
    try {
        const symbol = String(req.body?.symbol || "").trim().toUpperCase();

        if (!/^[A-Z0-9][A-Z0-9-&]{0,29}$/.test(symbol)) {
            return res.status(400).json({ error: "Invalid stock symbol" });
        }

        const response = await fetch("http://127.0.0.1:8000/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            return res.status(response.status || 500).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error("AI research failed:", error.message);
        res.status(503).json({ error: "Python AI Engine is unavailable." });
    }
});

app.post("/api/ai/research", async (req, res) => {
    try {
        const symbol = String(req.body?.symbol || "").trim().toUpperCase();

        if (!symbol) {
            return res.status(400).json({ error: "Stock symbol is required" });
        }

        const response = await fetch("http://127.0.0.1:8000/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            return res.status(response.status || 500).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error("AI research error:", error.message);
        res.status(503).json({ error: "AI Engine is unavailable" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
