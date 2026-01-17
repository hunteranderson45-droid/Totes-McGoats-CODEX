export interface Room {
  name: string;
  icon: string;
}

export interface Item {
  description: string;
  tags: string[];
}

export interface Tote {
  id: number;
  number: string;
  room: string;
  items: Item[];
  imageUrl?: string;
  date: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }
  return [];
};

const normalizeItem = (value: unknown): Item | null => {
  if (!isObject(value)) return null;
  const description = normalizeNonEmptyString(value.description);
  if (!description) return null;
  const tags = normalizeTags(value.tags);
  return { description, tags };
};

export const normalizeTote = (value: unknown): Tote | null => {
  if (!isObject(value)) return null;
  const id = typeof value.id === 'number' && Number.isFinite(value.id) ? value.id : null;
  const number = normalizeNonEmptyString(value.number);
  const room = normalizeNonEmptyString(value.room);
  const date = normalizeNonEmptyString(value.date);
  if (id === null || !number || !room || !date) return null;

  const itemsRaw = Array.isArray(value.items) ? value.items : [];
  const items = itemsRaw.map(normalizeItem).filter((item): item is Item => item !== null);

  const imageUrl = typeof value.imageUrl === 'string' && value.imageUrl.trim().length > 0
    ? value.imageUrl
    : undefined;

  return { id, number, room, items, imageUrl, date };
};

export const normalizeRooms = (value: unknown, defaultIcon: string): { rooms: Room[]; migrated: boolean } => {
  if (!Array.isArray(value)) return { rooms: [], migrated: false };

  const rooms: Room[] = [];
  let migrated = false;

  for (const entry of value) {
    if (typeof entry === 'string') {
      const name = normalizeNonEmptyString(entry);
      if (name) {
        rooms.push({ name, icon: defaultIcon });
        migrated = true;
      }
      continue;
    }

    if (isObject(entry)) {
      const name = normalizeNonEmptyString(entry.name);
      if (!name) continue;
      const icon = normalizeNonEmptyString(entry.icon) || defaultIcon;
      if (!normalizeNonEmptyString(entry.icon)) migrated = true;
      rooms.push({ name, icon });
    }
  }

  return { rooms, migrated };
};

const normalizeTotes = (value: unknown): { totes: Tote[]; invalidCount: number } => {
  if (!Array.isArray(value)) return { totes: [], invalidCount: 0 };
  const totes: Tote[] = [];
  let invalidCount = 0;
  for (const entry of value) {
    const normalized = normalizeTote(entry);
    if (normalized) totes.push(normalized);
    else invalidCount += 1;
  }
  return { totes, invalidCount };
};

export const normalizeImportPayload = (
  value: unknown,
  defaultIcon: string
): { totes: Tote[]; rooms: Room[]; warnings: string[] } => {
  const warnings: string[] = [];
  if (!isObject(value)) {
    warnings.push('Import file is not a valid JSON object.');
    return { totes: [], rooms: [], warnings };
  }

  const rawTotes = value.totes;
  const rawRooms = value.rooms;

  const { totes, invalidCount } = normalizeTotes(rawTotes);
  if (!Array.isArray(rawTotes)) {
    warnings.push('No totes array found in import.');
  } else if (invalidCount > 0) {
    warnings.push(`${invalidCount} tote(s) skipped due to invalid data.`);
  }

  const { rooms, migrated } = normalizeRooms(rawRooms, defaultIcon);
  if (!Array.isArray(rawRooms)) {
    warnings.push('No rooms array found in import.');
  } else if (migrated) {
    warnings.push('Some rooms were normalized to the current format.');
  }

  return { totes, rooms, warnings };
};
