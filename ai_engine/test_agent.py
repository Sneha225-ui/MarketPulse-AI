from agents.market_research_agent import run_market_research

result = run_market_research(
    company="TCS",
    query="Analyse TCS"
)

print("\n--- MARKETPULSE AGENT TEST ---")
print(result["analysis"])
