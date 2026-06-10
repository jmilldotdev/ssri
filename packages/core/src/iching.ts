import type { OracleOutput } from "./schema";

const names = [
  "The Creative",
  "The Receptive",
  "Difficulty at the Beginning",
  "Youthful Folly",
  "Waiting",
  "Conflict",
  "The Army",
  "Holding Together"
];

const stances = ["advance carefully", "wait", "reduce size", "observe only"];

export function consultOracle(seed: string, question = "Should we press this thesis or wait?"): OracleOutput {
  const random = seededRandom(`${seed}:${question}`);
  const lines = Array.from({ length: 6 }, () => rollLine(random));
  const binary = lines.map((line) => (line === 7 || line === 9 ? 1 : 0));
  const hexagramNumber = 1 + (parseInt(binary.join(""), 2) % 64);
  const changingLines = lines.map((line, index) => (line === 6 || line === 9 ? index + 1 : 0)).filter(Boolean);
  const stance = stances[hexagramNumber % stances.length];
  const hexagramName = names[hexagramNumber % names.length];

  return {
    hexagramNumber,
    hexagramName,
    changingLines,
    stance,
    note: noteFor(stance)
  };
}

function rollLine(random: () => number): 6 | 7 | 8 | 9 {
  const total = coin(random) + coin(random) + coin(random);
  if (total === 6) return 6;
  if (total === 7) return 7;
  if (total === 8) return 8;
  return 9;
}

function coin(random: () => number): 2 | 3 {
  return random() < 0.5 ? 2 : 3;
}

function noteFor(stance: string): string {
  if (stance === "advance carefully") return "The setup is constructive, but the signal should stay smaller until price confirms.";
  if (stance === "wait") return "The pattern has promise, but patience is the cleaner risk posture.";
  if (stance === "reduce size") return "The trend is noisy enough that smaller exposure keeps the thesis honest.";
  return "The oracle suggests watching the thesis without turning it into a trade yet.";
}

function seededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
