
def calculate_indicators(records):
    if not records:
        return {"error": "No historical data available"}

    # Ensure records are in chronological order
    records = sorted(records, key=lambda x: x["date"])

    closes = [float(row["close"]) for row in records]
    volumes = [float(row["volume"]) for row in records]

    latest_price = closes[-1]
    previous_price = closes[-2] if len(closes) >= 2 else latest_price

    def sma(values, period):
        if len(values) < period:
            return None
        return sum(values[-period:]) / period

    # Calculate RSI using 14 periods
    rsi = None

    if len(closes) >= 15:
        changes = [
            closes[i] - closes[i - 1]
            for i in range(len(closes) - 14, len(closes))
        ]

        gains = [max(change, 0) for change in changes]
        losses = [max(-change, 0) for change in changes]

        avg_gain = sum(gains) / 14
        avg_loss = sum(losses) / 14

        if avg_loss == 0:
            rsi = 100.0 if avg_gain > 0 else 50.0
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))

    average_volume = sma(volumes, 20)

    return {
        "latest_price": latest_price,
        "price_change_percent": round(
            ((latest_price - previous_price) / previous_price) * 100, 2
        ) if previous_price else None,
        "sma_20": round(sma(closes, 20), 2) if sma(closes, 20) is not None else None,
        "sma_50": round(sma(closes, 50), 2) if sma(closes, 50) is not None else None,
        "rsi_14": round(rsi, 2) if rsi is not None else None,
        "average_volume_20": round(average_volume, 2) if average_volume is not None else None
    }
