(!(function () {
  try {
    var e =
        "undefined" != typeof window
          ? window
          : "undefined" != typeof global
            ? global
            : "undefined" != typeof globalThis
              ? globalThis
              : "undefined" != typeof self
                ? self
                : {},
      t = new e.Error().stack;
    t &&
      ((e._sentryDebugIds = e._sentryDebugIds || {}),
      (e._sentryDebugIds[t] = "e4dfe6cf-c416-47d5-9715-df973393e2dd"),
      (e._sentryDebugIdIdentifier = "sentry-dbid-e4dfe6cf-c416-47d5-9715-df973393e2dd"));
  } catch (e) {}
})(),
  (() => {
    "use strict";
    let e, t, a;
    let r = {
        googleAnalytics: "googleAnalytics",
        precache: "precache-v2",
        prefix: "serwist",
        runtime: "runtime",
        suffix: "undefined" != typeof registration ? registration.scope : "",
      },
      s = (e) => [r.prefix, e, r.suffix].filter((e) => e && e.length > 0).join("-"),
      n = (e) => {
        for (let t of Object.keys(r)) e(t);
      },
      i = {
        updateDetails: (e) => {
          n((t) => {
            let a = e[t];
            "string" == typeof a && (r[t] = a);
          });
        },
        getGoogleAnalyticsName: (e) => e || s(r.googleAnalytics),
        getPrecacheName: (e) => e || s(r.precache),
        getRuntimeName: (e) => e || s(r.runtime),
      },
      l = (e, ...t) => {
        let a = e;
        return (t.length > 0 && (a += ` :: ${JSON.stringify(t)}`), a);
      };
    class o extends Error {
      details;
      constructor(e, t) {
        (super(l(e, t)), (this.name = e), (this.details = t));
      }
    }
    let c = (e) =>
      new URL(String(e), location.href).href.replace(RegExp(`^${location.origin}`), "");
    function h(e) {
      return new Promise((t) => setTimeout(t, e));
    }
    let u = new Set();
    function d(e, t) {
      let a = new URL(e);
      for (let e of t) a.searchParams.delete(e);
      return a.href;
    }
    async function f(e, t, a, r) {
      let s = d(t.url, a);
      if (t.url === s) return e.match(t, r);
      let n = { ...r, ignoreSearch: !0 };
      for (let i of await e.keys(t, n)) if (s === d(i.url, a)) return e.match(i, r);
    }
    class y {
      promise;
      resolve;
      reject;
      constructor() {
        this.promise = new Promise((e, t) => {
          ((this.resolve = e), (this.reject = t));
        });
      }
    }
    let p = async () => {
        for (let e of u) await e();
      },
      g = "-precache-",
      w = async (e, t = g) => {
        let a = (await self.caches.keys()).filter(
          (a) => a.includes(t) && a.includes(self.registration.scope) && a !== e
        );
        return (await Promise.all(a.map((e) => self.caches.delete(e))), a);
      },
      m = (e) => {
        self.addEventListener("activate", (t) => {
          t.waitUntil(w(i.getPrecacheName(e)).then((e) => {}));
        });
      },
      _ = () => {
        self.addEventListener("activate", () => self.clients.claim());
      },
      b = (e, t) => {
        let a = t();
        return (e.waitUntil(a), a);
      },
      R = (e, t) => t.some((t) => e instanceof t),
      q = new WeakMap(),
      v = new WeakMap(),
      E = new WeakMap(),
      S = {
        get(e, t, a) {
          if (e instanceof IDBTransaction) {
            if ("done" === t) return q.get(e);
            if ("store" === t)
              return a.objectStoreNames[1] ? void 0 : a.objectStore(a.objectStoreNames[0]);
          }
          return D(e[t]);
        },
        set: (e, t, a) => ((e[t] = a), !0),
        has: (e, t) => (e instanceof IDBTransaction && ("done" === t || "store" === t)) || t in e,
      };
    function D(e) {
      var r;
      if (e instanceof IDBRequest)
        return (function (e) {
          let t = new Promise((t, a) => {
            let r = () => {
                (e.removeEventListener("success", s), e.removeEventListener("error", n));
              },
              s = () => {
                (t(D(e.result)), r());
              },
              n = () => {
                (a(e.error), r());
              };
            (e.addEventListener("success", s), e.addEventListener("error", n));
          });
          return (E.set(t, e), t);
        })(e);
      if (v.has(e)) return v.get(e);
      let s =
        "function" == typeof (r = e)
          ? (
              a ||
              (a = [
                IDBCursor.prototype.advance,
                IDBCursor.prototype.continue,
                IDBCursor.prototype.continuePrimaryKey,
              ])
            ).includes(r)
            ? function (...e) {
                return (r.apply(P(this), e), D(this.request));
              }
            : function (...e) {
                return D(r.apply(P(this), e));
              }
          : (r instanceof IDBTransaction &&
                (function (e) {
                  if (q.has(e)) return;
                  let t = new Promise((t, a) => {
                    let r = () => {
                        (e.removeEventListener("complete", s),
                          e.removeEventListener("error", n),
                          e.removeEventListener("abort", n));
                      },
                      s = () => {
                        (t(), r());
                      },
                      n = () => {
                        (a(e.error || new DOMException("AbortError", "AbortError")), r());
                      };
                    (e.addEventListener("complete", s),
                      e.addEventListener("error", n),
                      e.addEventListener("abort", n));
                  });
                  q.set(e, t);
                })(r),
              R(r, t || (t = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction])))
            ? new Proxy(r, S)
            : r;
      return (s !== e && (v.set(e, s), E.set(s, e)), s);
    }
    let P = (e) => E.get(e);
    function k(e, t, { blocked: a, upgrade: r, blocking: s, terminated: n } = {}) {
      let i = indexedDB.open(e, t),
        l = D(i);
      return (
        r &&
          i.addEventListener("upgradeneeded", (e) => {
            r(D(i.result), e.oldVersion, e.newVersion, D(i.transaction), e);
          }),
        a && i.addEventListener("blocked", (e) => a(e.oldVersion, e.newVersion, e)),
        l
          .then((e) => {
            (n && e.addEventListener("close", () => n()),
              s && e.addEventListener("versionchange", (e) => s(e.oldVersion, e.newVersion, e)));
          })
          .catch(() => {}),
        l
      );
    }
    let C = ["get", "getKey", "getAll", "getAllKeys", "count"],
      T = ["put", "add", "delete", "clear"],
      I = new Map();
    function L(e, t) {
      if (!(e instanceof IDBDatabase && !(t in e) && "string" == typeof t)) return;
      if (I.get(t)) return I.get(t);
      let a = t.replace(/FromIndex$/, ""),
        r = t !== a,
        s = T.includes(a);
      if (!(a in (r ? IDBIndex : IDBObjectStore).prototype) || !(s || C.includes(a))) return;
      let n = async function (e, ...t) {
        let n = this.transaction(e, s ? "readwrite" : "readonly"),
          i = n.store;
        return (r && (i = i.index(t.shift())), (await Promise.all([i[a](...t), s && n.done]))[0]);
      };
      return (I.set(t, n), n);
    }
    S = ((e) => ({
      ...e,
      get: (t, a, r) => L(t, a) || e.get(t, a, r),
      has: (t, a) => !!L(t, a) || e.has(t, a),
    }))(S);
    let N = ["continue", "continuePrimaryKey", "advance"],
      U = {},
      x = new WeakMap(),
      K = new WeakMap(),
      B = {
        get(e, t) {
          if (!N.includes(t)) return e[t];
          let a = U[t];
          return (
            a ||
              (a = U[t] =
                function (...e) {
                  x.set(this, K.get(this)[t](...e));
                }),
            a
          );
        },
      };
    async function* O(...e) {
      let t = this;
      if ((t instanceof IDBCursor || (t = await t.openCursor(...e)), !t)) return;
      let a = new Proxy(t, B);
      for (K.set(a, t), E.set(a, P(t)); t; )
        (yield a, (t = await (x.get(a) || t.continue())), x.delete(a));
    }
    function A(e, t) {
      return (
        (t === Symbol.asyncIterator && R(e, [IDBIndex, IDBObjectStore, IDBCursor])) ||
        ("iterate" === t && R(e, [IDBIndex, IDBObjectStore]))
      );
    }
    S = ((e) => ({
      ...e,
      get: (t, a, r) => (A(t, a) ? O : e.get(t, a, r)),
      has: (t, a) => A(t, a) || e.has(t, a),
    }))(S);
    let F = async (t, a) => {
        let r = null;
        if ((t.url && (r = new URL(t.url).origin), r !== self.location.origin))
          throw new o("cross-origin-copy-response", { origin: r });
        let s = t.clone(),
          n = { headers: new Headers(s.headers), status: s.status, statusText: s.statusText },
          i = a ? a(n) : n,
          l = !(function () {
            if (void 0 === e) {
              let t = new Response("");
              if ("body" in t)
                try {
                  (new Response(t.body), (e = !0));
                } catch {
                  e = !1;
                }
              e = !1;
            }
            return e;
          })()
            ? await s.blob()
            : s.body;
        return new Response(l, i);
      },
      M = () => {
        self.__WB_DISABLE_DEV_LOGS = !0;
      },
      W = "requests",
      j = "queueName";
    class H {
      _db = null;
      async addEntry(e) {
        let t = (await this.getDb()).transaction(W, "readwrite", { durability: "relaxed" });
        (await t.store.add(e), await t.done);
      }
      async getFirstEntryId() {
        let e = await this.getDb(),
          t = await e.transaction(W).store.openCursor();
        return t?.value.id;
      }
      async getAllEntriesByQueueName(e) {
        let t = await this.getDb();
        return (await t.getAllFromIndex(W, j, IDBKeyRange.only(e))) || [];
      }
      async getEntryCountByQueueName(e) {
        return (await this.getDb()).countFromIndex(W, j, IDBKeyRange.only(e));
      }
      async deleteEntry(e) {
        let t = await this.getDb();
        await t.delete(W, e);
      }
      async getFirstEntryByQueueName(e) {
        return await this.getEndEntryFromIndex(IDBKeyRange.only(e), "next");
      }
      async getLastEntryByQueueName(e) {
        return await this.getEndEntryFromIndex(IDBKeyRange.only(e), "prev");
      }
      async getEndEntryFromIndex(e, t) {
        let a = await this.getDb(),
          r = await a.transaction(W).store.index(j).openCursor(e, t);
        return r?.value;
      }
      async getDb() {
        return (
          this._db ||
            (this._db = await k("serwist-background-sync", 3, { upgrade: this._upgradeDb })),
          this._db
        );
      }
      _upgradeDb(e, t) {
        (t > 0 && t < 3 && e.objectStoreNames.contains(W) && e.deleteObjectStore(W),
          e
            .createObjectStore(W, { autoIncrement: !0, keyPath: "id" })
            .createIndex(j, j, { unique: !1 }));
      }
    }
    class $ {
      _queueName;
      _queueDb;
      constructor(e) {
        ((this._queueName = e), (this._queueDb = new H()));
      }
      async pushEntry(e) {
        (delete e.id, (e.queueName = this._queueName), await this._queueDb.addEntry(e));
      }
      async unshiftEntry(e) {
        let t = await this._queueDb.getFirstEntryId();
        (t ? (e.id = t - 1) : delete e.id,
          (e.queueName = this._queueName),
          await this._queueDb.addEntry(e));
      }
      async popEntry() {
        return this._removeEntry(await this._queueDb.getLastEntryByQueueName(this._queueName));
      }
      async shiftEntry() {
        return this._removeEntry(await this._queueDb.getFirstEntryByQueueName(this._queueName));
      }
      async getAll() {
        return await this._queueDb.getAllEntriesByQueueName(this._queueName);
      }
      async size() {
        return await this._queueDb.getEntryCountByQueueName(this._queueName);
      }
      async deleteEntry(e) {
        await this._queueDb.deleteEntry(e);
      }
      async _removeEntry(e) {
        return (e && (await this.deleteEntry(e.id)), e);
      }
    }
    let G = [
      "method",
      "referrer",
      "referrerPolicy",
      "mode",
      "credentials",
      "cache",
      "redirect",
      "integrity",
      "keepalive",
    ];
    class V {
      _requestData;
      static async fromRequest(e) {
        let t = { url: e.url, headers: {} };
        for (let a of ("GET" !== e.method && (t.body = await e.clone().arrayBuffer()),
        e.headers.forEach((e, a) => {
          t.headers[a] = e;
        }),
        G))
          void 0 !== e[a] && (t[a] = e[a]);
        return new V(t);
      }
      constructor(e) {
        ("navigate" === e.mode && (e.mode = "same-origin"), (this._requestData = e));
      }
      toObject() {
        let e = Object.assign({}, this._requestData);
        return (
          (e.headers = Object.assign({}, this._requestData.headers)),
          e.body && (e.body = e.body.slice(0)),
          e
        );
      }
      toRequest() {
        return new Request(this._requestData.url, this._requestData);
      }
      clone() {
        return new V(this.toObject());
      }
    }
    let Q = "serwist-background-sync",
      z = new Set(),
      J = (e) => {
        let t = { request: new V(e.requestData).toRequest(), timestamp: e.timestamp };
        return (e.metadata && (t.metadata = e.metadata), t);
      };
    class X {
      _name;
      _onSync;
      _maxRetentionTime;
      _queueStore;
      _forceSyncFallback;
      _syncInProgress = !1;
      _requestsAddedDuringSync = !1;
      constructor(e, { forceSyncFallback: t, onSync: a, maxRetentionTime: r } = {}) {
        if (z.has(e)) throw new o("duplicate-queue-name", { name: e });
        (z.add(e),
          (this._name = e),
          (this._onSync = a || this.replayRequests),
          (this._maxRetentionTime = r || 10080),
          (this._forceSyncFallback = !!t),
          (this._queueStore = new $(this._name)),
          this._addSyncListener());
      }
      get name() {
        return this._name;
      }
      async pushRequest(e) {
        await this._addRequest(e, "push");
      }
      async unshiftRequest(e) {
        await this._addRequest(e, "unshift");
      }
      async popRequest() {
        return this._removeRequest("pop");
      }
      async shiftRequest() {
        return this._removeRequest("shift");
      }
      async getAll() {
        let e = await this._queueStore.getAll(),
          t = Date.now(),
          a = [];
        for (let r of e) {
          let e = 6e4 * this._maxRetentionTime;
          t - r.timestamp > e ? await this._queueStore.deleteEntry(r.id) : a.push(J(r));
        }
        return a;
      }
      async size() {
        return await this._queueStore.size();
      }
      async _addRequest({ request: e, metadata: t, timestamp: a = Date.now() }, r) {
        let s = { requestData: (await V.fromRequest(e.clone())).toObject(), timestamp: a };
        switch ((t && (s.metadata = t), r)) {
          case "push":
            await this._queueStore.pushEntry(s);
            break;
          case "unshift":
            await this._queueStore.unshiftEntry(s);
        }
        this._syncInProgress ? (this._requestsAddedDuringSync = !0) : await this.registerSync();
      }
      async _removeRequest(e) {
        let t;
        let a = Date.now();
        switch (e) {
          case "pop":
            t = await this._queueStore.popEntry();
            break;
          case "shift":
            t = await this._queueStore.shiftEntry();
        }
        if (t) {
          let r = 6e4 * this._maxRetentionTime;
          return a - t.timestamp > r ? this._removeRequest(e) : J(t);
        }
      }
      async replayRequests() {
        let e;
        for (; (e = await this.shiftRequest()); )
          try {
            await fetch(e.request.clone());
          } catch {
            throw (
              await this.unshiftRequest(e),
              new o("queue-replay-failed", { name: this._name })
            );
          }
      }
      async registerSync() {
        if ("sync" in self.registration && !this._forceSyncFallback)
          try {
            await self.registration.sync.register(`${Q}:${this._name}`);
          } catch (e) {}
      }
      _addSyncListener() {
        "sync" in self.registration && !this._forceSyncFallback
          ? self.addEventListener("sync", (e) => {
              if (e.tag === `${Q}:${this._name}`) {
                let t = async () => {
                  let t;
                  this._syncInProgress = !0;
                  try {
                    await this._onSync({ queue: this });
                  } catch (e) {
                    if (e instanceof Error) throw e;
                  } finally {
                    (this._requestsAddedDuringSync &&
                      !(t && !e.lastChance) &&
                      (await this.registerSync()),
                      (this._syncInProgress = !1),
                      (this._requestsAddedDuringSync = !1));
                  }
                };
                e.waitUntil(t());
              }
            })
          : this._onSync({ queue: this });
      }
      static get _queueNames() {
        return z;
      }
    }
    class Y {
      _queue;
      constructor(e, t) {
        this._queue = new X(e, t);
      }
      async fetchDidFail({ request: e }) {
        await this._queue.pushRequest({ request: e });
      }
    }
    let Z = {
      cacheWillUpdate: async ({ response: e }) => (200 === e.status || 0 === e.status ? e : null),
    };
    function ee(e) {
      return "string" == typeof e ? new Request(e) : e;
    }
    class et {
      event;
      request;
      url;
      params;
      _cacheKeys = {};
      _strategy;
      _handlerDeferred;
      _extendLifetimePromises;
      _plugins;
      _pluginStateMap;
      constructor(e, t) {
        for (let a of ((this.event = t.event),
        (this.request = t.request),
        t.url && ((this.url = t.url), (this.params = t.params)),
        (this._strategy = e),
        (this._handlerDeferred = new y()),
        (this._extendLifetimePromises = []),
        (this._plugins = [...e.plugins]),
        (this._pluginStateMap = new Map()),
        this._plugins))
          this._pluginStateMap.set(a, {});
        this.event.waitUntil(this._handlerDeferred.promise);
      }
      async fetch(e) {
        let { event: t } = this,
          a = ee(e),
          r = await this.getPreloadResponse();
        if (r) return r;
        let s = this.hasCallback("fetchDidFail") ? a.clone() : null;
        try {
          for (let e of this.iterateCallbacks("requestWillFetch"))
            a = await e({ request: a.clone(), event: t });
        } catch (e) {
          if (e instanceof Error)
            throw new o("plugin-error-request-will-fetch", { thrownErrorMessage: e.message });
        }
        let n = a.clone();
        try {
          let e;
          for (let r of ((e = await fetch(
            a,
            "navigate" === a.mode ? void 0 : this._strategy.fetchOptions
          )),
          this.iterateCallbacks("fetchDidSucceed")))
            e = await r({ event: t, request: n, response: e });
          return e;
        } catch (e) {
          throw (
            s &&
              (await this.runCallbacks("fetchDidFail", {
                error: e,
                event: t,
                originalRequest: s.clone(),
                request: n.clone(),
              })),
            e
          );
        }
      }
      async fetchAndCachePut(e) {
        let t = await this.fetch(e),
          a = t.clone();
        return (this.waitUntil(this.cachePut(e, a)), t);
      }
      async cacheMatch(e) {
        let t;
        let a = ee(e),
          { cacheName: r, matchOptions: s } = this._strategy,
          n = await this.getCacheKey(a, "read"),
          i = { ...s, cacheName: r };
        for (let e of ((t = await caches.match(n, i)),
        this.iterateCallbacks("cachedResponseWillBeUsed")))
          t =
            (await e({
              cacheName: r,
              matchOptions: s,
              cachedResponse: t,
              request: n,
              event: this.event,
            })) || void 0;
        return t;
      }
      async cachePut(e, t) {
        let a = ee(e);
        await h(0);
        let r = await this.getCacheKey(a, "write");
        if (!t) throw new o("cache-put-with-no-response", { url: c(r.url) });
        let s = await this._ensureResponseSafeToCache(t);
        if (!s) return !1;
        let { cacheName: n, matchOptions: i } = this._strategy,
          l = await self.caches.open(n),
          u = this.hasCallback("cacheDidUpdate"),
          d = u ? await f(l, r.clone(), ["__WB_REVISION__"], i) : null;
        try {
          await l.put(r, u ? s.clone() : s);
        } catch (e) {
          if (e instanceof Error) throw ("QuotaExceededError" === e.name && (await p()), e);
        }
        for (let e of this.iterateCallbacks("cacheDidUpdate"))
          await e({
            cacheName: n,
            oldResponse: d,
            newResponse: s.clone(),
            request: r,
            event: this.event,
          });
        return !0;
      }
      async getCacheKey(e, t) {
        let a = `${e.url} | ${t}`;
        if (!this._cacheKeys[a]) {
          let r = e;
          for (let e of this.iterateCallbacks("cacheKeyWillBeUsed"))
            r = ee(await e({ mode: t, request: r, event: this.event, params: this.params }));
          this._cacheKeys[a] = r;
        }
        return this._cacheKeys[a];
      }
      hasCallback(e) {
        for (let t of this._strategy.plugins) if (e in t) return !0;
        return !1;
      }
      async runCallbacks(e, t) {
        for (let a of this.iterateCallbacks(e)) await a(t);
      }
      *iterateCallbacks(e) {
        for (let t of this._strategy.plugins)
          if ("function" == typeof t[e]) {
            let a = this._pluginStateMap.get(t),
              r = (r) => {
                let s = { ...r, state: a };
                return t[e](s);
              };
            yield r;
          }
      }
      waitUntil(e) {
        return (this._extendLifetimePromises.push(e), e);
      }
      async doneWaiting() {
        let e;
        for (; (e = this._extendLifetimePromises.shift()); ) await e;
      }
      destroy() {
        this._handlerDeferred.resolve(null);
      }
      async getPreloadResponse() {
        if (
          this.event instanceof FetchEvent &&
          "navigate" === this.event.request.mode &&
          "preloadResponse" in this.event
        )
          try {
            let e = await this.event.preloadResponse;
            if (e) return e;
          } catch (e) {}
      }
      async _ensureResponseSafeToCache(e) {
        let t = e,
          a = !1;
        for (let e of this.iterateCallbacks("cacheWillUpdate"))
          if (
            ((t = (await e({ request: this.request, response: t, event: this.event })) || void 0),
            (a = !0),
            !t)
          )
            break;
        return (!a && t && 200 !== t.status && (t = void 0), t);
      }
    }
    class ea {
      cacheName;
      plugins;
      fetchOptions;
      matchOptions;
      constructor(e = {}) {
        ((this.cacheName = i.getRuntimeName(e.cacheName)),
          (this.plugins = e.plugins || []),
          (this.fetchOptions = e.fetchOptions),
          (this.matchOptions = e.matchOptions));
      }
      handle(e) {
        let [t] = this.handleAll(e);
        return t;
      }
      handleAll(e) {
        e instanceof FetchEvent && (e = { event: e, request: e.request });
        let t = e.event,
          a = "string" == typeof e.request ? new Request(e.request) : e.request,
          r = new et(
            this,
            e.url
              ? { event: t, request: a, url: e.url, params: e.params }
              : { event: t, request: a }
          ),
          s = this._getResponse(r, a, t),
          n = this._awaitComplete(s, r, a, t);
        return [s, n];
      }
      async _getResponse(e, t, a) {
        let r;
        await e.runCallbacks("handlerWillStart", { event: a, request: t });
        try {
          if (((r = await this._handle(t, e)), void 0 === r || "error" === r.type))
            throw new o("no-response", { url: t.url });
        } catch (s) {
          if (s instanceof Error) {
            for (let n of e.iterateCallbacks("handlerDidError"))
              if (void 0 !== (r = await n({ error: s, event: a, request: t }))) break;
          }
          if (!r) throw s;
        }
        for (let s of e.iterateCallbacks("handlerWillRespond"))
          r = await s({ event: a, request: t, response: r });
        return r;
      }
      async _awaitComplete(e, t, a, r) {
        let s, n;
        try {
          s = await e;
        } catch {}
        try {
          (await t.runCallbacks("handlerDidRespond", { event: r, request: a, response: s }),
            await t.doneWaiting());
        } catch (e) {
          e instanceof Error && (n = e);
        }
        if (
          (await t.runCallbacks("handlerDidComplete", {
            event: r,
            request: a,
            response: s,
            error: n,
          }),
          t.destroy(),
          n)
        )
          throw n;
      }
    }
    class er extends ea {
      _networkTimeoutSeconds;
      constructor(e = {}) {
        (super(e),
          this.plugins.some((e) => "cacheWillUpdate" in e) || this.plugins.unshift(Z),
          (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0));
      }
      async _handle(e, t) {
        let a;
        let r = [],
          s = [];
        if (this._networkTimeoutSeconds) {
          let { id: n, promise: i } = this._getTimeoutPromise({ request: e, logs: r, handler: t });
          ((a = n), s.push(i));
        }
        let n = this._getNetworkPromise({ timeoutId: a, request: e, logs: r, handler: t });
        s.push(n);
        let i = await t.waitUntil(
          (async () => (await t.waitUntil(Promise.race(s))) || (await n))()
        );
        if (!i) throw new o("no-response", { url: e.url });
        return i;
      }
      _getTimeoutPromise({ request: e, logs: t, handler: a }) {
        let r;
        return {
          promise: new Promise((t) => {
            r = setTimeout(async () => {
              t(await a.cacheMatch(e));
            }, 1e3 * this._networkTimeoutSeconds);
          }),
          id: r,
        };
      }
      async _getNetworkPromise({ timeoutId: e, request: t, logs: a, handler: r }) {
        let s, n;
        try {
          n = await r.fetchAndCachePut(t);
        } catch (e) {
          e instanceof Error && (s = e);
        }
        return (e && clearTimeout(e), (s || !n) && (n = await r.cacheMatch(t)), n);
      }
    }
    class es extends ea {
      _networkTimeoutSeconds;
      constructor(e = {}) {
        (super(e), (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0));
      }
      async _handle(e, t) {
        let a, r;
        try {
          let a = [t.fetch(e)];
          if (this._networkTimeoutSeconds) {
            let e = h(1e3 * this._networkTimeoutSeconds);
            a.push(e);
          }
          if (!(r = await Promise.race(a)))
            throw Error(
              `Timed out the network response after ${this._networkTimeoutSeconds} seconds.`
            );
        } catch (e) {
          e instanceof Error && (a = e);
        }
        if (!r) throw new o("no-response", { url: e.url, error: a });
        return r;
      }
    }
    let en = (e) => (e && "object" == typeof e ? e : { handle: e });
    class ei {
      handler;
      match;
      method;
      catchHandler;
      constructor(e, t, a = "GET") {
        ((this.handler = en(t)), (this.match = e), (this.method = a));
      }
      setCatchHandler(e) {
        this.catchHandler = en(e);
      }
    }
    class el extends ea {
      _fallbackToNetwork;
      static defaultPrecacheCacheabilityPlugin = {
        cacheWillUpdate: async ({ response: e }) => (!e || e.status >= 400 ? null : e),
      };
      static copyRedirectedCacheableResponsesPlugin = {
        cacheWillUpdate: async ({ response: e }) => (e.redirected ? await F(e) : e),
      };
      constructor(e = {}) {
        ((e.cacheName = i.getPrecacheName(e.cacheName)),
          super(e),
          (this._fallbackToNetwork = !1 !== e.fallbackToNetwork),
          this.plugins.push(el.copyRedirectedCacheableResponsesPlugin));
      }
      async _handle(e, t) {
        let a = await t.getPreloadResponse();
        return a
          ? a
          : (await t.cacheMatch(e)) ||
              (t.event && "install" === t.event.type
                ? await this._handleInstall(e, t)
                : await this._handleFetch(e, t));
      }
      async _handleFetch(e, t) {
        let a;
        let r = t.params || {};
        if (this._fallbackToNetwork) {
          let s = r.integrity,
            n = e.integrity,
            i = !n || n === s;
          ((a = await t.fetch(
            new Request(e, { integrity: "no-cors" !== e.mode ? n || s : void 0 })
          )),
            s &&
              i &&
              "no-cors" !== e.mode &&
              (this._useDefaultCacheabilityPluginIfNeeded(), await t.cachePut(e, a.clone())));
        } else throw new o("missing-precache-entry", { cacheName: this.cacheName, url: e.url });
        return a;
      }
      async _handleInstall(e, t) {
        this._useDefaultCacheabilityPluginIfNeeded();
        let a = await t.fetch(e);
        if (!(await t.cachePut(e, a.clone())))
          throw new o("bad-precaching-response", { url: e.url, status: a.status });
        return a;
      }
      _useDefaultCacheabilityPluginIfNeeded() {
        let e = null,
          t = 0;
        for (let [a, r] of this.plugins.entries())
          r !== el.copyRedirectedCacheableResponsesPlugin &&
            (r === el.defaultPrecacheCacheabilityPlugin && (e = a), r.cacheWillUpdate && t++);
        0 === t
          ? this.plugins.push(el.defaultPrecacheCacheabilityPlugin)
          : t > 1 && null !== e && this.plugins.splice(e, 1);
      }
    }
    class eo extends ei {
      _allowlist;
      _denylist;
      constructor(e, { allowlist: t = [/./], denylist: a = [] } = {}) {
        (super((e) => this._match(e), e), (this._allowlist = t), (this._denylist = a));
      }
      _match({ url: e, request: t }) {
        if (t && "navigate" !== t.mode) return !1;
        let a = e.pathname + e.search;
        for (let e of this._denylist) if (e.test(a)) return !1;
        return !!this._allowlist.some((e) => e.test(a));
      }
    }
    let ec = () => !!self.registration?.navigationPreload,
      eh = (e) => {
        ec() &&
          self.addEventListener("activate", (t) => {
            t.waitUntil(
              self.registration.navigationPreload.enable().then(() => {
                e && self.registration.navigationPreload.setHeaderValue(e);
              })
            );
          });
      },
      eu = (e, t = []) => {
        for (let a of [...e.searchParams.keys()])
          t.some((e) => e.test(a)) && e.searchParams.delete(a);
        return e;
      };
    class ed extends ei {
      constructor(e, t, a) {
        super(
          ({ url: t }) => {
            let a = e.exec(t.href);
            if (a && (t.origin === location.origin || 0 === a.index)) return a.slice(1);
          },
          t,
          a
        );
      }
    }
    let ef = (e) => {
        i.updateDetails(e);
      },
      ey = (e) => {
        if (!e) throw new o("add-to-cache-list-unexpected-type", { entry: e });
        if ("string" == typeof e) {
          let t = new URL(e, location.href);
          return { cacheKey: t.href, url: t.href };
        }
        let { revision: t, url: a } = e;
        if (!a) throw new o("add-to-cache-list-unexpected-type", { entry: e });
        if (!t) {
          let e = new URL(a, location.href);
          return { cacheKey: e.href, url: e.href };
        }
        let r = new URL(a, location.href),
          s = new URL(a, location.href);
        return (r.searchParams.set("__WB_REVISION__", t), { cacheKey: r.href, url: s.href });
      };
    class ep {
      updatedURLs = [];
      notUpdatedURLs = [];
      handlerWillStart = async ({ request: e, state: t }) => {
        t && (t.originalRequest = e);
      };
      cachedResponseWillBeUsed = async ({ event: e, state: t, cachedResponse: a }) => {
        if ("install" === e.type && t?.originalRequest && t.originalRequest instanceof Request) {
          let e = t.originalRequest.url;
          a ? this.notUpdatedURLs.push(e) : this.updatedURLs.push(e);
        }
        return a;
      };
    }
    let eg = (e, t, a) => {
        if ("string" == typeof e) {
          let r = new URL(e, location.href);
          return new ei(({ url: e }) => e.href === r.href, t, a);
        }
        if (e instanceof RegExp) return new ed(e, t, a);
        if ("function" == typeof e) return new ei(e, t, a);
        if (e instanceof ei) return e;
        throw new o("unsupported-route-type", {
          moduleName: "serwist",
          funcName: "parseRoute",
          paramName: "capture",
        });
      },
      ew = async (e, t, a) => {
        let r = t.map((e, t) => ({ index: t, item: e })),
          s = async (e) => {
            let t = [];
            for (;;) {
              let s = r.pop();
              if (!s) return e(t);
              let n = await a(s.item);
              t.push({ result: n, index: s.index });
            }
          },
          n = Array.from({ length: e }, () => new Promise(s));
        return (await Promise.all(n))
          .flat()
          .sort((e, t) => (e.index < t.index ? -1 : 1))
          .map((e) => e.result);
      };
    "undefined" != typeof navigator && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    let em = "www.google-analytics.com",
      e_ = "www.googletagmanager.com",
      eb = /^\/(\w+\/)?collect/,
      eR =
        (e) =>
        async ({ queue: t }) => {
          let a;
          for (; (a = await t.shiftRequest()); ) {
            let { request: r, timestamp: s } = a,
              n = new URL(r.url);
            try {
              let t =
                  "POST" === r.method
                    ? new URLSearchParams(await r.clone().text())
                    : n.searchParams,
                a = s - (Number(t.get("qt")) || 0),
                i = Date.now() - a;
              if ((t.set("qt", String(i)), e.parameterOverrides))
                for (let a of Object.keys(e.parameterOverrides)) {
                  let r = e.parameterOverrides[a];
                  t.set(a, r);
                }
              ("function" == typeof e.hitFilter && e.hitFilter.call(null, t),
                await fetch(
                  new Request(n.origin + n.pathname, {
                    body: t.toString(),
                    method: "POST",
                    mode: "cors",
                    credentials: "omit",
                    headers: { "Content-Type": "text/plain" },
                  })
                ));
            } catch (e) {
              throw (await t.unshiftRequest(a), e);
            }
          }
        },
      eq = (e) => {
        let t = ({ url: e }) => e.hostname === em && eb.test(e.pathname),
          a = new es({ plugins: [e] });
        return [new ei(t, a, "GET"), new ei(t, a, "POST")];
      },
      ev = (e) =>
        new ei(
          ({ url: e }) => e.hostname === em && "/analytics.js" === e.pathname,
          new er({ cacheName: e }),
          "GET"
        ),
      eE = (e) =>
        new ei(
          ({ url: e }) => e.hostname === e_ && "/gtag/js" === e.pathname,
          new er({ cacheName: e }),
          "GET"
        ),
      eS = (e) =>
        new ei(
          ({ url: e }) => e.hostname === e_ && "/gtm.js" === e.pathname,
          new er({ cacheName: e }),
          "GET"
        ),
      eD = ({ serwist: e, cacheName: t, ...a }) => {
        let r = i.getGoogleAnalyticsName(t),
          s = new Y("serwist-google-analytics", { maxRetentionTime: 2880, onSync: eR(a) });
        for (let t of [eS(r), ev(r), eE(r), ...eq(s)]) e.registerRoute(t);
      };
    class eP {
      _fallbackUrls;
      _serwist;
      constructor({ fallbackUrls: e, serwist: t }) {
        ((this._fallbackUrls = e), (this._serwist = t));
      }
      async handlerDidError(e) {
        for (let t of this._fallbackUrls)
          if ("string" == typeof t) {
            let e = await this._serwist.matchPrecache(t);
            if (void 0 !== e) return e;
          } else if (t.matcher(e)) {
            let e = await this._serwist.matchPrecache(t.url);
            if (void 0 !== e) return e;
          }
      }
    }
    class ek extends ei {
      constructor(e, t) {
        super(({ request: a }) => {
          let r = e.getUrlsToPrecacheKeys();
          for (let s of (function* (
            e,
            {
              directoryIndex: t = "index.html",
              ignoreURLParametersMatching: a = [/^utm_/, /^fbclid$/],
              cleanURLs: r = !0,
              urlManipulation: s,
            } = {}
          ) {
            let n = new URL(e, location.href);
            ((n.hash = ""), yield n.href);
            let i = eu(n, a);
            if ((yield i.href, t && i.pathname.endsWith("/"))) {
              let e = new URL(i.href);
              ((e.pathname += t), yield e.href);
            }
            if (r) {
              let e = new URL(i.href);
              ((e.pathname += ".html"), yield e.href);
            }
            if (s) for (let e of s({ url: n })) yield e.href;
          })(a.url, t)) {
            let t = r.get(s);
            if (t) {
              let a = e.getIntegrityForPrecacheKey(t);
              return { cacheKey: t, integrity: a };
            }
          }
        }, e.precacheStrategy);
      }
    }
    class eC {
      _precacheController;
      constructor({ precacheController: e }) {
        this._precacheController = e;
      }
      cacheKeyWillBeUsed = async ({ request: e, params: t }) => {
        let a = t?.cacheKey || this._precacheController.getPrecacheKeyForUrl(e.url);
        return a ? new Request(a, { headers: e.headers }) : e;
      };
    }
    let eT = (e, t = {}) => {
      let {
        cacheName: a,
        plugins: r = [],
        fetchOptions: s,
        matchOptions: n,
        fallbackToNetwork: l,
        directoryIndex: o,
        ignoreURLParametersMatching: c,
        cleanURLs: h,
        urlManipulation: u,
        cleanupOutdatedCaches: d,
        concurrency: f = 10,
        navigateFallback: y,
        navigateFallbackAllowlist: p,
        navigateFallbackDenylist: g,
      } = t ?? {};
      return {
        precacheStrategyOptions: {
          cacheName: i.getPrecacheName(a),
          plugins: [...r, new eC({ precacheController: e })],
          fetchOptions: s,
          matchOptions: n,
          fallbackToNetwork: l,
        },
        precacheRouteOptions: {
          directoryIndex: o,
          ignoreURLParametersMatching: c,
          cleanURLs: h,
          urlManipulation: u,
        },
        precacheMiscOptions: {
          cleanupOutdatedCaches: d,
          concurrency: f,
          navigateFallback: y,
          navigateFallbackAllowlist: p,
          navigateFallbackDenylist: g,
        },
      };
    };
    class eI {
      _urlsToCacheKeys = new Map();
      _urlsToCacheModes = new Map();
      _cacheKeysToIntegrities = new Map();
      _concurrentPrecaching;
      _precacheStrategy;
      _routes;
      _defaultHandlerMap;
      _catchHandler;
      _requestRules;
      constructor({
        precacheEntries: e,
        precacheOptions: t,
        skipWaiting: a = !1,
        importScripts: r,
        navigationPreload: s = !1,
        cacheId: n,
        clientsClaim: i = !1,
        runtimeCaching: l,
        offlineAnalyticsConfig: o,
        disableDevLogs: c = !1,
        fallbacks: h,
        requestRules: u,
      } = {}) {
        let {
          precacheStrategyOptions: d,
          precacheRouteOptions: f,
          precacheMiscOptions: y,
        } = eT(this, t);
        if (
          ((this._concurrentPrecaching = y.concurrency),
          (this._precacheStrategy = new el(d)),
          (this._routes = new Map()),
          (this._defaultHandlerMap = new Map()),
          (this._requestRules = u),
          (this.handleInstall = this.handleInstall.bind(this)),
          (this.handleActivate = this.handleActivate.bind(this)),
          (this.handleFetch = this.handleFetch.bind(this)),
          (this.handleCache = this.handleCache.bind(this)),
          r && r.length > 0 && self.importScripts(...r),
          s && eh(),
          void 0 !== n && ef({ prefix: n }),
          a
            ? self.skipWaiting()
            : self.addEventListener("message", (e) => {
                e.data && "SKIP_WAITING" === e.data.type && self.skipWaiting();
              }),
          i && _(),
          e && e.length > 0 && this.addToPrecacheList(e),
          y.cleanupOutdatedCaches && m(d.cacheName),
          this.registerRoute(new ek(this, f)),
          y.navigateFallback &&
            this.registerRoute(
              new eo(this.createHandlerBoundToUrl(y.navigateFallback), {
                allowlist: y.navigateFallbackAllowlist,
                denylist: y.navigateFallbackDenylist,
              })
            ),
          void 0 !== o &&
            ("boolean" == typeof o ? o && eD({ serwist: this }) : eD({ ...o, serwist: this })),
          void 0 !== l)
        ) {
          if (void 0 !== h) {
            let e = new eP({ fallbackUrls: h.entries, serwist: this });
            l.forEach((t) => {
              t.handler instanceof ea &&
                !t.handler.plugins.some((e) => "handlerDidError" in e) &&
                t.handler.plugins.push(e);
            });
          }
          for (let e of l) this.registerCapture(e.matcher, e.handler, e.method);
        }
        c && M();
      }
      get precacheStrategy() {
        return this._precacheStrategy;
      }
      get routes() {
        return this._routes;
      }
      addEventListeners() {
        (self.addEventListener("install", this.handleInstall),
          self.addEventListener("activate", this.handleActivate),
          self.addEventListener("fetch", this.handleFetch),
          self.addEventListener("message", this.handleCache));
      }
      addToPrecacheList(e) {
        let t = [];
        for (let a of e) {
          "string" == typeof a
            ? t.push(a)
            : a && !a.integrity && void 0 === a.revision && t.push(a.url);
          let { cacheKey: e, url: r } = ey(a),
            s = "string" != typeof a && a.revision ? "reload" : "default";
          if (this._urlsToCacheKeys.has(r) && this._urlsToCacheKeys.get(r) !== e)
            throw new o("add-to-cache-list-conflicting-entries", {
              firstEntry: this._urlsToCacheKeys.get(r),
              secondEntry: e,
            });
          if ("string" != typeof a && a.integrity) {
            if (
              this._cacheKeysToIntegrities.has(e) &&
              this._cacheKeysToIntegrities.get(e) !== a.integrity
            )
              throw new o("add-to-cache-list-conflicting-integrities", { url: r });
            this._cacheKeysToIntegrities.set(e, a.integrity);
          }
          (this._urlsToCacheKeys.set(r, e), this._urlsToCacheModes.set(r, s));
        }
        t.length > 0 &&
          console.warn(`Serwist is precaching URLs without revision info: ${t.join(", ")}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`);
      }
      handleInstall(e) {
        return (
          this.registerRequestRules(e),
          b(e, async () => {
            let t = new ep();
            (this.precacheStrategy.plugins.push(t),
              await ew(
                this._concurrentPrecaching,
                Array.from(this._urlsToCacheKeys.entries()),
                async ([t, a]) => {
                  let r = this._cacheKeysToIntegrities.get(a),
                    s = this._urlsToCacheModes.get(t),
                    n = new Request(t, { integrity: r, cache: s, credentials: "same-origin" });
                  await Promise.all(
                    this.precacheStrategy.handleAll({
                      event: e,
                      request: n,
                      url: new URL(n.url),
                      params: { cacheKey: a },
                    })
                  );
                }
              ));
            let { updatedURLs: a, notUpdatedURLs: r } = t;
            return { updatedURLs: a, notUpdatedURLs: r };
          })
        );
      }
      async registerRequestRules(e) {
        if (this._requestRules && e?.addRoutes)
          try {
            (await e.addRoutes(this._requestRules), (this._requestRules = void 0));
          } catch (e) {
            throw e;
          }
      }
      handleActivate(e) {
        return b(e, async () => {
          let e = await self.caches.open(this.precacheStrategy.cacheName),
            t = await e.keys(),
            a = new Set(this._urlsToCacheKeys.values()),
            r = [];
          for (let s of t) a.has(s.url) || (await e.delete(s), r.push(s.url));
          return { deletedCacheRequests: r };
        });
      }
      handleFetch(e) {
        let { request: t } = e,
          a = this.handleRequest({ request: t, event: e });
        a && e.respondWith(a);
      }
      handleCache(e) {
        if (e.data && "CACHE_URLS" === e.data.type) {
          let { payload: t } = e.data,
            a = Promise.all(
              t.urlsToCache.map((t) => {
                let a;
                return (
                  (a = "string" == typeof t ? new Request(t) : new Request(...t)),
                  this.handleRequest({ request: a, event: e })
                );
              })
            );
          (e.waitUntil(a), e.ports?.[0] && a.then(() => e.ports[0].postMessage(!0)));
        }
      }
      setDefaultHandler(e, t = "GET") {
        this._defaultHandlerMap.set(t, en(e));
      }
      setCatchHandler(e) {
        this._catchHandler = en(e);
      }
      registerCapture(e, t, a) {
        let r = eg(e, t, a);
        return (this.registerRoute(r), r);
      }
      registerRoute(e) {
        (this._routes.has(e.method) || this._routes.set(e.method, []),
          this._routes.get(e.method).push(e));
      }
      unregisterRoute(e) {
        if (!this._routes.has(e.method))
          throw new o("unregister-route-but-not-found-with-method", { method: e.method });
        let t = this._routes.get(e.method).indexOf(e);
        if (t > -1) this._routes.get(e.method).splice(t, 1);
        else throw new o("unregister-route-route-not-registered");
      }
      getUrlsToPrecacheKeys() {
        return this._urlsToCacheKeys;
      }
      getPrecachedUrls() {
        return [...this._urlsToCacheKeys.keys()];
      }
      getPrecacheKeyForUrl(e) {
        let t = new URL(e, location.href);
        return this._urlsToCacheKeys.get(t.href);
      }
      getIntegrityForPrecacheKey(e) {
        return this._cacheKeysToIntegrities.get(e);
      }
      async matchPrecache(e) {
        let t = e instanceof Request ? e.url : e,
          a = this.getPrecacheKeyForUrl(t);
        if (a) return (await self.caches.open(this.precacheStrategy.cacheName)).match(a);
      }
      createHandlerBoundToUrl(e) {
        let t = this.getPrecacheKeyForUrl(e);
        if (!t) throw new o("non-precached-url", { url: e });
        return (a) => (
          (a.request = new Request(e)),
          (a.params = { cacheKey: t, ...a.params }),
          this.precacheStrategy.handle(a)
        );
      }
      handleRequest({ request: e, event: t }) {
        let a;
        let r = new URL(e.url, location.href);
        if (!r.protocol.startsWith("http")) return;
        let s = r.origin === location.origin,
          { params: n, route: i } = this.findMatchingRoute({
            event: t,
            request: e,
            sameOrigin: s,
            url: r,
          }),
          l = i?.handler,
          o = e.method;
        if ((!l && this._defaultHandlerMap.has(o) && (l = this._defaultHandlerMap.get(o)), !l))
          return;
        try {
          a = l.handle({ url: r, request: e, event: t, params: n });
        } catch (e) {
          a = Promise.reject(e);
        }
        let c = i?.catchHandler;
        return (
          a instanceof Promise &&
            (this._catchHandler || c) &&
            (a = a.catch(async (a) => {
              if (c)
                try {
                  return await c.handle({ url: r, request: e, event: t, params: n });
                } catch (e) {
                  e instanceof Error && (a = e);
                }
              if (this._catchHandler)
                return this._catchHandler.handle({ url: r, request: e, event: t });
              throw a;
            })),
          a
        );
      }
      findMatchingRoute({ url: e, sameOrigin: t, request: a, event: r }) {
        for (let s of this._routes.get(a.method) || []) {
          let n;
          let i = s.match({ url: e, sameOrigin: t, request: a, event: r });
          if (i)
            return (
              Array.isArray((n = i)) && 0 === n.length
                ? (n = void 0)
                : i.constructor === Object && 0 === Object.keys(i).length
                  ? (n = void 0)
                  : "boolean" == typeof i && (n = void 0),
              { route: s, params: n }
            );
        }
        return {};
      }
    }
    let eL = "shared-files",
      eN = new eI({
        precacheEntries: [
          {
            revision: "0503b90c8a8760172430e0f8fe41141a",
            url: "/_next/static/7rp4GJaihXxMNK0E5hT4J/_buildManifest.js",
          },
          {
            revision: "b6652df95db52feb4daf4eca35380933",
            url: "/_next/static/7rp4GJaihXxMNK0E5hT4J/_ssgManifest.js",
          },
          { revision: null, url: "/_next/static/chunks/2688.81049e4408a4e387.js" },
          { revision: null, url: "/_next/static/chunks/3085-d3ed6529a8050c34.js" },
          { revision: null, url: "/_next/static/chunks/3451-9e7d6a5e9b1dc370.js" },
          { revision: null, url: "/_next/static/chunks/4007-249fba7b763adaec.js" },
          { revision: null, url: "/_next/static/chunks/4242-717952de00eb45b5.js" },
          { revision: null, url: "/_next/static/chunks/4863-4134f3d50a495288.js" },
          { revision: null, url: "/_next/static/chunks/494-23c00795a73584f0.js" },
          { revision: null, url: "/_next/static/chunks/4ff7191e-5ac60dcb66ac8357.js" },
          { revision: null, url: "/_next/static/chunks/5061-dd45ddebc4674c0c.js" },
          { revision: null, url: "/_next/static/chunks/5770-93f0dc0fc2472d83.js" },
          { revision: null, url: "/_next/static/chunks/59c6eb5a-1e6a22775f337940.js" },
          { revision: null, url: "/_next/static/chunks/631-aba043b18364f2c4.js" },
          { revision: null, url: "/_next/static/chunks/6547-3490d00cd8e873af.js" },
          { revision: null, url: "/_next/static/chunks/7564-25bfcc97a33d89b2.js" },
          { revision: null, url: "/_next/static/chunks/8364.f77375bb57622369.js" },
          { revision: null, url: "/_next/static/chunks/87c73c54-387b573dbe7f28fa.js" },
          { revision: null, url: "/_next/static/chunks/9325.ceb45913ca22f1b2.js" },
          { revision: null, url: "/_next/static/chunks/9504-c9651944729b42e0.js" },
          { revision: null, url: "/_next/static/chunks/app/_not-found/page-47362859b03b8ba5.js" },
          { revision: null, url: "/_next/static/chunks/app/about/page-e899561aef09cf12.js" },
          {
            revision: null,
            url: "/_next/static/chunks/app/admin/incidents/page-1f1e6557f1f50d7e.js",
          },
          { revision: null, url: "/_next/static/chunks/app/admin/page-5ce94711ec3b1028.js" },
          {
            revision: null,
            url: "/_next/static/chunks/app/api/account/delete/route-525afd402d2c892e.js",
          },
          { revision: null, url: "/_next/static/chunks/app/api/health/route-732e3484ad8966c9.js" },
          {
            revision: null,
            url: "/_next/static/chunks/app/api/incidents/route-3b5458c7e7bdaa12.js",
          },
          {
            revision: null,
            url: "/_next/static/chunks/app/api/share-target/route-bc32b1a3b1fe41ca.js",
          },
          {
            revision: null,
            url: "/_next/static/chunks/app/api/turn-credentials/route-2b42459743817d05.js",
          },
          { revision: null, url: "/_next/static/chunks/app/auth/page-abc9ce0cfd5cf8ab.js" },
          { revision: null, url: "/_next/static/chunks/app/dashboard/error-f959bb65fffded37.js" },
          { revision: null, url: "/_next/static/chunks/app/dashboard/page-4f0d37b2f799ee72.js" },
          { revision: null, url: "/_next/static/chunks/app/error-7a3ff8a5a9e06a24.js" },
          { revision: null, url: "/_next/static/chunks/app/global-error-83297b92a6ae3892.js" },
          { revision: null, url: "/_next/static/chunks/app/history/page-27d6f31d76dd4ed5.js" },
          { revision: null, url: "/_next/static/chunks/app/layout-7fb8f2228aefffde.js" },
          { revision: null, url: "/_next/static/chunks/app/not-found-97df546d744dcb4f.js" },
          { revision: null, url: "/_next/static/chunks/app/offline/page-bcad804f14b2f460.js" },
          { revision: null, url: "/_next/static/chunks/app/page-5af98b57b340d2a5.js" },
          { revision: null, url: "/_next/static/chunks/app/privacy/page-0fe07bb583b619d4.js" },
          { revision: null, url: "/_next/static/chunks/app/receive/error-57616593b91cb388.js" },
          { revision: null, url: "/_next/static/chunks/app/receive/page-7a84753d581d84cd.js" },
          { revision: null, url: "/_next/static/chunks/app/send/error-0f12ec48f5930161.js" },
          { revision: null, url: "/_next/static/chunks/app/send/page-64c88ee3120bee05.js" },
          { revision: null, url: "/_next/static/chunks/app/settings/page-09f465f5c4c40c89.js" },
          { revision: null, url: "/_next/static/chunks/app/status/page-d08fe00ffb75e4b2.js" },
          { revision: null, url: "/_next/static/chunks/framework-1139d1e5272ebfa2.js" },
          { revision: null, url: "/_next/static/chunks/main-5058bd1c0aaa591b.js" },
          { revision: null, url: "/_next/static/chunks/main-app-ac5d27b4a2d78d7f.js" },
          { revision: null, url: "/_next/static/chunks/pages/_app-cefe850b20f09f11.js" },
          { revision: null, url: "/_next/static/chunks/pages/_error-6a781c1f65da9020.js" },
          {
            revision: "846118c33b2c0e922d7b3a7676f81f6f",
            url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          },
          { revision: null, url: "/_next/static/chunks/webpack-8bcb2e26a1d1ad76.js" },
          { revision: null, url: "/_next/static/css/d3a66f02aca1d915.css" },
          {
            revision: "25ea4a783c12103f175f5b157b7d96aa",
            url: "/_next/static/media/36966cca54120369-s.p.woff2",
          },
          {
            revision: "dea099b7d5a5ea45bd4367f8aeff62ab",
            url: "/_next/static/media/b7387a63dd068245-s.woff2",
          },
          {
            revision: "207f8e9f3761dbd724063a177d906a99",
            url: "/_next/static/media/e1aab0933260df4d-s.woff2",
          },
          { revision: "b363bbf96b70fa5ca02a586d78654b14", url: "/android-chrome-192x192.png" },
          { revision: "8cf4b099fb5d2a75669f98041a7a45ff", url: "/android-chrome-512x512.png" },
          { revision: "c634562a26ee3fe92d1e5ab2a09ef2d0", url: "/apple-touch-icon.png" },
          { revision: "3a5ac2dc1aec75ff3d02c357a5d2eee9", url: "/favicon-16x16.png" },
          { revision: "6e5ff6f3c258d91db1ade0042c945c67", url: "/favicon-32x32.png" },
          { revision: "49f039c9b5e74491e04546508844213c", url: "/favicon.ico" },
          {
            revision: "b363bbf96b70fa5ca02a586d78654b14",
            url: "/favicon/android-chrome-192x192.png",
          },
          {
            revision: "8cf4b099fb5d2a75669f98041a7a45ff",
            url: "/favicon/android-chrome-512x512.png",
          },
          { revision: "c634562a26ee3fe92d1e5ab2a09ef2d0", url: "/favicon/apple-touch-icon.png" },
          { revision: "3a5ac2dc1aec75ff3d02c357a5d2eee9", url: "/favicon/favicon-16x16.png" },
          { revision: "6e5ff6f3c258d91db1ade0042c945c67", url: "/favicon/favicon-32x32.png" },
          { revision: "49f039c9b5e74491e04546508844213c", url: "/favicon/favicon.ico" },
          { revision: "5061fbd4a6f6729f4995482be0ec4798", url: "/favicon/site.webmanifest" },
          { revision: "853966f70b7fd9c749c1b1f17b5bbcf1", url: "/workbox-b52a85cb.js" },
          { revision: "108912d1fd9c1544a7de8b87a5211c03", url: "/workbox-b52a85cb.js.map" },
          { revision: "cfd8bd88f3267e92ed7def9815417308", url: "/worker-09575759e4cc1351.js" },
          { revision: "8dd33e71ad0c6a6f4a48435960b6d0a2", url: "/worker-09575759e4cc1351.js.map" },
        ],
        skipWaiting: !0,
        clientsClaim: !0,
        navigationPreload: !0,
      });
    (self.addEventListener("fetch", (e) => {
      let t = new URL(e.request.url).pathname.replace(/\/$/, "");
      "POST" === e.request.method &&
        ("/send" === t || "/api/share-target" === t) &&
        e.respondWith(
          (async () => {
            try {
              let t = await e.request.formData(),
                a = t.getAll("media"),
                r = t.get("title"),
                s = t.get("text"),
                n = t.get("url"),
                i = await k("hyperlink-pwa-share", 1, {
                  upgrade(e) {
                    e.createObjectStore(eL);
                  },
                }),
                l = {
                  files: a.map((e) => ({ name: e.name, type: e.type, blob: e })),
                  title: r,
                  text: s,
                  url: n,
                  timestamp: Date.now(),
                };
              return (await i.put(eL, l, "latest"), Response.redirect("/send?shared=true", 303));
            } catch (e) {
              return (
                console.error("Share Target failed in SW:", e),
                Response.redirect(
                  "/send?shared=error&msg=".concat(encodeURIComponent(e.message)),
                  303
                )
              );
            }
          })()
        );
    }),
      self.addEventListener("message", (e) => {
        e.data && "SKIP_WAITING" === e.data.type && self.skipWaiting();
      }),
      eN.addEventListeners());
  })());
