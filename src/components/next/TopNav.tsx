type TopNavProps = {
  active: 'capture' | 'browse' | 'search';
  onChange: (next: 'capture' | 'browse' | 'search') => void;
};

const tabs = [
  { id: 'capture', label: 'Capture' },
  { id: 'browse', label: 'Browse' },
  { id: 'search', label: 'Search' },
] as const;

export default function TopNav({ active, onChange }: TopNavProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            active === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
