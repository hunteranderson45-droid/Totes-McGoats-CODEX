const STORAGE_PREFIX = 'tote-organizer:';
const DEFAULT_NAMESPACE = 'default';

let namespace = DEFAULT_NAMESPACE;

const sanitizeNamespace = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

const buildPrefix = (keyPrefix: string) => `${STORAGE_PREFIX}${namespace}:${keyPrefix}`;

export const storage = {
  setNamespace(value?: string): void {
    const next = value ? sanitizeNamespace(value) : DEFAULT_NAMESPACE;
    namespace = next || DEFAULT_NAMESPACE;
  },

  async list(prefix: string): Promise<{ keys: string[] }> {
    const keys: string[] = [];
    const fullPrefix = buildPrefix(prefix);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(fullPrefix)) {
        keys.push(key.slice(STORAGE_PREFIX.length + namespace.length + 1));
      }
    }
    return { keys };
  },

  async get(key: string): Promise<{ value: string } | null> {
    const value = localStorage.getItem(buildPrefix(key));
    return value !== null ? { value } : null;
  },

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(buildPrefix(key), value);
  },

  async delete(key: string): Promise<void> {
    localStorage.removeItem(buildPrefix(key));
  },
};
