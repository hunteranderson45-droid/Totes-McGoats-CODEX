type AiReviewCardProps = {
  description: string;
  tags: string[];
  flagged?: boolean;
  onEdit?: () => void;
};

export default function AiReviewCard({ description, tags, flagged, onEdit }: AiReviewCardProps) {
  return (
    <div className={`rounded-2xl border ${flagged ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{description}</p>
          {flagged && (
            <span className="mt-2 inline-flex rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
              Needs review
            </span>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
