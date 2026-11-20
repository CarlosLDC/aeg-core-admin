"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { FieldLabel } from "@/components/ui/field-label";
import {
  getAuthActionErrorMessage,
  resetPassword,
  validatePasswordResetToken,
  type PasswordResetValidationResponse,
} from "@/lib/auth-invitations-api";
import {
  MIN_SELF_SERVICE_PASSWORD_LENGTH,
  validateSelfServicePassword,
} from "@/lib/user-form";
import { cn } from "@/lib/utils";

type ResetValidationState =
  | { token: string; details: PasswordResetValidationResponse; error: null }
  | { token: string; details: null; error: string };

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [validation, setValidation] = useState<ResetValidationState | null>(
    null,
  );
  const validating = Boolean(token) && validation?.token !== token;
  const details =
    token && validation?.token === token ? validation.details : null;
  const tokenError = !token
    ? "El enlace de recuperación no contiene un token válido. Solicita uno nuevo."
    : validation?.token === token
      ? validation.error
      : null;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    validatePasswordResetToken(token)
      .then((data) => {
        if (!cancelled) {
          setValidation({ token, details: data, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setValidation({
            token,
            details: null,
            error: getAuthActionErrorMessage(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const passwordError = validateSelfServicePassword(
      password,
      confirmPassword,
    );
    if (passwordError) {
      setSubmitError(passwordError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await resetPassword(token, password);
      setDoneMessage(response.message);
    } catch (err) {
      setSubmitError(getAuthActionErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitShell
      title="Restablecer contraseña"
      subtitle="Elige una nueva contraseña segura para acceder a tu cuenta."
    >
      {validating ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
          <Loader2 className="size-7 animate-spin text-accent" />
          <p className="text-sm text-muted">Verificando enlace...</p>
        </div>
      ) : tokenError || !details ? (
        <div className="space-y-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-6">
          <div className="flex items-start gap-3 text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Enlace no disponible</p>
              <p>{tokenError}</p>
            </div>
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Solicitar un nuevo enlace
          </Link>
        </div>
      ) : doneMessage ? (
        <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
          <div className="flex items-start gap-3 text-sm text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <p className="font-semibold">Contraseña actualizada</p>
              <p>{doneMessage}</p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted">Cuenta</p>
            <p className="mt-0.5 font-mono text-sm text-card-foreground">
              {details.email}
            </p>
          </div>

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <label className="block">
            <FieldLabel required>Nueva contraseña</FieldLabel>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                required
                minLength={MIN_SELF_SERVICE_PASSWORD_LENGTH}
                disabled={submitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-border/80 bg-login-field pl-10 pr-11 text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-ring/20"
                placeholder={`Mínimo ${MIN_SELF_SERVICE_PASSWORD_LENGTH} caracteres`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </label>

          <label className="block">
            <FieldLabel required>Confirmar contraseña</FieldLabel>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={MIN_SELF_SERVICE_PASSWORD_LENGTH}
                disabled={submitting}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-border/80 bg-login-field pl-10 pr-11 text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-ring/20"
                placeholder="Repite tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label={
                  showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showConfirm ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
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
                Guardando contraseña...
              </>
            ) : (
              "Guardar nueva contraseña"
            )}
          </button>
        </form>
      )}
    </AuthSplitShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-login-panel">
          <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
            <ThemeToggle />
          </div>
          <Loader2 className="size-8 animate-spin text-accent" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
