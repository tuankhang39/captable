function isConfiguredSentryValue(value: string | undefined) {
  return !!value && !value.startsWith("YOUR_");
}

export const isSentryEnabled = !!(
  isConfiguredSentryValue(process.env.SENTRY_ORG) &&
  isConfiguredSentryValue(process.env.SENTRY_PROJECT) &&
  isConfiguredSentryValue(process.env.NEXT_PUBLIC_SENTRY_DSN)
);
