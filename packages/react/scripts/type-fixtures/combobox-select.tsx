// Type fixture (D130), compiled by scripts/types.test.ts. Every line under an
// expect-error directive must fail to typecheck; every other line must pass.
// A directive whose line stops failing is itself an error (TS2578).
import { Combobox, Select } from "../../src/index.js";
import type { ComboboxOption } from "../../src/index.js";

const options: ComboboxOption[] = [{ value: "ber", label: "Berlin" }];

// Single: string | null.
<Combobox options={options} value="ber" onChange={(value: string | null) => value} />;
<Combobox options={options} defaultValue={null} size={24} />;
// @ts-expect-error a single-select reports one value, not an array
<Combobox options={options} onChange={(values: string[]) => values} />;
// @ts-expect-error a single-select's value is not an array
<Combobox options={options} value={["ber"]} />;

// Multi: string[].
<Combobox multiple options={options} value={["ber"]} onChange={(values: string[]) => values} />;
<Combobox multiple options={options} size={32} />;
<Combobox multiple options={options} size={48} />;
// @ts-expect-error a 24px Tag doesn't fit inside a 24px control
<Combobox multiple options={options} size={24} />;
// @ts-expect-error a multi-select's value is an array
<Combobox multiple options={options} value="ber" />;

// filter: a function, or false; never true.
<Combobox options={options} filter={false} />;
<Combobox options={options} filter={(option, text) => option.label.startsWith(text)} />;
// @ts-expect-error filter takes a function or false
<Combobox options={options} filter />;

// Select loses multiple (D130).
<Select size={32}><option>One</option></Select>;
// @ts-expect-error Select has no multiple; use Combobox
<Select multiple><option>One</option></Select>;
