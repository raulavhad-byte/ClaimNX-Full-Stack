/**
 * Compatibility adapter for the legacy portal's non-sensitive UI preferences.
 *
 * ClaimNX APIs are the system of record. Do not use this adapter for
 * credentials, access tokens, passwords, PHI, documents, or claim data.
 */
export const DISABLE_FIRESTORE = true;

const STORAGE_PREFIX = 'claimnx-ui:';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readValue<T>(key: string, fallback: T | null = null): T | null {
  const value = getStorage()?.getItem(`${STORAGE_PREFIX}${key}`);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeValue(key: string, value: unknown): void {
  getStorage()?.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
}

const compatibilityAdapter = {
  async getItem<T>(key: string, fallback: T | null = null): Promise<T | null> {
    return readValue(key, fallback);
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    writeValue(key, value);
  },

  async removeItem(key: string): Promise<void> {
    getStorage()?.removeItem(`${STORAGE_PREFIX}${key}`);
  },

  async clear(): Promise<void> {
    const browserStorage = getStorage();

    if (!browserStorage) {
      return;
    }

    Object.keys(browserStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => browserStorage.removeItem(key));
  },

  async get<T>(key: string, fallback: T | null = null): Promise<T | null> {
    return readValue(key, fallback);
  },

  async set<T>(key: string, value: T): Promise<void> {
    writeValue(key, value);
  },

  async loadData<T>(key: string, fallback: T | null = null): Promise<T | null> {
    return readValue(key, fallback);
  },

  async saveData<T>(key: string, value: T): Promise<void> {
    writeValue(key, value);
  },
};

/**
 * The existing UI was built against a broader Firebase-era service. The proxy
 * keeps it bootable while each screen is progressively moved to ClaimNX APIs.
 */
export const dualStorageService: any = new Proxy(compatibilityAdapter, {
  get(target, property, receiver) {
    if (Reflect.has(target, property)) {
      return Reflect.get(target, property, receiver);
    }

    if (typeof property !== 'string') {
      return undefined;
    }

    return async (...args: unknown[]): Promise<unknown> => {
      const key = String(args[0] ?? property);

      if (/^(get|load|fetch)/i.test(property)) {
        return readValue(key, (args[1] as unknown) ?? null);
      }

      if (/^(set|save|update)/i.test(property)) {
        writeValue(key, args[1]);
        return undefined;
      }

      if (/^(remove|delete)/i.test(property)) {
        getStorage()?.removeItem(`${STORAGE_PREFIX}${key}`);
      }

      return undefined;
    };
  },
});
