"use client";

import { useEffect } from "react";
import { logger } from "@repo/utils";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          logger.info({ registration }, "Service worker registered successfully");
        })
        .catch((error) => {
          // SW registration failures are non-fatal — the app works fine without one.
          logger.warn(
            { error: error.message ?? String(error) },
            "Service worker registration failed"
          );
        });
    }
  }, []);

  return null;
}
