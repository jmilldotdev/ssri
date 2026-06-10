"use client";

import { useMemo, useState } from "react";

export type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type SymbolDataset = {
  symbol: string;
  candles: Candle[];
};

type MarketChartProps = {
  datasets: SymbolDataset[];
};

const SYMBOL_NAMES: Record<string, string> = {
  MU: "Micron Technology, Inc.",
  NVDA: "NVIDIA Corporation",
  SPY: "SPDR S&P 500 ETF Trust",
};

const WIDTH = 1280;
const HEIGHT = 660;
const MARGIN = { top: 34, right: 82, bottom: 50, left: 18 };
const VOLUME_HEIGHT = 112;
const PRICE_BOTTOM = HEIGHT - MARGIN.bottom - VOLUME_HEIGHT;
const VOLUME_TOP = PRICE_BOTTOM + 16;
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PRICE_HEIGHT = PRICE_BOTTOM - MARGIN.top;

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompact(value: number) {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAxisDate(timestamp: string) {
  const date = new Date(`${timestamp}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function MarketChart({ datasets }: MarketChartProps) {
  const initialSymbol = datasets.some((dataset) => dataset.symbol === "MU")
    ? "MU"
    : datasets[0]?.symbol ?? "";
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);

  const dataset =
    datasets.find((candidate) => candidate.symbol === selectedSymbol) ?? datasets[0];

  const chart = useMemo(() => {
    const candles = dataset?.candles ?? [];
    const highs = candles.map((candle) => candle.high);
    const lows = candles.map((candle) => candle.low);
    const maxVolume = Math.max(...candles.map((candle) => candle.volume), 1);
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const pricePadding = Math.max((maxPrice - minPrice) * 0.08, 1);
    const priceMin = minPrice - pricePadding;
    const priceMax = maxPrice + pricePadding;
    const priceRange = priceMax - priceMin || 1;
    const step = PLOT_WIDTH / Math.max(candles.length, 1);
    const candleWidth = clamp(step * 0.58, 3, 13);

    const xFor = (index: number) => MARGIN.left + index * step + step / 2;
    const yFor = (price: number) =>
      MARGIN.top + ((priceMax - price) / priceRange) * PRICE_HEIGHT;

    const priceTicks = Array.from({ length: 7 }, (_, index) => {
      const value = priceMin + (priceRange / 6) * index;
      return Number(value.toFixed(2));
    }).reverse();

    const dateTickCount = Math.min(7, candles.length);
    const dateTicks = Array.from({ length: dateTickCount }, (_, index) => {
      const candleIndex =
        dateTickCount === 1
          ? 0
          : Math.round((index / (dateTickCount - 1)) * (candles.length - 1));
      return {
        index: candleIndex,
        candle: candles[candleIndex],
      };
    });

    return {
      candles,
      maxVolume,
      step,
      candleWidth,
      xFor,
      yFor,
      priceTicks,
      dateTicks,
    };
  }, [dataset]);

  if (!dataset) {
    return (
      <main className="market-page">
        <div className="empty-state">No fixture data found.</div>
      </main>
    );
  }

  const last = chart.candles.at(-1);
  const previous = chart.candles.at(-2);
  const change = last && previous ? last.close - previous.close : 0;
  const changePercent = last && previous ? (change / previous.close) * 100 : 0;
  const isDown = change < 0;
  const currentPriceY = last ? chart.yFor(last.close) : 0;

  return (
    <main className="market-page">
      <header className="market-toolbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <div>
            <p className="eyebrow">Soothsayer</p>
            <h1>Market Canvas</h1>
          </div>
        </div>

        <label className="symbol-control">
          <span>Symbol</span>
          <select
            value={dataset.symbol}
            onChange={(event) => setSelectedSymbol(event.target.value)}
          >
            {datasets.map((candidate) => (
              <option key={candidate.symbol} value={candidate.symbol}>
                {candidate.symbol}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="chart-surface" aria-label={`${dataset.symbol} candlestick chart`}>
        <div className="chart-header">
          <div>
            <div className="instrument-line">
              <strong>{SYMBOL_NAMES[dataset.symbol] ?? dataset.symbol}</strong>
              <span>{dataset.symbol}</span>
              <span>1D</span>
              <span>NASDAQ</span>
            </div>
            {last ? (
              <div className="ohlc-line">
                <span>O {formatPrice(last.open)}</span>
                <span>H {formatPrice(last.high)}</span>
                <span>L {formatPrice(last.low)}</span>
                <span>C {formatPrice(last.close)}</span>
                <span className={isDown ? "negative" : "positive"}>
                  {change >= 0 ? "+" : ""}
                  {formatPrice(change)} ({changePercent.toFixed(2)}%)
                </span>
              </div>
            ) : null}
          </div>

          {last ? (
            <div className={isDown ? "quote-pill negative-bg" : "quote-pill positive-bg"}>
              <span>{formatPrice(last.close)}</span>
              <small>{formatCompact(last.volume)} Vol</small>
            </div>
          ) : null}
        </div>

        <div className="chart-wrap">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" className="candle-svg">
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} className="chart-bg" />

            {chart.dateTicks.map(({ index }, bandIndex) => {
              const x = MARGIN.left + index * chart.step;
              const width = chart.step * 5;
              return (
                <rect
                  key={`session-${index}`}
                  x={x}
                  y={0}
                  width={width}
                  height={HEIGHT - MARGIN.bottom}
                  className={bandIndex % 2 === 0 ? "session-band-a" : "session-band-b"}
                />
              );
            })}

            {chart.priceTicks.map((tick) => {
              const y = chart.yFor(tick);
              return (
                <g key={tick}>
                  <line
                    x1={MARGIN.left}
                    y1={y}
                    x2={WIDTH - MARGIN.right}
                    y2={y}
                    className="grid-line"
                  />
                  <text x={WIDTH - 12} y={y + 4} textAnchor="end" className="axis-label">
                    {formatPrice(tick)}
                  </text>
                </g>
              );
            })}

            {chart.dateTicks.map(({ index, candle }) => {
              const x = chart.xFor(index);
              return (
                <g key={`${candle.timestamp}-${index}`}>
                  <line
                    x1={x}
                    y1={MARGIN.top}
                    x2={x}
                    y2={HEIGHT - MARGIN.bottom}
                    className="date-grid-line"
                  />
                  <text
                    x={x}
                    y={HEIGHT - 18}
                    textAnchor="middle"
                    className="axis-label date-label"
                  >
                    {formatAxisDate(candle.timestamp)}
                  </text>
                </g>
              );
            })}

            {chart.candles.map((candle, index) => {
              const x = chart.xFor(index);
              const openY = chart.yFor(candle.open);
              const closeY = chart.yFor(candle.close);
              const highY = chart.yFor(candle.high);
              const lowY = chart.yFor(candle.low);
              const isPositive = candle.close >= candle.open;
              const bodyHeight = Math.max(Math.abs(closeY - openY), 1.6);
              const bodyY = Math.min(openY, closeY);
              const volumeHeight =
                (candle.volume / chart.maxVolume) * (HEIGHT - MARGIN.bottom - VOLUME_TOP);

              return (
                <g key={candle.timestamp}>
                  <rect
                    x={x - chart.candleWidth / 2}
                    y={HEIGHT - MARGIN.bottom - volumeHeight}
                    width={chart.candleWidth}
                    height={volumeHeight}
                    className={isPositive ? "volume-up" : "volume-down"}
                  />
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    className={isPositive ? "wick-up" : "wick-down"}
                  />
                  <rect
                    x={x - chart.candleWidth / 2}
                    y={bodyY}
                    width={chart.candleWidth}
                    height={bodyHeight}
                    rx="1.2"
                    className={isPositive ? "candle-up" : "candle-down"}
                  />
                </g>
              );
            })}

            {last ? (
              <g>
                <line
                  x1={MARGIN.left}
                  y1={currentPriceY}
                  x2={WIDTH - MARGIN.right}
                  y2={currentPriceY}
                  className={isDown ? "last-price-line down" : "last-price-line up"}
                />
                <rect
                  x={WIDTH - MARGIN.right + 8}
                  y={currentPriceY - 15}
                  width="72"
                  height="30"
                  rx="3"
                  className={isDown ? "price-tag down" : "price-tag up"}
                />
                <text
                  x={WIDTH - MARGIN.right + 44}
                  y={currentPriceY + 5}
                  textAnchor="middle"
                  className="price-tag-text"
                >
                  {formatPrice(last.close)}
                </text>
              </g>
            ) : null}

            <text x={MARGIN.left} y={VOLUME_TOP - 8} className="volume-label">
              Vol {last ? formatCompact(last.volume) : ""}
            </text>
          </svg>
        </div>
      </section>
    </main>
  );
}
