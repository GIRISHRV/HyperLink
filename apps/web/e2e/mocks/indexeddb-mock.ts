import { Page } from "@playwright/test";

/**
 * IndexedDB mock utilities for testing storage quota and error conditions
 */
export class IndexedDBMock {
  /**
   * Mock IndexedDB quota exceeded error
   * Forces IndexedDB operations to fail with QuotaExceededError
   *
   * @param page - Playwright page instance
   */
  async mockQuotaExceeded(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const originalOpen = indexedDB.open;
      indexedDB.open = function (name: string, version?: number) {
        const request = originalOpen.call(this, name, version);
        const originalOnSuccess = request.onsuccess;

        request.onsuccess = function (event) {
          if (originalOnSuccess) {
            originalOnSuccess.call(request, event);
          }

          const db = (event.target as IDBOpenDBRequest).result;
          const originalTransaction = db.transaction.bind(db);

          db.transaction = function (
            storeNames: string | string[],
            mode?: IDBTransactionMode,
            options?: IDBTransactionOptions
          ) {
            const tx = originalTransaction(storeNames, mode, options);
            const originalObjectStore = tx.objectStore.bind(tx);

            tx.objectStore = function (name: string) {
              const store = originalObjectStore(name);
              const originalAdd = store.add.bind(store);
              const originalPut = store.put.bind(store);

              // Mock add operation to throw quota exceeded error
              store.add = function (value: any, key?: IDBValidKey) {
                const addRequest = originalAdd(value, key);
                setTimeout(() => {
                  const error = new DOMException("QuotaExceededError", "QuotaExceededError");
                  Object.defineProperty(addRequest, "error", { value: error });
                  if (addRequest.onerror) {
                    addRequest.onerror(new Event("error"));
                  }
                }, 0);
                return addRequest;
              };

              // Mock put operation to throw quota exceeded error
              store.put = function (value: any, key?: IDBValidKey) {
                const putRequest = originalPut(value, key);
                setTimeout(() => {
                  const error = new DOMException("QuotaExceededError", "QuotaExceededError");
                  Object.defineProperty(putRequest, "error", { value: error });
                  if (putRequest.onerror) {
                    putRequest.onerror(new Event("error"));
                  }
                }, 0);
                return putRequest;
              };

              return store;
            };
            return tx;
          };
        };
        return request;
      };
    });
  }
}
