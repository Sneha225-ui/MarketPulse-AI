from pydantic import BaseModel
from agents.market_research_agent import run_market_research

from fastapi import FastAPI

app = FastAPI(
    title="MarketPulse AI Engine",
    description="AI-powered financial research platform",
    version="1.0.0"
)

@app.get("/")
def home():
    return {"message": "MarketPulse AI Engine is running"}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "MarketPulse AI Engine"
    }

class ResearchRequest(BaseModel):
    symbol: str


@app.post("/research")
def research(request: ResearchRequest):
    result = run_market_research(request.symbol)

    if result.get("error"):
        return {"error": result["error"]}

    return {
        "symbol": request.symbol.upper(),
        "analysis": result["analysis"],
        "report": result["ai_report"],
        "data_meta": result["market_data"].get("meta", {})
    }