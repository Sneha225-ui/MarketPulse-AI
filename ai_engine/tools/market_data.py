
import requests

NODE_BACKEND_URL = "http://localhost:5000"


def get_stock_history(symbol: str):
    symbol = symbol.strip().upper()

    url = f"{NODE_BACKEND_URL}/api/stocks/{symbol}/history"

    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()

        result = response.json()

        return {
            "symbol": symbol,
            "records": result.get("data", []),
            "meta": result.get("meta", {})
        }

    except requests.RequestException as error:
        return {"error": str(error)}

