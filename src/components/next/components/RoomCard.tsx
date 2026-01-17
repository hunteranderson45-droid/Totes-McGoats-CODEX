type RoomCardProps = {
  name: string;
  icon: string;
  count?: number;
  onClick?: () => void;
};

export default function RoomCard({ name, icon, count, onClick }: RoomCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          {typeof count === 'number' && (
            <p className="text-xs text-gray-500">{count} totes</p>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-400">View</span>
    </button>
  );
}
