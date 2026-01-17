import RoomCard from '../components/RoomCard';
import ToteCard from '../components/ToteCard';
import type { Room, Tote } from '../../../lib/validation';

type BrowseScreenProps = {
  rooms: Array<Room & { count: number }>;
  totes: Tote[];
};

export default function BrowseScreen({ rooms, totes }: BrowseScreenProps) {
  const totesByRoom = rooms.map((room) => ({
    room,
    totes: totes.filter((tote) => tote.room === room.name),
  }));

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-bold text-gray-900">Browse Rooms</h2>
        <p className="text-sm text-gray-500">Jump into a room, then drill into totes.</p>
      </header>
      {rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
          No rooms yet. Add rooms in the legacy app.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard
                key={room.name}
                name={room.name}
                icon={room.icon}
                count={room.count}
              />
            ))}
          </div>
          {totesByRoom.map(({ room, totes: roomTotes }) => (
            <div key={room.name} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{room.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                <span className="text-xs text-gray-400">({roomTotes.length})</span>
              </div>
              {roomTotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                  No totes in this room yet.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {roomTotes.map((tote) => (
                    <ToteCard
                      key={tote.id}
                      label={tote.number}
                      room={tote.room}
                      itemCount={tote.items.length}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
