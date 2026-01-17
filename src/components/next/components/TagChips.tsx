type TagChipsProps = {
  tags: string[];
};

export default function TagChips({ tags }: TagChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
