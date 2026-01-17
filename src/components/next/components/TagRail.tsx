type TagRailProps = {
  tags: string[];
  onSelect?: (tag: string) => void;
};

export default function TagRail({ tags, onSelect }: TagRailProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onSelect?.(tag)}
          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700"
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
