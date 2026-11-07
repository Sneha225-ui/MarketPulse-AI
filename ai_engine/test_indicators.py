from tools.market_data import get_stock_history
from tools.technical_indicators import calculate_indicators

data = get_stock_history("TCS")

if "error" in data:
    print(data["error"])
else:
    result = calculate_indicators(data["records"])

    print("\n--- TCS TECHNICAL ANALYSIS ---")
    for key, value in result.items():
        print(f"{key}: {value}")