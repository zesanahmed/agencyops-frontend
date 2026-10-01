import type { Metadata } from "next";
import { ContactForm } from "@/features/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about AgencyOps? Get in touch.",
  openGraph: { title: "Contact AgencyOps", description: "Questions about AgencyOps? Get in touch." },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Contact</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Talk to us.</h1>
      <p className="mb-8 mt-3 text-muted-foreground">Questions about the product, or a workflow you&apos;d like to see supported.</p>
      <ContactForm />
    </div>
  );
}
