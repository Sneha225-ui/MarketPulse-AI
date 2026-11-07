
from typing import TypedDict, Optional
from statistics import mean, pstdev

from langgraph.graph import StateGraph, END

from tools.market_data import get_stock_history
from tools.technical_indicators import calculate_indicators
from providers.llm_provider import get_llm


class ResearchState(TypedDict):
    company: str
    research_query: str
    market_data: Optional[dict]
    analysis: Optional[dict]
    ai_report: Optional[str]
    error: Optional[str]


def build_market_context(records):
    if not records:
        return {}

    records = sorted(records, key=lambda x: x.get("date", ""))

    recent = records[-60:]

    closes = [
        float(r["close"])
        for r in recent
        if r.get("close") is not None
    ]

    volumes = [
        float(r["volume"])
        for r in recent
        if r.get("volume") is not None
    ]

    highs = [
        float(r["high"])
        for r in recent
        if r.get("high") is not None
    ]

    lows = [
        float(r["low"])
        for r in recent
        if r.get("low") is not None
    ]

    if not closes:
        return {}

    returns = {}

    for period in [5, 20, 60]:
        if len(closes) > period:
            old_price = closes[-period - 1]
            new_price = closes[-1]

            returns[f"{period}_record_return_percent"] = round(
                ((new_price - old_price) / old_price) * 100, 2
            )

    avg_volume = mean(volumes[-20:]) if volumes else None

    volume_ratio = None

    if volumes and avg_volume and avg_volume != 0:
        volume_ratio = round(volumes[-1] / avg_volume, 2)

    daily_returns = []

    for i in range(1, len(closes)):
        previous = closes[i - 1]

        if previous:
            daily_returns.append(
                (closes[i] - previous) / previous * 100
            )

    volatility = (
        round(pstdev(daily_returns), 2)
        if len(daily_returns) > 1
        else None
    )

    return {
        "records_used": len(recent),
        "date_range": {
            "start": recent[0].get("date"),
            "end": recent[-1].get("date")
        },
        "latest_close": closes[-1],
        "previous_close": closes[-2] if len(closes) > 1 else None,
        "change_percent": round(
            ((closes[-1] - closes[-2]) / closes[-2]) * 100, 2
        ) if len(closes) > 1 and closes[-2] else None,
        "returns": returns,
        "max_high": max(highs) if highs else None,
        "min_low": min(lows) if lows else None,
        "avg_volume": round(avg_volume, 2) if avg_volume is not None else None,
        "latest_volume": volumes[-1] if volumes else None,
        "volume_ratio": volume_ratio,
        "volatility": volatility
    }


def research_node(state: ResearchState):
    symbol = state["company"].strip().upper()

    market_data = get_stock_history(symbol)

    if market_data.get("error"):
        return {"error": market_data["error"]}

    records = market_data.get("records", [])

    if not records:
        return {"error": f"No historical market data found for {symbol}."}

    indicators = calculate_indicators(records)
    market_context = build_market_context(records)

    if not indicators:
        return {"error": "Unable to calculate technical indicators."}

    return {
        "market_data": market_data,
        "analysis": {
            "technical_indicators": indicators,
            "market_context": market_context
        }
    }


def ai_analysis_node(state: ResearchState):
    if state.get("error") or not state.get("analysis"):
        return {"ai_report": None}

    llm = get_llm()

    indicators = state["analysis"].get("technical_indicators", {})
    context = state["analysis"].get("market_context", {})

    compact_data = {
        "technical_indicators": indicators,
        "latest_close": context.get("latest_close"),
        "previous_close": context.get("previous_close"),
        "change_percent": context.get("change_percent"),
        "returns": context.get("returns"),
        "historical_high": context.get("max_high"),
        "historical_low": context.get("min_low"),
        "average_volume": context.get("avg_volume"),
        "latest_volume": context.get("latest_volume"),
        "volume_ratio": context.get("volume_ratio"),
        "volatility": context.get("volatility"),
        "records_used": context.get("records_used"),
        "date_range": context.get("date_range")
    }

    prompt = f"""
You are MarketPulse, an evidence-based Indian stock market analyst.

Analyse {state['company']} using ONLY the following historical data:

{compact_data}

Write a concise research report with these sections:

1. EXECUTIVE SUMMARY
2. PRICE TREND
3. TECHNICAL INDICATORS
4. BULLISH SIGNALS
5. BEARISH SIGNALS AND RISKS
6. BULLISH, BEARISH AND SIDEWAYS SCENARIOS
7. FINAL ASSESSMENT

ACCURACY RULES:
- Use ₹ for monetary values.
- RSI above 70 means potentially overbought.
- RSI below 30 means potentially oversold.
- RSI alone cannot predict a reversal.
- Never invent news, fundamentals, targets, probabilities or metrics.
- Distinguish historical observations from interpretations.
- Mention the available record count and date range.
- Do not describe historical prices as live prices.
- If information is missing, say it is unavailable.
- This is technical research, not a buy/sell recommendation.
- Keep the entire report under 400 words.
- Avoid repetition and unnecessary explanations.
"""

    try:
        response = llm.invoke(prompt)
        return {"ai_report": response.content}

    except Exception as error:
        return {
            "ai_report": f"AI report generation failed: {str(error)}"
        }


builder = StateGraph(ResearchState)

builder.add_node("research", research_node)
builder.add_node("ai_analysis", ai_analysis_node)

builder.set_entry_point("research")
builder.add_edge("research", "ai_analysis")
builder.add_edge("ai_analysis", END)

market_research_agent = builder.compile()


def run_market_research(
    company: str,
    query: str = "Analyse this company"
):
    return market_research_agent.invoke({
        "company": company,
        "research_query": query,
        "market_data": None,
        "analysis": None,
        "ai_report": None,
        "error": None
    })
