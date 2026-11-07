from tools.market_data import get_stock_history
import json

result = get_stock_history("TCS")

print("\n--- TCS HISTORICAL DATA ---")
print(json.dumps(result, indent=4))
