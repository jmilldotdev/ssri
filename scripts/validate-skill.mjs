import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const skillDir = join(".agents", "skills", "soothsayer-canvas");
const skillPath = join(skillDir, "SKILL.md");
const openaiYamlPath = join(skillDir, "agents", "openai.yaml");

const errors = [];

if (!existsSync(skillPath)) {
  errors.push(`Missing ${skillPath}`);
} else {
  const body = readFileSync(skillPath, "utf8");
  if (!body.startsWith("---\n")) errors.push("SKILL.md must start with YAML frontmatter");
  if (!/\nname:\s*soothsayer-canvas\n/.test(body)) errors.push("SKILL.md frontmatter must include name: soothsayer-canvas");
  if (!/\ndescription:\s*.+\n/.test(body)) errors.push("SKILL.md frontmatter must include a description");
  if (!body.includes("references/canvas-authoring.md")) errors.push("SKILL.md should point to the canvas authoring reference");
}

if (!existsSync(openaiYamlPath)) {
  errors.push(`Missing ${openaiYamlPath}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("soothsayer-canvas skill is valid");
