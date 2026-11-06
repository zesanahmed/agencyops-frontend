"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useClientProjects, useClients } from "@/features/clients/hooks";
import { useOrg } from "@/features/organizations/org-context";
import { extractFieldErrors } from "@/lib/api/field-errors";
import type { InvoiceBody } from "@/lib/api/services";
import { formatCalendarDate, fromDateInputValue, toDateInputValue } from "@/lib/format";
import { centsToInput, formatMoney, parseMoneyToCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types/domain";
import { useCreateInvoice, useUpdateInvoice } from "./hooks";
import { lineAmountCents, previewTotals } from "./invoice-math";
import { InvoiceTotals } from "./invoice-totals";
import { CURRENCIES, STEP_FIELDS, invoiceSchema, type InvoiceValues } from "./schemas";

const STEPS = ["Client & dates", "Line items", "Review"] as const;
const FIELD_STEP: Record<string, number> = { clientId: 0, projectId: 0, issueDate: 0, dueDate: 0, currency: 0, items: 1, tax: 1, discount: 1, notes: 2 };
/** The review reads the date fields on every render, including while the user has a date input cleared or half-typed. */
const reviewDay = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? formatCalendarDate(fromDateInputValue(v)) : "—");
const dayOffset = (days: number) => toDateInputValue(new Date(Date.now() + days * 86_400_000).toISOString());

function defaultsFor(invoice?: Invoice): InvoiceValues {
  if (!invoice) return { clientId: "", projectId: "", issueDate: dayOffset(0), dueDate: dayOffset(14), currency: "usd", items: [{ description: "", quantity: "1", unitPrice: "" }], tax: "0.00", discount: "0.00", notes: "" };
  return {
    clientId: invoice.clientId, projectId: invoice.projectId ?? "", issueDate: toDateInputValue(invoice.issueDate), dueDate: toDateInputValue(invoice.dueDate), currency: invoice.currency,
    items: invoice.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: centsToInput(i.unitAmountCents) })),
    tax: centsToInput(invoice.taxCents), discount: centsToInput(invoice.discountCents), notes: invoice.notes ?? "",
  };
}

