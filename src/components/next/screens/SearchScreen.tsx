import SearchBar from '../components/SearchBar';
import ItemCard from '../components/ItemCard';
import type { Item, Tote } from '../../../lib/validation';

type SearchResult = {
  tote: Tote;
  item: Item;
};

type SearchScreenProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  results: SearchResult[];
};

export default function SearchScreen({ searchQuery, onSearchChange, results }: SearchScreenProps) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-bold text-gray-900">Search Items</h2>
        <p className="text-sm text-gray-500">Search by tags, color, brand, or room.</p>
      </header>
      <SearchBar value={searchQuery} onChange={onSearchChange} placeholder="Search items or tags..." />
      {searchQuery.trim().length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
          Start typing to find items across all totes.
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
          No matches found.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={`${result.tote.id}-${index}`} className="space-y-2">
              <div className="text-xs text-gray-500">
                {result.tote.number} • {result.tote.room}
              </div>
              <ItemCard description={result.item.description} tags={result.item.tags} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
