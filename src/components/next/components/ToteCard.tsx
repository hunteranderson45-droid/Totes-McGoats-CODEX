type ToteCardProps = {
  label: string;
  room: string;
  itemCount: number;
  onClick?: () => void;
};

export default function ToteCard({ label, room, itemCount, onClick }: ToteCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-left"
    >
      <div className="h-28 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100" />
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">
          {room} • {itemCount} items
        </p>
      </div>
    </button>
  );
}
