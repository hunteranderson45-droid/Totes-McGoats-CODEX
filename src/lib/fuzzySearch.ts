import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';
import type { Item, Tote } from './validation';

interface SearchableItem {
  toteId: number;
  toteName: string;
  toteRoom: string;
  itemIndex: number;
  description: string;
  tags: string[];
  tagString: string;
}

interface SearchResult {
  tote: Tote;
  matchingItems: Item[];
  matchedTerms: string[];
}

const fuseOptions: IFuseOptions<SearchableItem> = {
  keys: [
    { name: 'description', weight: 0.4 },
    { name: 'tagString', weight: 0.35 },
    { name: 'toteName', weight: 0.15 },
    { name: 'toteRoom', weight: 0.1 },
  ],
  threshold: 0.4, // 0 = exact match, 1 = match anything
  includeMatches: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export function createSearchIndex(totes: Tote[]): Fuse<SearchableItem> {
  const searchableItems: SearchableItem[] = [];

  for (const tote of totes) {
    for (let i = 0; i < tote.items.length; i++) {
      const item = tote.items[i];
      searchableItems.push({
        toteId: tote.id,
        toteName: tote.number,
        toteRoom: tote.room,
        itemIndex: i,
        description: item.description,
        tags: item.tags,
        tagString: item.tags.join(' '),
      });
    }
  }

  return new Fuse(searchableItems, fuseOptions);
}

export function fuzzySearch(
  query: string,
  totes: Tote[],
  fuseIndex: Fuse<SearchableItem>
): SearchResult[] {
  if (!query.trim()) {
    return totes.map(tote => ({ tote, matchingItems: [], matchedTerms: [] }));
  }

  const results = fuseIndex.search(query);

  // Group results by tote
  const toteMap = new Map<number, { tote: Tote; itemIndices: Set<number>; matchedTerms: Set<string> }>();

  for (const result of results) {
    const { toteId, itemIndex } = result.item;
    const tote = totes.find(t => t.id === toteId);
    if (!tote) continue;

    if (!toteMap.has(toteId)) {
      toteMap.set(toteId, { tote, itemIndices: new Set(), matchedTerms: new Set() });
    }

    const entry = toteMap.get(toteId)!;
    entry.itemIndices.add(itemIndex);

    // Extract matched terms for highlighting
    if (result.matches) {
      for (const match of result.matches) {
        if (match.value) {
          entry.matchedTerms.add(query.toLowerCase());
        }
      }
    }
  }

  return Array.from(toteMap.values()).map(({ tote, itemIndices, matchedTerms }) => ({
    tote,
    matchingItems: Array.from(itemIndices).map(i => tote.items[i]),
    matchedTerms: Array.from(matchedTerms),
  }));
}

// Highlight matching text in a string
export function highlightMatches(text: string, query: string): { text: string; highlighted: boolean }[] {
  if (!query.trim()) {
    return [{ text, highlighted: false }];
  }

  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const lowerText = text.toLowerCase();
  const segments: { text: string; highlighted: boolean }[] = [];

  let lastIndex = 0;
  const matches: { start: number; end: number }[] = [];

  // Find all term matches
  for (const term of terms) {
    let searchStart = 0;
    while (searchStart < lowerText.length) {
      const idx = lowerText.indexOf(term, searchStart);
      if (idx === -1) break;
      matches.push({ start: idx, end: idx + term.length });
      searchStart = idx + 1;
    }
  }

  // Sort and merge overlapping matches
  matches.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const m of matches) {
    if (merged.length === 0 || m.start > merged[merged.length - 1].end) {
      merged.push({ ...m });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, m.end);
    }
  }

  // Build segments
  for (const m of merged) {
    if (m.start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, m.start), highlighted: false });
    }
    segments.push({ text: text.slice(m.start, m.end), highlighted: true });
    lastIndex = m.end;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return segments.length > 0 ? segments : [{ text, highlighted: false }];
}
