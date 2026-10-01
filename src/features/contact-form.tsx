"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().trim().min(2, "Tell us your name"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  message: z.string().trim().min(10, "Add a little more detail (at least 10 characters)").max(3000, "Message is too long"),
});
type Values = z.infer<typeof schema>;

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

/**
 * The backend has no contact endpoint, so this never pretends a message was
 * "sent". With NEXT_PUBLIC_CONTACT_EMAIL it opens the visitor's mail client;
 * without it, it copies the message so nothing typed is lost.
 */
export function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    const body = `${v.message}\n\n— ${v.name} (${v.email})`;
    if (CONTACT_EMAIL) {
      window.open(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("AgencyOps enquiry")}&body=${encodeURIComponent(body)}`, "_self");
      return;
    }
    try { await navigator.clipboard.writeText(body); toast.success("Message copied to your clipboard"); }
    catch { toast.error("Couldn't copy the message. Select and copy it manually."); }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {(["name", "email"] as const).map((f) => (
        <div key={f} className="space-y-1.5">
          <Label htmlFor={`c-${f}`}>{f === "name" ? "Name" : "Email"}</Label>
          <Input id={`c-${f}`} type={f === "email" ? "email" : "text"} autoComplete={f} aria-invalid={!!errors[f]} {...register(f)} />
          {errors[f] ? <p className="text-xs text-danger">{errors[f]?.message}</p> : null}
        </div>
      ))}
      <div className="space-y-1.5">
        <Label htmlFor="c-message">Message</Label>
        <Textarea id="c-message" className="min-h-32" aria-invalid={!!errors.message} {...register("message")} />
        {errors.message ? <p className="text-xs text-danger">{errors.message.message}</p> : null}
      </div>
      <Button type="submit">{CONTACT_EMAIL ? "Open in email app" : "Copy message"}</Button>
      {!CONTACT_EMAIL ? <p className="text-xs text-muted-foreground">A public contact address isn&apos;t configured for this deployment, so your message is copied rather than sent.</p> : null}
    </form>
  );
}
