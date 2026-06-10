import { getNodeCatalogEntry } from "./catalog";
import { parseCanvas, type SoothEdge, type SoothNode, type SoothsayerCanvas } from "./schema";

export type CanvasValidation = {
  ok: boolean;
  canvas?: SoothsayerCanvas;
  errors: string[];
};

export function validateCanvas(input: unknown): CanvasValidation {
  let canvas: SoothsayerCanvas;
  try {
    canvas = parseCanvas(input);
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : "Canvas schema is invalid"] };
  }

  const errors = validateCanvasSemantics(canvas);
  return { ok: errors.length === 0, canvas: errors.length === 0 ? canvas : undefined, errors };
}

export function assertValidCanvas(input: unknown): SoothsayerCanvas {
  const result = validateCanvas(input);
  if (!result.ok || !result.canvas) {
    throw new Error(result.errors.join("; "));
  }
  return result.canvas;
}

function validateCanvasSemantics(canvas: SoothsayerCanvas): string[] {
  const errors: string[] = [];
  const nodes = new Map<string, SoothNode>();

  for (const node of canvas.nodes) {
    if (nodes.has(node.id)) errors.push(`Duplicate node id: ${node.id}`);
    nodes.set(node.id, node);
    validateParams(node, errors);
  }

  for (const edge of canvas.edges) {
    validateEdge(edge, nodes, errors);
  }

  return errors;
}

function validateParams(node: SoothNode, errors: string[]): void {
  const entry = getNodeCatalogEntry(node.type);
  for (const [name, type] of Object.entries(entry.params)) {
    if (!(name in node.params)) {
      errors.push(`Node ${node.id} (${node.type}) is missing param: ${name}`);
      continue;
    }
    const value = node.params[name];
    if (typeof value !== type) errors.push(`Node ${node.id} (${node.type}) param ${name} must be ${type}`);
  }
}

function validateEdge(edge: SoothEdge, nodes: Map<string, SoothNode>, errors: string[]): void {
  const from = nodes.get(edge.from.node);
  const to = nodes.get(edge.to.node);

  if (!from) errors.push(`Edge ${edge.id} references missing from node: ${edge.from.node}`);
  if (!to) errors.push(`Edge ${edge.id} references missing to node: ${edge.to.node}`);
  if (!from || !to) return;

  const fromCatalog = getNodeCatalogEntry(from.type);
  const toCatalog = getNodeCatalogEntry(to.type);

  if (!fromCatalog.outputs.includes(edge.from.port)) {
    errors.push(`Edge ${edge.id} uses invalid output port ${edge.from.port} on ${from.id} (${from.type})`);
  }

  if (!acceptsInput(toCatalog.inputs, edge.to.port)) {
    errors.push(`Edge ${edge.id} uses invalid input port ${edge.to.port} on ${to.id} (${to.type})`);
  }
}

function acceptsInput(inputs: string[], port: string): boolean {
  return inputs.includes(port) || (inputs.includes("condition") && port === "condition");
}
