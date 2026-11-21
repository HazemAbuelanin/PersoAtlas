/* Compile the synthetic fixture pack for tests. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkPackDir } from "../../scripts/pack-lib.mjs";

export const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "packs", "demo-pack");
export function demoPack() {
  const { pack, errors } = checkPackDir(FIXTURE_DIR);
  if (errors.length) throw new Error("fixture pack invalid: " + errors.join("; "));
  return pack;
}
