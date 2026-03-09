if (!self.define) {
  let e,
    s = {};
  const n = (n, i) => (
    (n = new URL(n + ".js", i).href),
    s[n] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          ((e.src = n), (e.onload = s), document.head.appendChild(e));
        } else ((e = n), importScripts(n), s());
      }).then(() => {
        let e = s[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (i, c) => {
    const a = e || ("document" in self ? document.currentScript.src : "") || location.href;
    if (s[a]) return;
    let t = {};
    const r = (e) => n(e, a),
      d = { module: { uri: a }, exports: t, require: r };
    s[a] = Promise.all(i.map((e) => d[e] || r(e))).then((e) => (c(...e), t));
  };
}
define(["./workbox-b52a85cb"], function (e) {
  "use strict";
  (importScripts("/worker-09575759e4cc1351.js"),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: "/_next/static/chunks/146-3e97e3a460cb8cb2.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        {
          url: "/_next/static/chunks/1dd3208c-894c180961753a5e.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        { url: "/_next/static/chunks/294-0f36df69e28a31ad.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        { url: "/_next/static/chunks/315.1768fddb7331c54b.js", revision: "1768fddb7331c54b" },
        { url: "/_next/static/chunks/324-9bdb6d72acd60a8b.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        { url: "/_next/static/chunks/390-6db253bfba2db014.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        { url: "/_next/static/chunks/454.5b1cb47a020efdae.js", revision: "5b1cb47a020efdae" },
        { url: "/_next/static/chunks/460-cb316db8b95fb9b1.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        { url: "/_next/static/chunks/486-e0c9e3b00ecdbfd5.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        {
          url: "/_next/static/chunks/4ff7191e-3d487707d47db3f3.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        { url: "/_next/static/chunks/520.8ba71f66370da17c.js", revision: "8ba71f66370da17c" },
        {
          url: "/_next/static/chunks/59c6eb5a-360cfcf02d1d2d37.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        { url: "/_next/static/chunks/64-6deb5865f9684343.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        { url: "/_next/static/chunks/671-cdc4340c63cc2b3d.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        { url: "/_next/static/chunks/692-dc6669ee23015b95.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        { url: "/_next/static/chunks/787-c96295ebb83765fd.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        { url: "/_next/static/chunks/808-43c7957fcdeff0ef.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        { url: "/_next/static/chunks/944-7b709b3b0a4dc180.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        {
          url: "/_next/static/chunks/app/_not-found/page-1e47fe1e20819d8b.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/about/page-944c341ee88c513d.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/auth/page-06e721ccc1ba96dc.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/dashboard/error-4726bcee1aa01e07.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/dashboard/page-c48088be77a3b8a9.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/error-f6d863b5cacb1282.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/global-error-9ae2fb6ed569fe34.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/history/page-20993494cd0d20d6.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/layout-c37dc694b1a1db70.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/not-found-192fe12507c9d34b.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/offline/page-4dcf7818618dd746.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/page-b688d6e91c0e8b3b.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/receive/error-d4e45e19a528de8f.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/receive/page-f8d65db0976f3cae.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/send/error-5c8bc501104a6e08.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/send/page-486ab004e0d7fe8b.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/settings/page-bc0a9113b6105bb5.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/app/status/page-1c74866d55c37fca.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/framework-b9942f672edbba0b.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        { url: "/_next/static/chunks/main-8eb0cebaa8b6d7e8.js", revision: "nCyq8rPsc9EdlLUHtQAAi" },
        {
          url: "/_next/static/chunks/main-app-d5ccb4e375c74f48.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/pages/_app-bf362c62d82b2919.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/pages/_error-c789141acc540760.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-199e6860c5de6f72.js",
          revision: "nCyq8rPsc9EdlLUHtQAAi",
        },
        { url: "/_next/static/css/42f5ff401c9e018a.css", revision: "42f5ff401c9e018a" },
        {
          url: "/_next/static/media/36966cca54120369-s.p.woff2",
          revision: "25ea4a783c12103f175f5b157b7d96aa",
        },
        {
          url: "/_next/static/media/b7387a63dd068245-s.woff2",
          revision: "dea099b7d5a5ea45bd4367f8aeff62ab",
        },
        {
          url: "/_next/static/media/e1aab0933260df4d-s.woff2",
          revision: "207f8e9f3761dbd724063a177d906a99",
        },
        {
          url: "/_next/static/nCyq8rPsc9EdlLUHtQAAi/_buildManifest.js",
          revision: "644204d67f88659f6eed92e52dbb05a1",
        },
        {
          url: "/_next/static/nCyq8rPsc9EdlLUHtQAAi/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        { url: "/android-chrome-192x192.png", revision: "b363bbf96b70fa5ca02a586d78654b14" },
        { url: "/android-chrome-512x512.png", revision: "8cf4b099fb5d2a75669f98041a7a45ff" },
        { url: "/apple-touch-icon.png", revision: "c634562a26ee3fe92d1e5ab2a09ef2d0" },
        { url: "/favicon-16x16.png", revision: "3a5ac2dc1aec75ff3d02c357a5d2eee9" },
        { url: "/favicon-32x32.png", revision: "6e5ff6f3c258d91db1ade0042c945c67" },
        { url: "/favicon.ico", revision: "49f039c9b5e74491e04546508844213c" },
        {
          url: "/favicon/android-chrome-192x192.png",
          revision: "b363bbf96b70fa5ca02a586d78654b14",
        },
        {
          url: "/favicon/android-chrome-512x512.png",
          revision: "8cf4b099fb5d2a75669f98041a7a45ff",
        },
        { url: "/favicon/apple-touch-icon.png", revision: "c634562a26ee3fe92d1e5ab2a09ef2d0" },
        { url: "/favicon/favicon-16x16.png", revision: "3a5ac2dc1aec75ff3d02c357a5d2eee9" },
        { url: "/favicon/favicon-32x32.png", revision: "6e5ff6f3c258d91db1ade0042c945c67" },
        { url: "/favicon/favicon.ico", revision: "49f039c9b5e74491e04546508844213c" },
        { url: "/favicon/site.webmanifest", revision: "5061fbd4a6f6729f4995482be0ec4798" },
        { url: "/worker-09575759e4cc1351.js", revision: "cfd8bd88f3267e92ed7def9815417308" },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({ response: e }) =>
              e && "opaqueredirect" === e.type
                ? new Response(e.body, { status: 200, statusText: "OK", headers: e.headers })
                : e,
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 })],
      }),
      "GET"
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 })],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: "next-static-js-assets",
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ sameOrigin: e, url: { pathname: s } }) =>
        !(!e || s.startsWith("/api/auth/callback") || !s.startsWith("/api/")),
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: n }) =>
        "1" === e.headers.get("RSC") &&
        "1" === e.headers.get("Next-Router-Prefetch") &&
        n &&
        !s.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc-prefetch",
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: n }) =>
        "1" === e.headers.get("RSC") && n && !s.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc",
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ url: { pathname: e }, sameOrigin: s }) => s && !e.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages",
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ sameOrigin: e }) => !e,
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 })],
      }),
      "GET"
    ));
});
//# sourceMappingURL=sw.js.map
