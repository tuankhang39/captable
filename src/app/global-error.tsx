"use client";

import { PublicEnvScript } from "@/components/public-env-script";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    const handleError = async () => {
      const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

      if (dsn && !dsn.startsWith("YOUR_")) {
        const captureException = (await import("@sentry/nextjs"))
          .captureException;

        captureException(error);
      }
    };

    handleError();
  }, [error]);

  return (
    <html lang="en">
      <head>
        <PublicEnvScript />
      </head>
      <body>
        <NextError statusCode={undefined as never} />
      </body>
    </html>
  );
}
