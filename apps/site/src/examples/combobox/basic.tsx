import { useState } from "react";
import { Combobox, Field, FieldStack } from "@handamade/psi-react";
import type { ComboboxOption } from "@handamade/psi-react";

const cities: ComboboxOption[] = [
  { value: "ams", label: "Amsterdam", description: "Netherlands" },
  { value: "ber", label: "Berlin", description: "Germany" },
  { value: "cph", label: "Copenhagen", description: "Denmark" },
  { value: "lis", label: "Lisbon", description: "Portugal" },
  { value: "osl", label: "Oslo", description: "Norway" },
  { value: "zrh", label: "Zürich", description: "Switzerland" },
];

/** Type to filter ("zur" finds Zürich); pick one city, or several as Tags. */
export default function ComboboxBasic() {
  const [city, setCity] = useState<string | null>("ber");
  const [stops, setStops] = useState<string[]>(["ams", "osl"]);
  return (
    <FieldStack>
      <Field label="Ships from" controlWidth={240}>
        <Combobox options={cities} value={city} onChange={setCity} clearable />
      </Field>
      <Field label="Stops" controlWidth={320}>
        <Combobox multiple options={cities} value={stops} onChange={setStops} placeholder="Add a city" />
      </Field>
    </FieldStack>
  );
}
