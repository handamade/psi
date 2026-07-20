// ── Channel operations ──────────────────────────────────────────────

export interface SetOp {
  readonly op: "set";
  readonly value: number;
}

export interface DeltaOp {
  readonly op: "delta";
  readonly value: number;
}

export interface CapOp {
  readonly op: "cap";
  readonly value: number;
}

export type ChannelOp = SetOp | DeltaOp | CapOp;

// ── Token sources ───────────────────────────────────────────────────

export interface SlotRef {
  readonly type: "slot";
  readonly name: string;
}

export interface TokenRef {
  readonly type: "ref";
  readonly name: string;
}

export type TokenSource = SlotRef | TokenRef;

// ── Token definition ────────────────────────────────────────────────

export interface TokenDef {
  readonly from: TokenSource;
  readonly l?: ChannelOp;
  readonly c?: ChannelOp;
  readonly h?: ChannelOp;
  readonly alpha?: number;
  /** D46: property groups / CSS properties this token may bind to
   * (see src/scopes.ts). Unscoped tokens are valid everywhere. */
  readonly scopes?: readonly string[];
}

// ── Palette ─────────────────────────────────────────────────────────

export interface PaletteEntry {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

export type Palette = Record<string, PaletteEntry>;

// ── Slot map ────────────────────────────────────────────────────────

export interface SlotMap {
  readonly ink: string;
  readonly canvas: string;
  readonly accent: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
}

// ── Theme definition ────────────────────────────────────────────────

export type ThemeDef = Record<string, TokenDef>;

// ── Resolved output ─────────────────────────────────────────────────

export interface ResolvedToken {
  readonly name: string;
  readonly oklch: {
    readonly l: number;
    readonly c: number;
    readonly h: number;
    readonly alpha?: number;
  };
  readonly hex: string;
  readonly formula: string;
  readonly scopes?: readonly string[];
}
