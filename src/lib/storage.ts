const STORAGE_PREFIX = 'tote-organizer:';

export const storage = {
  async list(prefix: string): Promise<{ keys: string[] }> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX + prefix)) {
        keys.push(key.slice(STORAGE_PREFIX.length));
      }
    }
    return { keys };
  },

  async get(key: string): Promise<{ value: string } | null> {
    const value = localStorage.getItem(STORAGE_PREFIX + key);
    return value !== null ? { value } : null;
  },

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  },

  async delete(key: string): Promise<void> {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },
};
