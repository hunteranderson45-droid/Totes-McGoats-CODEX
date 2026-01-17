type SearchBarProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export default function SearchBar({ value, placeholder, onChange }: SearchBarProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder || 'Search items'}
      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
    />
  );
}
