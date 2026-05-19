type ErrorContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

/** Reporta errores a Sentry cuando NEXT_PUBLIC_SENTRY_DSN está configurado. */
export function captureException(error: unknown, context?: ErrorContext): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.captureException(error, {
        tags: context?.tags,
        extra: context?.extra,
      });
    })
    .catch(() => {
      if (process.env.NODE_ENV === "development") {
        console.error("[error-reporting]", error, context);
      }
    });
}
