import { useMemo, useState } from "react";
import {
  Button, Dialog, Field, Input, Menu, MenuItem, MenuSeparator, IconButton, Pagination,
  Panel, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
  Tag, Toolbar, useToast,
} from "@handamade/psi-react";
import type { TableSortState } from "@handamade/psi-react";
import { TRANSACTIONS, currency } from "./fixture.js";

// Derived from the fixture, not hardcoded — stays correct if the dataset changes.
const CATEGORIES = Array.from(new Set(TRANSACTIONS.map((t) => t.category))).sort();

export function TransactionsScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<TableSortState | null>({ key: "date", direction: "desc" });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [voided, setVoided] = useState<ReadonlySet<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const toast = useToast();

  // detail-drawer: a drawer is a Dialog placement, not a component (D66).
  const detail = TRANSACTIONS.find((t) => t.id === detailId) ?? null;

  // action-feedback: voiding is destructive and instant, so the confirmation
  // carries its own reversal. show() returns the toast's id, which lets Undo
  // clear the toast it lives in rather than leaving it to time out after the
  // action it offers has already been taken.
  const voidTransaction = (id: string, payee: string) => {
    setVoided((prev) => new Set(prev).add(id));
    setOpenMenu(null);
    let toastId = "";
    toastId = toast.show({
      variant: "success",
      message: `Voided ${payee}.`,
      action: (
        <Button
          variant="ghost"
          size={32}
          onClick={() => {
            setVoided((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            toast.dismiss(toastId);
          }}
        >
          Undo
        </Button>
      ),
    });
  };

  // Table renders what it is given; filtering, sorting and slicing are the
  // app's. This is what controlled-only buys — the same code works unchanged
  // against a server that does all three.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = TRANSACTIONS.filter((t) => {
      const matchesQuery = !q || t.payee.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      const matchesCategory = !category || t.category === category;
      return matchesQuery && matchesCategory && !voided.has(t.id);
    });
    if (!sort) return rows;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sort.key as keyof typeof a];
      const bv = b[sort.key as keyof typeof b];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [query, category, sort, voided]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <main className="psi-container">
      <h1>Transactions</h1>

      {/* filter-toolbar */}
      <Toolbar aria-label="Filters" gap={12}>
        <Field label="Search">
          <Input
            size={32}
            value={query}
            onChange={(e) => { setQuery(e.currentTarget.value); setPage(1); }}
          />
        </Field>
        <Field label="Category">
          <Select
            size={32}
            value={category}
            onChange={(e) => { setCategory(e.currentTarget.value); setPage(1); }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        {query.trim() && (
          <Tag onDismiss={() => { setQuery(""); setPage(1); }}>Search: {query.trim()}</Tag>
        )}
        {category && (
          <Tag onDismiss={() => { setCategory(""); setPage(1); }}>Category: {category}</Tag>
        )}
      </Toolbar>

      {/* bulk-action-bar */}
      {selected.size > 0 && (
        <Toolbar gap={12}>
          <Tag variant="accent" subtle>{selected.size} selected</Tag>
          <Button variant="neutral">Export</Button>
          <Button variant="danger-subtle">Delete</Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </Toolbar>
      )}

      {rows.length === 0 ? (
        /* empty-state */
        <Panel padding={24}>
          <p>Nothing matches these filters.</p>
          <p>Try a broader search — the dataset has {TRANSACTIONS.length} transactions.</p>
          <Button variant="neutral" onClick={() => { setQuery(""); setCategory(""); setPage(1); }}>Clear filters</Button>
        </Panel>
      ) : (
        <>
          {/* data-table */}
          <Table
            sortable
            selectable
            stickyHeader
            sort={sort}
            onSortChange={(next) => { setSort(next); setPage(1); }}
            selected={selected}
            onSelectionChange={setSelected}
          >
            <TableHead>
              <TableRow>
                <TableHeaderCell sortKey="date">Date</TableHeaderCell>
                <TableHeaderCell sortKey="payee">Payee</TableHeaderCell>
                <TableHeaderCell sortKey="category">Category</TableHeaderCell>
                <TableHeaderCell sortKey="amount" numeric>Amount</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} rowId={t.id} selectLabel={`Select ${t.date} ${t.payee}`}>
                  <TableCell>{t.date}</TableCell>
                  <TableCell>{t.payee}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell numeric>{currency(t.amount)}</TableCell>
                  <TableCell>
                    {/* row-actions */}
                    <Menu
                      open={openMenu === t.id}
                      onClose={() => setOpenMenu(null)}
                      aria-label={`Actions for ${t.payee}`}
                      trigger={
                        <IconButton
                          aria-label={`Actions for ${t.payee}`}
                          size={32}
                          variant="ghost"
                          onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                        >
                          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
                            <circle cx="8" cy="3" r="1.4" fill="currentColor" />
                            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
                            <circle cx="8" cy="13" r="1.4" fill="currentColor" />
                          </svg>
                        </IconButton>
                      }
                    >
                      <MenuItem
                        onSelect={() => {
                          setDetailId(t.id);
                          setOpenMenu(null);
                        }}
                      >
                        View details
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem variant="danger" onSelect={() => voidTransaction(t.id, t.payee)}>Void</MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* table-pagination */}
          <Toolbar gap={12}>
            <Field label="Rows per page">
              <Select
                size={32}
                value={String(pageSize)}
                onChange={(e) => { setPageSize(Number(e.currentTarget.value)); setPage(1); }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </Select>
            </Field>
            <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />
          </Toolbar>
        </>
      )}
      {/* detail-drawer */}
      <Dialog
        open={detail !== null}
        onClose={() => setDetailId(null)}
        placement="inline-end"
        width={400}
        title={detail ? detail.payee : undefined}
        footer={
          <Button variant="neutral" onClick={() => setDetailId(null)}>
            Close
          </Button>
        }
      >
        {detail && (
          <dl>
            <dt>Date</dt>
            <dd>{detail.date}</dd>
            <dt>Category</dt>
            <dd>{detail.category}</dd>
            <dt>Amount</dt>
            <dd className="psi-tabular">{currency(detail.amount)}</dd>
            <dt>Reference</dt>
            <dd className="psi-tabular">{detail.id}</dd>
          </dl>
        )}
      </Dialog>
    </main>
  );
}
