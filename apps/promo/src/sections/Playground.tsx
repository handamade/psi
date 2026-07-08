import { useState } from "react";
import {
  Button,
  Checkbox,
  IconButton,
  IconPlus,
  IconSearch,
  IconSettings,
  Input,
  Select,
  Switch,
  Tag,
  Tooltip,
  type ButtonProps,
} from "@dku/react";

import { storybookDocs } from "../lib/storybook";

const VARIANTS = [
  "accent",
  "accent-subtle",
  "neutral",
  "neutral-subtle",
  "ghost",
  "danger",
  "danger-subtle",
] as const satisfies readonly NonNullable<ButtonProps["variant"]>[];

const SIZES = [24, 32, 40, 48] as const;

const INITIAL_TAGS = [
  { label: "oklch", variant: "accent" },
  { label: "themeable", variant: "success" },
  { label: "aa-checked", variant: "warning" },
  { label: "zero-deps", variant: "neutral" },
] as const;

export function Playground() {
  const [tags, setTags] = useState<readonly (typeof INITIAL_TAGS)[number][]>(
    [...INITIAL_TAGS],
  );

  return (
    <section className="section" id="components">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">02 · Components</span>
          <h2>Eight production atoms. All live — try them.</h2>
          <p className="lede">
            React 19, zero runtime dependencies, CSS Modules over
            component-level tokens. Every prop below ships in a
            machine-readable manifest, and the docs are generated from source.
          </p>
        </div>

        <div className="playground">
          <div className="card pg-buttons">
            <h3>
              Button · 7 variants × 4 sizes
              <a className="sb-link" href={storybookDocs("Components/Button")}>
                storybook →
              </a>
            </h3>
            <div className="pg-row">
              {VARIANTS.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>
            <div className="pg-sizes">
              {SIZES.map((size) => (
                <div className="pg-size" key={size}>
                  <Button variant="accent-subtle" size={size}>
                    Aa
                  </Button>
                  <span className="annot">
                    size={"{"}
                    {size}
                    {"}"} → {size}px
                  </span>
                </div>
              ))}
              <div className="pg-size">
                <Tooltip content="Icon-only actions get the same sizes">
                  <IconButton aria-label="Add item" variant="accent" size={40}>
                    <IconPlus />
                  </IconButton>
                </Tooltip>
                <span className="annot">IconButton</span>
              </div>
            </div>
            <p className="annot pg-note">
              Sizes are px numbers, never S/M/L — principle 02 in practice.
            </p>
          </div>

          <div className="card pg-controls">
            <h3>
              Form controls · hover, focus &amp; error states
              <a className="sb-link" href={storybookDocs("Components/Input")}>
                storybook →
              </a>
            </h3>
            <div className="pg-stack">
              <div className="pg-row">
                <Input placeholder="Search tokens…" aria-label="Search tokens" />
                <Tooltip content="Tokens, docs and manifests are queryable">
                  <IconButton aria-label="Search" variant="neutral">
                    <IconSearch />
                  </IconButton>
                </Tooltip>
              </div>
              <Select aria-label="Color space" defaultValue="oklch">
                <option value="oklch">oklch(from var(--ds-…))</option>
                <option value="p3">display-p3 (roadmap)</option>
                <option value="srgb">static sRGB fallback JSON</option>
              </Select>
              <div className="pg-row">
                <Checkbox defaultChecked>Contrast gate</Checkbox>
                <Switch defaultChecked>Dark mode ready</Switch>
                <Tooltip content="role='switch', real native input underneath">
                  <IconButton aria-label="Component settings" variant="ghost">
                    <IconSettings />
                  </IconButton>
                </Tooltip>
              </div>
              <div className="pg-row" aria-live="polite">
                {tags.map((tag) => (
                  <Tag
                    key={tag.label}
                    variant={tag.variant}
                    subtle
                    onDismiss={() =>
                      setTags((current) =>
                        current.filter((t) => t.label !== tag.label),
                      )
                    }
                  >
                    {tag.label}
                  </Tag>
                ))}
                {tags.length === 0 && (
                  <Button
                    variant="ghost"
                    size={24}
                    onClick={() => setTags([...INITIAL_TAGS])}
                  >
                    Restore tags
                  </Button>
                )}
              </div>
            </div>
            <p className="annot pg-note">
              Real components, not screenshots — dismiss the tags, flip the
              switch, tab through the focus rings.
            </p>
          </div>
        </div>

        <p className="pg-index annot">
          Full docs in Storybook:{" "}
          {[
            "Button",
            "IconButton",
            "Input",
            "Select",
            "Checkbox",
            "Switch",
            "Tag",
            "Tooltip",
          ].map((name, index) => (
            <span key={name}>
              {index > 0 && " · "}
              <a href={storybookDocs(`Components/${name}`)}>{name}</a>
            </span>
          ))}
          {" · "}
          <a href={storybookDocs("Icons/Gallery")}>Icons</a>
          {" · "}
          <a href={storybookDocs("Tokens and Assets/Color Tokens")}>Tokens</a>
        </p>
      </div>
    </section>
  );
}
