/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { openDB } from "idb";

const DB_NAME = "hyperlink-pwa-share";
const STORE_NAME = "shared-files";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/send") {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const files = formData.getAll("media") as File[];
        const title = formData.get("title") as string;
        const text = formData.get("text") as string;
        const shareUrl = formData.get("url") as string;

        const db = await openDB(DB_NAME, 1, {
          upgrade(db) {
            db.createObjectStore(STORE_NAME);
          },
        });

        const sharedData = {
          files: files.map(f => ({
            name: f.name,
            type: f.type,
            blob: f
          })),
          title,
          text,
          url: shareUrl,
          timestamp: Date.now()
        };

        await db.put(STORE_NAME, sharedData, "latest");

        return Response.redirect("/send?shared=true", 303);
      })()
    );
  }
});
