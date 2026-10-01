"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toErrorMessage } from "@/lib/api/errors";
import { useAuth } from "./auth-provider";
import { registerSchema, type RegisterValues } from "./schemas";

const FIELDS = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name" },
  { name: "email", label: "Work email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters, with a letter and a number." },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
] as const;

export function RegisterForm() {
  const { register: signUp } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async ({ name, email, password }) => {
        setServerError(null);
        try {
          await signUp({ name, email, password });
          toast.success("Account created");
          router.replace("/organizations");
        } catch (e) {
          const msg = toErrorMessage(e);
          setServerError(msg);
          toast.error(msg);
        }
      })}
    >
      {FIELDS.map((f) => {
        const err = errors[f.name];
        return (
          <div key={f.name} className="space-y-1.5">
            <Label htmlFor={f.name}>{f.label}</Label>
            <Input id={f.name} type={f.type} autoComplete={f.autoComplete} aria-invalid={!!err} aria-describedby={`${f.name}-msg`} {...register(f.name)} />
            <p id={`${f.name}-msg`} className={err ? "text-xs text-danger" : "text-xs text-muted-foreground"}>{err ? err.message : ("hint" in f ? f.hint : "")}</p>
          </div>
        );
      })}
      {serverError ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p> : null}
      <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