/** Three-step invoice form: client & dates -> line items -> review. Edit mode (drafts only) reuses it; the client is fixed then. */
export function InvoiceWizard({ invoice }: { invoice?: Invoice }) {
  const { organizationId: o } = useOrg();
  const router = useRouter();
  const editing = !!invoice;
  const [step, setStep] = useState(0);
  const create = useCreateInvoice(o);
  const update = useUpdateInvoice(o, invoice?.id ?? "");
  const form = useForm<InvoiceValues>({ resolver: zodResolver(invoiceSchema), defaultValues: defaultsFor(invoice), mode: "onTouched" });
  const { register, control, handleSubmit, trigger, setError, getValues, formState: { errors } } = form;
  const items = useFieldArray({ control, name: "items" });

  const clients = useClients(o, { limit: 100, sortBy: "name", sortOrder: "asc" });
  const clientId = useWatch({ control, name: "clientId" });
  const projects = useClientProjects(o, clientId);
  const currency = useWatch({ control, name: "currency" });
  const lines = useWatch({ control, name: "items" });
  const tax = useWatch({ control, name: "tax" });
  const discount = useWatch({ control, name: "discount" });
  const projectId = useWatch({ control, name: "projectId" });
  const issueDate = useWatch({ control, name: "issueDate" });
  const dueDate = useWatch({ control, name: "dueDate" });
  const totals = previewTotals(lines ?? [], tax, discount);
  const clientName = clients.data?.items.find((c) => c.id === clientId)?.name;
  const currencyOptions = (CURRENCIES as readonly string[]).includes(currency) ? CURRENCIES : [currency, ...CURRENCIES];

  async function next() {
    const ok = await trigger([...STEP_FIELDS[step]]);
    if (!ok) return;
    if (step === 0) {
      const { issueDate, dueDate } = getValues();
      // The schema's cross-field date rule only runs once every field is valid, so the step check is explicit.
      if (dueDate < issueDate) { setError("dueDate", { type: "validate", message: "Due date can't be before the issue date" }); return; }
    }
    if (step === 1 && totals.error) { setError("discount", { type: "validate", message: totals.error }); return; }
    setStep(step + 1);
  }

  const submit = handleSubmit(async (v) => {
    const common = {
      issueDate: fromDateInputValue(v.issueDate), dueDate: fromDateInputValue(v.dueDate), currency: v.currency,
      taxCents: parseMoneyToCents(v.tax || "0") ?? 0, discountCents: parseMoneyToCents(v.discount || "0") ?? 0,
      items: v.items.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitAmountCents: parseMoneyToCents(l.unitPrice) ?? 0 })),
    };
    try {
      if (invoice) {
        await update.mutateAsync({ ...common, projectId: v.projectId || null, notes: v.notes || null });
        router.push(`/organizations/${o}/invoices/${invoice.id}`);
      } else {
        const body: InvoiceBody = { ...common, clientId: v.clientId, ...(v.projectId ? { projectId: v.projectId } : {}), ...(v.notes ? { notes: v.notes } : {}) };
        const created = await create.mutateAsync(body);
        router.push(`/organizations/${o}/invoices/${created.id}`);
      }
    } catch (e) {
      // The mutation already toasted. Put server field errors back on their field and show the step that owns it.
      const f = extractFieldErrors(e, ["clientId", "projectId", "issueDate", "dueDate", "currency", "taxCents", "discountCents", "notes"] as const);
      const map: Record<string, keyof InvoiceValues> = { taxCents: "tax", discountCents: "discount" };
      const first = Object.entries(f)[0];
      for (const [k, message] of Object.entries(f)) setError((map[k] ?? k) as keyof InvoiceValues, { type: "server", message });
      if (first) setStep(FIELD_STEP[map[first[0]] ?? first[0]] ?? 0);
    }
  }, (invalid) => {
    // Every step stays mounted, so an error on an earlier step would be invisible from the review step: go to it.
    const steps = Object.keys(invalid).map((k) => FIELD_STEP[k] ?? 0);
    if (steps.length) setStep(Math.min(...steps));
  });

  const err = (m?: string) => (m ? <p className="text-xs text-danger" role="alert">{m}</p> : null);

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); if (step === STEPS.length - 1) void submit(e); else void next(); }} className="space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-sm", i === step ? "border-primary bg-primary-soft font-medium text-primary" : i < step ? "border-border text-foreground" : "border-border text-muted-foreground")}>
            <span className="flex size-5 items-center justify-center rounded-full bg-surface-muted text-xs">{i < step ? <Check className="size-3" aria-hidden /> : i + 1}</span>{label}
          </li>
        ))}
      </ol>

      <section hidden={step !== 0} aria-label="Client and dates" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inv-client">Client</Label>
            {editing ? <p id="inv-client" className="flex h-9 items-center text-sm">{clientName ?? <Skeleton className="h-4 w-32" />}</p>
              : <Select id="inv-client" aria-invalid={!!errors.clientId} {...register("clientId", { onChange: () => form.setValue("projectId", "") })}>
                  <option value="">{clients.isLoading ? "Loading clients…" : "Choose a client…"}</option>
                  {clients.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>}
            {err(errors.clientId?.message)}
            {!editing && clients.isSuccess && !clients.data.items.length ? <p className="text-xs text-muted-foreground">You have no clients yet. <Link href={`/organizations/${o}/clients`} className="text-primary hover:underline">Add one first</Link>.</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-project">Project <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Select id="inv-project" disabled={!clientId} {...register("projectId")}>
              <option value="">No project</option>
              {projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <p className="text-xs text-muted-foreground">An invoice for a project is visible only to contacts who have access to it.</p>
          </div>
          <div className="space-y-1.5"><Label htmlFor="inv-issue">Issue date</Label><Input id="inv-issue" type="date" aria-invalid={!!errors.issueDate} {...register("issueDate")} />{err(errors.issueDate?.message)}</div>
          <div className="space-y-1.5"><Label htmlFor="inv-due">Due date</Label><Input id="inv-due" type="date" aria-invalid={!!errors.dueDate} {...register("dueDate")} />{err(errors.dueDate?.message)}</div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-currency">Currency</Label>
            <Select id="inv-currency" {...register("currency")}>{currencyOptions.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}</Select>
            {err(errors.currency?.message)}
          </div>
        </div>
      </section>

      <section hidden={step !== 1} aria-label="Line items" className="space-y-4">
        <ul className="space-y-3">
          {items.fields.map((f, i) => {
            const amount = lineAmountCents(lines?.[i] ?? { quantity: "", unitPrice: "" });
            const e = errors.items?.[i];
            return (
              <li key={f.id} className="grid gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[1fr_5rem_8rem_7rem_auto] sm:items-start">
                <div className="space-y-1"><Label htmlFor={`item-desc-${i}`} className="sm:sr-only">Description</Label><Input id={`item-desc-${i}`} placeholder="Design sprint, 2 weeks" aria-invalid={!!e?.description} {...register(`items.${i}.description`)} />{err(e?.description?.message)}</div>
                <div className="space-y-1"><Label htmlFor={`item-qty-${i}`} className="sm:sr-only">Quantity</Label><Input id={`item-qty-${i}`} inputMode="numeric" placeholder="Qty" aria-invalid={!!e?.quantity} {...register(`items.${i}.quantity`)} />{err(e?.quantity?.message)}</div>
                <div className="space-y-1"><Label htmlFor={`item-price-${i}`} className="sm:sr-only">Unit price</Label><Input id={`item-price-${i}`} inputMode="decimal" placeholder="Unit price" aria-invalid={!!e?.unitPrice} {...register(`items.${i}.unitPrice`)} />{err(e?.unitPrice?.message)}</div>
                <p className="flex h-9 items-center justify-end text-sm tabular-nums text-muted-foreground" aria-label={`Line ${i + 1} amount`}>{amount === null ? "—" : formatMoney(amount, currency)}</p>
                <Button type="button" variant="ghost" size="sm" disabled={items.fields.length === 1} onClick={() => items.remove(i)} aria-label={`Remove line ${i + 1}`}><Trash2 /></Button>
              </li>
            );
          })}
        </ul>
        {err(typeof errors.items?.message === "string" ? errors.items.message : errors.items?.root?.message)}
        <Button type="button" variant="secondary" size="sm" disabled={items.fields.length >= 50} onClick={() => items.append({ description: "", quantity: "1", unitPrice: "" })}><Plus /> Add line</Button>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="inv-discount">Discount ({currency.toUpperCase()})</Label><Input id="inv-discount" inputMode="decimal" aria-invalid={!!errors.discount} {...register("discount")} />{err(errors.discount?.message)}</div>
          <div className="space-y-1.5"><Label htmlFor="inv-tax">Tax ({currency.toUpperCase()})</Label><Input id="inv-tax" inputMode="decimal" aria-invalid={!!errors.tax} {...register("tax")} />{err(errors.tax?.message)}</div>
        </div>
        <InvoiceTotals currency={currency} {...totals} />
      </section>

      <section hidden={step !== 2} aria-label="Review" className="space-y-4">
        <dl className="grid gap-3 rounded-lg border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Client</dt><dd className="font-medium">{clientName ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Project</dt><dd className="font-medium">{projects.data?.find((p) => p.id === projectId)?.name ?? "None"}</dd></div>
          <div><dt className="text-muted-foreground">Issued</dt><dd className="font-medium">{reviewDay(issueDate)}</dd></div>
          <div><dt className="text-muted-foreground">Due</dt><dd className="font-medium">{reviewDay(dueDate)}</dd></div>
        </dl>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
          {(lines ?? []).map((l, i) => <li key={i} className="flex justify-between gap-4 px-4 py-2.5"><span className="min-w-0 break-words">{l.description || "—"} <span className="text-muted-foreground">× {l.quantity}</span></span><span className="tabular-nums">{lineAmountCents(l) === null ? "—" : formatMoney(lineAmountCents(l)!, currency)}</span></li>)}
        </ul>
        <InvoiceTotals currency={currency} {...totals} />
        <div className="space-y-1.5">
          <Label htmlFor="inv-notes">Notes <span className="font-normal text-muted-foreground">(optional, shown to the client)</span></Label>
          <Textarea id="inv-notes" className="min-h-24" aria-invalid={!!errors.notes} {...register("notes")} />{err(errors.notes?.message)}
        </div>
        <p className="text-xs text-muted-foreground">{editing ? "Changes are saved to the draft." : "This saves a draft. Nothing is visible to the client until you send it."}</p>
      </section>

      <div className="flex justify-between gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={() => (step === 0 ? router.back() : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</Button>
        {step < STEPS.length - 1 ? <Button type="submit">Continue</Button> : <Button type="submit" loading={create.isPending || update.isPending}>{editing ? "Save changes" : "Create draft invoice"}</Button>}
      </div>
    </form>
  );
}

/** Loads what the wizard needs before it renders (so default values are right for edit). */
export function InvoiceWizardGate({ invoice, isLoading, error, onRetry }: { invoice?: Invoice; isLoading?: boolean; error?: unknown; onRetry?: () => void }) {
  if (isLoading) return <div className="space-y-3" role="status" aria-label="Loading invoice"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>;
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Couldn't load this invoice" />;
  return <InvoiceWizard invoice={invoice} />;
}
