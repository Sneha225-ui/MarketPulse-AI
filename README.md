# 📈 MarketPulse AI — Intelligent Stock Market Research Platform

**MarketPulse AI** is an AI-powered Indian stock market research platform designed to help users explore NSE-listed companies, analyse historical stock price movements, understand technical indicators and generate AI-assisted market research reports.

The platform combines an interactive React dashboard, a Node.js backend and a Python-based AI research engine powered by LangChain, LangGraph and Ollama.

## ✨ Key Features

### 📊 Interactive Stock Dashboard
- Search NSE-listed companies.
- Explore historical stock price data.
- Interactive price charts with selectable periods:
  - 1 Day
  - 1 Week
  - 1 Month
  - 2 Months
  - 3 Months
- View stock information and historical price movements.

### 📉 Technical Analysis
- Simple Moving Average (SMA 20 and SMA 50).
- Relative Strength Index (RSI 14).
- Historical price changes and returns.
- Volume analysis.
- Historical volatility and price range observations.

### 🤖 AI-Powered Market Research
MarketPulse uses an AI research engine to generate structured stock analysis, including:

- Executive Summary
- Price and Market Trend
- Technical Indicator Interpretation
- Bullish Signals
- Bearish Signals and Risks
- Bullish, Bearish and Sideways Scenarios
- Final Assessment

### 💬 MarketMind AI
An integrated AI assistant designed to make stock market information and company research more accessible.

### ⭐ Watchlist
Save and revisit selected stocks through the dashboard watchlist.

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| AI Engine | Python, FastAPI |
| AI Orchestration | LangChain, LangGraph |
| Language Models | Ollama, Llama 3.2 |
| Data Processing | Pandas / Python tools |
| Market Data | NSE historical OHLCV data via TejHQ API |
| Data Source | NSE company equity list |

---

## 🏗️ Project Architecture

```text
MarketPulse-AI/
│
├── ai_engine/
│   ├── agents/
│   │   └── market_research_agent.py
│   ├── providers/
│   │   └── llm_provider.py
│   ├── tools/
│   │   ├── market_data.py
│   │   └── technical_indicators.py
│   └── main.py
│
├── backend/
│   └── server.js
│
├── data/
│   └── EQUITY_L.csv
│
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── MarketMindChat.jsx
│       └── ...
│
├── package.json
└── .gitignore
```

### How It Works

1. The React frontend provides the interactive stock research dashboard.
2. The Node.js backend handles API requests and historical market data retrieval.
3. The Python AI engine processes historical stock data and calculates technical indicators.
4. LangGraph coordinates the research workflow.
5. Ollama runs the Llama 3.2 model locally to generate AI-assisted research reports.
6. The generated analysis is returned to the frontend.

---

## ⚙️ Installation and Setup

### Prerequisites

- Node.js and npm
- Python 3.12+
- Git
- Ollama

### 1. Clone the repository

```bash
git clone https://github.com/Sneha225-ui/MarketPulse-AI.git
cd MarketPulse-AI
```

### 2. Install frontend and backend dependencies

```bash
npm install
cd frontend
npm install
```

### 3. Set up the Python environment

From the project root:

```bash
cd ai_engine
python -m venv .venv
```

Activate the environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the Python packages required by the project:

```bash
pip install fastapi uvicorn requests python-dotenv langgraph langchain-openai langchain-ollama
```

### 4. Configure Ollama

Install Ollama and download the model:

```bash
ollama pull llama3.2
```

Configure `ai_engine/.env`:

```env
LLM_PROVIDER=ollama
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Keep API keys and environment files private. Never commit `.env` files.

### 5. Start the AI engine

From the `ai_engine` directory:

```bash
python -m uvicorn main:app --reload --port 8000
```

### 6. Start the Node.js backend

Open another terminal in the project root:

```bash
node backend/server.js
```

### 7. Start the React frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Open the local Vite URL displayed in your terminal, usually:

`http://localhost:5173`

---

## 🔮 Future Enhancements

MarketPulse is an actively evolving project. Planned improvements include:

- Faster AI research generation and response optimisation.
- Advanced technical indicators and chart visualisations.
- Company fundamentals and financial statement analysis.
- Integration of sourced financial news.
- Improved AI-powered company research.
- More detailed market sentiment and trend analysis.
- Enhanced MarketMind AI capabilities.

---

## ⚠️ Disclaimer

MarketPulse AI is an educational and technical research project.

The platform analyses available historical market data and generates AI-assisted interpretations. Historical data may not represent live market prices. AI-generated insights can contain errors and should not be treated as personalised financial advice or guaranteed predictions.

---

## 👩‍💻 Developer

Sneha Singh Chauhan

B.Tech — Computer Science and Engineering (Artificial Intelligence)

Interested in Artificial Intelligence, Machine Learning, Generative AI and intelligent research systems.

- GitHub: [@Sneha225-ui](https://github.com/Sneha225-ui)
- LinkedIn: [Sneha Singh Chauhan](https://www.linkedin.com/in/sneha-singh-chauhan-1b9101310/)

---

⭐ If you find this project interesting, consider giving the repository a star!

**Built with curiosity, experimentation and a passion for AI.**

🚧 **Status: Under Active Development**

MarketPulse AI is an ongoing project. Core features are implemented, and I am continuously improving AI analysis, data reliability and research capabilities.
