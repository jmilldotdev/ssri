"use client";

import { useMemo, useState } from "react";

type DecisionSignal = {
  nodeId: string;
  label: string;
  kind: string;
  value: string | number;
  score: number;
  weight: number;
  weightedScore: number;
  explanation: string;
};

type DecisionLevel = {
  price: number;
  label: string;
  intent: string;
};

type EvaluatedDecisionGraph = {
  symbol: string;
  thesis: string;
  lastClose: number;
  signals: DecisionSignal[];
  score: number;
  decision: "call" | "put" | "hold";
  summary: string;
  levels: DecisionLevel[];
  oracle?: { hexagramNumber: number; hexagramName: string; stance: string; note: string };
};

type Props = {
  decision: EvaluatedDecisionGraph;
};

export function DecisionGraphPanel({ decision }: Props) {
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(decision.signals.map((signal) => [signal.nodeId, signal.weight])),
  );
  const [callThreshold, setCallThreshold] = useState(0.18);
  const [putThreshold, setPutThreshold] = useState(-0.18);

  const adjusted = useMemo(() => {
    const score = round(
      decision.signals.reduce(
        (sum, signal) => sum + signal.score * (weights[signal.nodeId] ?? signal.weight),
        0,
      ),
    );
    const label = score >= callThreshold ? "call" : score <= putThreshold ? "put" : "hold";
    return { score, label };
  }, [callThreshold, decision.signals, putThreshold, weights]);

  return (
    <aside className="decision-panel" aria-label="Decision graph panel">
      <section className="decision-card decision-hero">
        <p className="eyebrow">Decision graph</p>
        <div className={`decision-badge decision-${adjusted.label}`}>
          {adjusted.label.toUpperCase()}
        </div>
        <h2>{decision.symbol} weighted setup</h2>
        <p>{decision.thesis}</p>
        <div className="decision-score">
          <span>Score</span>
          <strong>{adjusted.score.toFixed(2)}</strong>
        </div>
      </section>

      <section className="decision-card">
        <h3>Controls</h3>
        {decision.signals.map((signal) => (
          <label className="weight-control" key={signal.nodeId}>
            <span>
              {signal.label} <small>{weights[signal.nodeId]?.toFixed(2)}</small>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights[signal.nodeId] ?? signal.weight}
              onChange={(event) =>
                setWeights((current) => ({
                  ...current,
                  [signal.nodeId]: Number(event.target.value),
                }))
              }
            />
          </label>
        ))}
        <label className="weight-control">
          <span>Call threshold <small>{callThreshold.toFixed(2)}</small></span>
          <input type="range" min="0" max="0.5" step="0.01" value={callThreshold} onChange={(event) => setCallThreshold(Number(event.target.value))} />
        </label>
        <label className="weight-control">
          <span>Put threshold <small>{putThreshold.toFixed(2)}</small></span>
          <input type="range" min="-0.5" max="0" step="0.01" value={putThreshold} onChange={(event) => setPutThreshold(Number(event.target.value))} />
        </label>
      </section>

      <section className="decision-card">
        <h3>Signals</h3>
        <div className="signal-list">
          {decision.signals.map((signal) => (
            <article key={signal.nodeId}>
              <div>
                <strong>{signal.label}</strong>
                <span>{signal.value}</span>
              </div>
              <p>{signal.explanation}</p>
              <small>
                score {signal.score.toFixed(2)} x weight {(weights[signal.nodeId] ?? signal.weight).toFixed(2)}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="decision-card">
        <h3>Generated levels</h3>
        <div className="level-list">
          {decision.levels.map((level) => (
            <div key={`${level.intent}-${level.price}`}>
              <span>{level.label}</span>
              <strong>{level.price.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </section>

      {decision.oracle ? (
        <section className="decision-card">
          <h3>I Ching</h3>
          <p>
            {decision.oracle.hexagramNumber}. {decision.oracle.hexagramName}:{" "}
            <strong>{decision.oracle.stance}</strong>
          </p>
          <p>{decision.oracle.note}</p>
        </section>
      ) : null}
    </aside>
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
