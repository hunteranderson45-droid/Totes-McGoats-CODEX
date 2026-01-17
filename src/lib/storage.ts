const STORAGE_PREFIX = 'tote-organizer:';
const DEFAULT_NAMESPACE = 'default';
const SCHEMA_VERSION = 1;
const MAX_BACKUPS = 3;
const BACKUP_KEY = 'backup:';
const SEARCH_HISTORY_KEY = 'search-history';
const MAX_SEARCH_HISTORY = 5;

let namespace = DEFAULT_NAMESPACE;

const sanitizeNamespace = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

const buildPrefix = (keyPrefix: string) => `${STORAGE_PREFIX}${namespace}:${keyPrefix}`;

export interface VersionedData<T> {
  _version: number;
  _lastModified: string;
  data: T;
}

export interface BackupEntry {
  timestamp: string;
  toteCount: number;
  roomCount: number;
}

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

  // Wrap data with version and timestamp
  wrapWithVersion<T>(data: T): VersionedData<T> {
    return {
      _version: SCHEMA_VERSION,
      _lastModified: new Date().toISOString(),
      data,
    };
  },

  // Check if data needs migration
  needsMigration(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const versioned = data as { _version?: number };
    return versioned._version !== SCHEMA_VERSION;
  },

  // Get current schema version
  getSchemaVersion(): number {
    return SCHEMA_VERSION;
  },

  // Create a backup of all data
  async createBackup(totes: unknown[], rooms: unknown[]): Promise<void> {
    const backupData = {
      totes,
      rooms,
      timestamp: new Date().toISOString(),
    };

    // Get existing backups
    const backupsResult = await this.get(BACKUP_KEY + 'list');
    let backups: BackupEntry[] = [];
    if (backupsResult) {
      try {
        backups = JSON.parse(backupsResult.value);
      } catch {
        backups = [];
      }
    }

    // Add new backup
    const timestamp = new Date().toISOString();
    await this.set(BACKUP_KEY + timestamp, JSON.stringify(backupData));

    backups.push({
      timestamp,
      toteCount: totes.length,
      roomCount: rooms.length,
    });

    // Remove old backups if exceeding max
    while (backups.length > MAX_BACKUPS) {
      const oldest = backups.shift();
      if (oldest) {
        await this.delete(BACKUP_KEY + oldest.timestamp);
      }
    }

    await this.set(BACKUP_KEY + 'list', JSON.stringify(backups));
  },

  // Get list of available backups
  async getBackups(): Promise<BackupEntry[]> {
    const result = await this.get(BACKUP_KEY + 'list');
    if (!result) return [];
    try {
      return JSON.parse(result.value);
    } catch {
      return [];
    }
  },

  // Restore from a specific backup
  async restoreBackup(timestamp: string): Promise<{ totes: unknown[]; rooms: unknown[] } | null> {
    const result = await this.get(BACKUP_KEY + timestamp);
    if (!result) return null;
    try {
      const data = JSON.parse(result.value);
      return { totes: data.totes || [], rooms: data.rooms || [] };
    } catch {
      return null;
    }
  },

  // Check if backup is needed (once per day)
  async shouldAutoBackup(): Promise<boolean> {
    const result = await this.get(BACKUP_KEY + 'lastAuto');
    if (!result) return true;
    try {
      const lastBackup = new Date(result.value);
      const now = new Date();
      const hoursSince = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);
      return hoursSince >= 24;
    } catch {
      return true;
    }
  },

  // Mark auto backup as done
  async markAutoBackupDone(): Promise<void> {
    await this.set(BACKUP_KEY + 'lastAuto', new Date().toISOString());
  },

  // Search history
  async getSearchHistory(): Promise<string[]> {
    const result = await this.get(SEARCH_HISTORY_KEY);
    if (!result) return [];
    try {
      return JSON.parse(result.value);
    } catch {
      return [];
    }
  },

  async addSearchHistory(query: string): Promise<void> {
    if (!query.trim()) return;
    const history = await this.getSearchHistory();
    const filtered = history.filter(h => h.toLowerCase() !== query.toLowerCase());
    filtered.unshift(query.trim());
    const limited = filtered.slice(0, MAX_SEARCH_HISTORY);
    await this.set(SEARCH_HISTORY_KEY, JSON.stringify(limited));
  },

  async clearSearchHistory(): Promise<void> {
    await this.delete(SEARCH_HISTORY_KEY);
  },
};
