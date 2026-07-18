export interface RunInitOptions {
  cwd: string;
  claude: boolean;
}

/** Placeholder — implemented in Task 5. */
export async function runInit(options: RunInitOptions): Promise<void> {
  throw new Error(`not implemented (cwd=${options.cwd}, claude=${options.claude})`);
}
