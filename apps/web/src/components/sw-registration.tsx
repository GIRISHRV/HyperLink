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
          logger.error({ error }, "Service worker registration failed");
        });
    }
  }, []);

  return null;
}
