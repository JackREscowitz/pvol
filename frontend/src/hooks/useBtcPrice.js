import { useState, useEffect } from "react";

const BINANCE_URL = "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT";
const POLL_MS = 30_000;

export function useBtcPrice() {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    async function fetch_price() {
      try {
        const res = await fetch(BINANCE_URL);
        const json = await res.json();
        setPrice(parseFloat(json.price));
      } catch {
        // silently ignore — keeps showing last known price
      }
    }

    fetch_price();
    const id = setInterval(fetch_price, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return price;
}
