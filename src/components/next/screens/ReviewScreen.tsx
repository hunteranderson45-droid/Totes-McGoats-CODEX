import AiReviewCard from '../components/AiReviewCard';
import type { Item, Room } from '../../../lib/validation';

type ReviewScreenProps = {
  items: Item[];
  rooms: Room[];
  toteName: string;
  roomName: string;
  onToteNameChange: (value: string) => void;
  onRoomNameChange: (value: string) => void;
  onSave: () => void;
  onCreateRoom: (value: string) => void;
};

export default function ReviewScreen({
  items,
  rooms,
  toteName,
  roomName,
  onToteNameChange,
  onRoomNameChange,
  onSave,
  onCreateRoom,
}: ReviewScreenProps) {
  const shouldFlagItem = (item: Item) => {
    const description = item.description.toLowerCase();
    const vagueTerms = [
      'unknown',
      'uncertain',
      'unsure',
      'misc',
      'assorted',
      'various',
      'stuff',
      'items',
      'object',
      'thing',
      'maybe',
    ];
    if (vagueTerms.some((term) => description.includes(term))) return true;
    if (description.includes('?')) return true;
    if (description.split(' ').length <= 2) return true;
    if (item.tags.length < 6) return true;
    return false;
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Review Items</h2>
          <p className="text-sm text-gray-500">
            Confirm descriptions and tags before saving.
          </p>
        </div>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
          {items.length} pending
        </span>
      </header>
      {items.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          "Needs review" means the description looks uncertain or too vague.
        </div>
      )}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
          Upload a photo to generate items.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <AiReviewCard
              key={`${item.description}-${index}`}
              description={item.description}
              tags={item.tags}
              flagged={shouldFlagItem(item)}
            />
          ))}
        </div>
      )}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <input
          type="text"
          value={toteName}
          onChange={(event) => onToteNameChange(event.target.value)}
          placeholder="Tote name or number"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={roomName}
            onChange={(event) => onRoomNameChange(event.target.value)}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm"
          >
            <option value="">Select a room</option>
            {rooms.map((room) => (
              <option key={room.name} value={room.name}>
                {room.icon} {room.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const nextRoom = window.prompt('New room name');
              if (nextRoom) onCreateRoom(nextRoom);
            }}
            className="rounded-xl border border-gray-200 px-4 py-3 text-xs font-semibold text-gray-700"
          >
            Add Room
          </button>
        </div>
        <button
          type="button"
          onClick={onSave}
          className="w-full rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-300"
          disabled={!toteName.trim() || !roomName.trim() || items.length === 0}
        >
          Save Tote
        </button>
      </div>
    </section>
  );
}
