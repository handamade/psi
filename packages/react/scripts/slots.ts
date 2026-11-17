import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Authored slot contract (D45): what a named slot accepts, how many, in
 * what order. `accepts: {}` = unrestricted (an open slot). */
export interface SlotContract {
  name: string;
  accepts: { components?: string[]; contracts?: string[] };
  cardinality: "0..1" | "1..1" | "0..*" | "1..*";
  order?: number;
}

/** Loads contracts.json + every component's slot file under srcDir and
 * validates the whole graph: any reference to an unknown component or
 * contract throws — the build is the conformance gate (D45/D48 posture).
 * A component owns `src/<Name>/slots.json`. A part that lives in another
 * component's folder (componentDir, e.g. NavItem → NavTree) owns
 * `src/<Dir>/<Name>.slots.json` (D124). */
export function loadSlotContracts(
  srcDir: string,
  componentNames: string[],
  componentDir: Record<string, string> = {},
): Record<string, SlotContract[]> {
  const contractsPath = join(srcDir, "contracts.json");
  const contracts: Record<string, string[]> = existsSync(contractsPath)
    ? (JSON.parse(readFileSync(contractsPath, "utf8")) as Record<string, string[]>)
    : {};

  for (const [contractName, members] of Object.entries(contracts)) {
    for (const member of members) {
      if (!componentNames.includes(member)) {
        throw new Error(
          `contracts.json: contract "${contractName}" names unknown component "${member}"`,
        );
      }
    }
  }

  const out: Record<string, SlotContract[]> = {};
  for (const name of componentNames) {
    const dir = componentDir[name] ?? name;
    const rel = dir === name ? `${name}/slots.json` : `${dir}/${name}.slots.json`;
    const slotsPath = join(srcDir, rel);
    if (!existsSync(slotsPath)) {
      out[name] = []; // absence is explicit, not unknown (D45)
      continue;
    }
    const { slots } = JSON.parse(readFileSync(slotsPath, "utf8")) as { slots: SlotContract[] };
    for (const slot of slots) {
      for (const comp of slot.accepts.components ?? []) {
        if (!componentNames.includes(comp)) {
          throw new Error(
            `${rel}: slot "${slot.name}" accepts unknown component "${comp}"`,
          );
        }
      }
      for (const contract of slot.accepts.contracts ?? []) {
        if (!(contract in contracts)) {
          throw new Error(
            `${rel}: slot "${slot.name}" accepts unknown contract "${contract}"`,
          );
        }
      }
    }
    out[name] = slots;
  }
  return out;
}
