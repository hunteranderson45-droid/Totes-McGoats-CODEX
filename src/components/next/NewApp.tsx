import { useEffect, useMemo, useState } from 'react';
import { storage } from '../../lib/storage';
import { normalizeRooms, normalizeTote, type Item, type Room, type Tote } from '../../lib/validation';
import AppShell from './AppShell';
import TopNav from './TopNav';
import CaptureScreen from './screens/CaptureScreen';
import ReviewScreen from './screens/ReviewScreen';
import BrowseScreen from './screens/BrowseScreen';
import SearchScreen from './screens/SearchScreen';

type NewAppProps = {
  onOpenLegacy: () => void;
};

type SearchResult = {
  tote: Tote;
  item: Item;
};

const DEFAULT_ROOM_ICON = '🏠';

const readSessionUser = () => {
  const storedSession = sessionStorage.getItem('accessSession');
  const storedLocal = localStorage.getItem('accessSession');
  try {
    const parsed = JSON.parse(storedSession || storedLocal || '{}');
    return typeof parsed.userName === 'string' ? parsed.userName : '';
  } catch {
    return '';
  }
};

export default function NewApp({ onOpenLegacy }: NewAppProps) {
  const accessCode = (import.meta.env.VITE_ACCESS_CODE || '').trim();
  const [activeTab, setActiveTab] = useState<'capture' | 'browse' | 'search'>('capture');
  const [userName, setUserName] = useState(readSessionUser);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [totes, setTotes] = useState<Tote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analyzedItems, setAnalyzedItems] = useState<Item[]>([]);
  const [toteName, setToteName] = useState('');
  const [roomName, setRoomName] = useState('');

  const accessGranted = Boolean(userName || !accessCode);

  useEffect(() => {
    if (!accessGranted) return;
    storage.setNamespace(userName);
    const loadData = async () => {
      const keys = await storage.list('tote:');
      const loadedTotes = await Promise.all(
        keys.keys.map(async (key) => {
          const result = await storage.get(key);
          if (!result) return null;
          try {
            return normalizeTote(JSON.parse(result.value));
          } catch {
            return null;
          }
        })
      );
      setTotes(loadedTotes.filter((tote): tote is Tote => tote !== null));

      const roomsResult = await storage.get('rooms');
      if (roomsResult) {
        try {
          const parsed = JSON.parse(roomsResult.value);
          const normalized = normalizeRooms(parsed, DEFAULT_ROOM_ICON);
          setRooms(normalized.rooms);
        } catch {
          setRooms([]);
        }
      }
    };
    loadData();
  }, [accessGranted, userName]);

  useEffect(() => {
    const syncUser = () => setUserName(readSessionUser());
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  const roomsWithCounts = useMemo(() => {
    return rooms.map((room) => ({
      ...room,
      count: totes.filter((tote) => tote.room === room.name).length,
    }));
  }, [rooms, totes]);

  const analyzeImage = async (imageData: string, mediaType: string): Promise<Item[]> => {
    setAnalyzing(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        alert('Please set VITE_ANTHROPIC_API_KEY in your .env file');
        return [];
      }

      const callAnthropic = async (messages: Array<{ role: string; content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> }>) => {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || JSON.stringify(data));
        }
        return data;
      };

      const extractJson = (data: unknown) => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response payload');
        }
        const content = Array.isArray((data as { content?: unknown }).content)
          ? (data as { content: Array<{ type?: unknown; text?: unknown }> }).content
          : [];
        const textBlock = content.find(
          (block) => block && typeof block === 'object' && (block as { type?: unknown }).type === 'text'
        );
        const textContent = typeof (textBlock as { text?: unknown })?.text === 'string'
          ? (textBlock as { text: string }).text
          : '';
        const cleanedText = textContent.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedText);
      };

      const firstData = await callAnthropic([
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: 'text',
                text: `You are cataloging items for a home storage inventory system. Look at this image and identify EVERY distinct physical object/item. Ignore the background, floor, table, or surface they're on.

Be precise and conservative:
- If you are unsure, use a generic description (e.g., "black plastic container") rather than guessing a brand or model.
- Do not invent text, brand names, or sizes that are not clearly visible.
- Include brand names when they are clearly visible on the item; this helps searching.

For each item, provide:
1. A SHORT but SPECIFIC description (under 10 words) that someone would recognize.
2. MANY searchable tags (12-24) that someone might type when looking for this item later. Use only lowercase tags.

Return ONLY valid JSON: {"items": [{"description": "short item description", "tags": ["tag1", "tag2"]}]}`,
            },
          ],
        },
      ]);

      const parsedFirst = extractJson(firstData);
      const firstItems = parsedFirst.items || [];

      try {
        const reviewPayload = JSON.stringify({ items: firstItems });
        const reviewData = await callAnthropic([
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Second pass: review this JSON for accuracy. Remove uncertain brands/sizes, deduplicate items and tags, and ensure tags are relevant and lowercase. Return ONLY valid JSON.\n\n${reviewPayload}`,
              },
            ],
          },
        ]);

        const parsedReview = extractJson(reviewData);
        return parsedReview.items || firstItems;
      } catch (error) {
        console.error('Second pass failed, using first pass:', error);
        return firstItems;
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert(`Error analyzing image: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const mediaType = result.split(';')[0].split(':')[1];
      const base64Data = result.split(',')[1];
      setPreviewImage(result);
      const items = await analyzeImage(base64Data, mediaType);
      setAnalyzedItems(items);
    };
    reader.readAsDataURL(file);
  };

  const saveRooms = async (updatedRooms: Room[]) => {
    await storage.set('rooms', JSON.stringify(updatedRooms));
    setRooms(updatedRooms);
  };

  const handleCreateRoom = async (value: string) => {
    const name = value.trim();
    if (!name) return;
    if (rooms.some((room) => room.name.toLowerCase() === name.toLowerCase())) {
      setRoomName(name);
      return;
    }
    const next = [...rooms, { name, icon: DEFAULT_ROOM_ICON }];
    await saveRooms(next);
    setRoomName(name);
  };

  const saveTote = async () => {
    if (!toteName.trim() || !roomName.trim() || analyzedItems.length === 0) return;
    const newTote: Tote = {
      id: Date.now(),
      number: toteName.trim(),
      room: roomName.trim(),
      items: analyzedItems,
      imageUrl: previewImage || undefined,
      date: new Date().toLocaleDateString(),
    };
    await storage.set(`tote:${newTote.id}`, JSON.stringify(newTote));
    setTotes((prev) => [...prev, newTote]);
    setToteName('');
    setRoomName('');
    setPreviewImage(null);
    setAnalyzedItems([]);
    alert('Tote saved!');
  };

  const searchResults = useMemo<SearchResult[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const results: SearchResult[] = [];
    for (const tote of totes) {
      for (const item of tote.items) {
        const haystack = `${item.description} ${item.tags.join(' ')}`.toLowerCase();
        if (haystack.includes(query)) {
          results.push({ tote, item });
        }
      }
    }
    return results;
  }, [searchQuery, totes]);

  return (
    <AppShell
      header={
        <div className="bg-white px-4 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Totes McGoats</h1>
              <p className="text-sm text-gray-500">Capture, review, and find items fast.</p>
            </div>
            <button
              type="button"
              onClick={onOpenLegacy}
              className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700"
            >
              Open Legacy App
            </button>
          </div>
          {!accessGranted && (
            <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-900">
              Sign in through the legacy app to view your data here.
            </div>
          )}
        </div>
      }
      nav={<TopNav active={activeTab} onChange={setActiveTab} />}
    >
      {activeTab === 'capture' && (
        <div className="space-y-6">
          <CaptureScreen previewImage={previewImage} analyzing={analyzing} onFileSelected={handleFileSelected} />
          <ReviewScreen
            items={analyzedItems}
            rooms={rooms}
            toteName={toteName}
            roomName={roomName}
            onToteNameChange={setToteName}
            onRoomNameChange={setRoomName}
            onSave={saveTote}
            onCreateRoom={handleCreateRoom}
          />
        </div>
      )}
      {activeTab === 'browse' && (
        <BrowseScreen rooms={roomsWithCounts} totes={totes} />
      )}
      {activeTab === 'search' && (
        <SearchScreen
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          results={searchResults}
        />
      )}
    </AppShell>
  );
}
