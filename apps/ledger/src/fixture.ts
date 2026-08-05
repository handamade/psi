export interface Transaction {
  id: string;
  date: string;
  payee: string;
  category: string;
  amount: number;
}

const PAYEES = [
  ["Acme Corp", "Supplies"], ["Globex", "Software"], ["Initech", "Consulting"],
  ["Umbrella Ltd", "Insurance"], ["Soylent Foods", "Catering"], ["Hooli", "Hosting"],
  ["Stark Industries", "Equipment"], ["Wayne Enterprises", "Legal"],
] as const;

/** 40 deterministic rows — no randomness, so VR and the eval are stable. */
export const TRANSACTIONS: Transaction[] = Array.from({ length: 40 }, (_, i) => {
  const [payee, category] = PAYEES[i % PAYEES.length];
  const day = (i % 28) + 1;
  return {
    id: `t${i + 1}`,
    date: `2026-07-${String(day).padStart(2, "0")}`,
    payee,
    category,
    amount: Math.round(((i * 337) % 12000) * 100) / 100 - (i % 5 === 0 ? 480 : 0),
  };
});

export const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
