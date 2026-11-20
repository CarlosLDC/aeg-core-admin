"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { FieldLabel } from "@/components/ui/field-label";
import {
  getAuthActionErrorMessage,
  requestPasswordReset,
} from "@/lib/auth-invitations-api";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await requestPasswordReset(email.trim());
      setSubmittedMessage(response.message);
    } catch (err) {
      setError(getAuthActionErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitShell
      title="Recuperar contraseña"
      subtitle="Ingresa el correo de tu cuenta y te enviaremos un enlace para restablecer tu clave."
    >
      {submittedMessage ? (
        <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
          <div className="flex items-start gap-3 text-sm text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <p className="font-semibold">Solicitud recibida</p>
              <p>{submittedMessage}</p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="block">
            <FieldLabel required>Correo electrónico</FieldLabel>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                disabled={submitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-border/80 bg-login-field pl-10 pr-4 text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-ring/20"
                placeholder="tu.usuario@empresa.com"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity",
              submitting && "cursor-not-allowed opacity-70",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar enlace de recuperación"
            )}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent underline-offset-2 hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      )}
    </AuthSplitShell>
  );
}
