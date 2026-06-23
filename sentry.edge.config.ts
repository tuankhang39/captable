import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && !dsn.startsWith("YOUR_")) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1,
    debug: false,
  });
}
