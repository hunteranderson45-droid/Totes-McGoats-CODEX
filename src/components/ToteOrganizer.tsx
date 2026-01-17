import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { Camera, Search, Package, Trash2, X, Plus, ChevronDown, Move, Settings, Edit2, Sparkles, Download, Upload, BarChart3, Moon, Sun, Check, Lock, Unlock } from 'lucide-react';
import { storage } from '../lib/storage';

// Fun room icons to choose from
const ROOM_ICONS = [
  '🏠', '🛋️', '🛏️', '🍳', '🚿', '🚗', '🧺', '👶', '🎮', '📚',
  '🏋️', '🌿', '🎄', '📦', '🧰', '👔', '🎨', '🎵', '🐕', '❄️'
];

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Image compression utility
async function compressImage(base64: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}

interface Room {
  name: string;
  icon: string;
}

interface Item {
  description: string;
  tags: string[];
}

interface Tote {
  id: number;
  number: string;
  room: string;
  items: Item[];
  imageUrl?: string;
  date: string;
}

interface MovingItem {
  toteId: number;
  itemIndex: number;
  item: Item;
}

// Memoized ToteCard component - only re-renders when its specific tote changes
interface ToteCardProps {
  tote: Tote;
  onClick: () => void;
}

const ToteCard = memo(function ToteCard({ tote, onClick }: ToteCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-left group"
    >
      {tote.imageUrl ? (
        <div className="relative overflow-hidden">
          <img
            src={tote.imageUrl}
            alt={tote.number}
            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center">
          <Package className="w-12 h-12 text-indigo-400 group-hover:scale-110 transition-transform" />
        </div>
      )}
      <div className="p-3">
        <h3 className="font-bold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{tote.number}</h3>
        <p className="text-sm text-gray-500">{tote.items.length} item{tote.items.length !== 1 ? 's' : ''}</p>
      </div>
    </button>
  );
});

export default function ToteOrganizer() {
  const accessCode = (import.meta.env.VITE_ACCESS_CODE || '').trim();
  const [accessGranted, setAccessGranted] = useState(() => {
    const storedSession = sessionStorage.getItem('accessSession');
    const storedLocal = localStorage.getItem('accessSession');
    return Boolean(storedSession || storedLocal || !accessCode);
  });
  const [userName, setUserName] = useState(() => {
    const storedSession = sessionStorage.getItem('accessSession');
    const storedLocal = localStorage.getItem('accessSession');
    try {
      const parsed = JSON.parse(storedSession || storedLocal || '{}');
      return parsed.userName || '';
    } catch {
      return '';
    }
  });
  const [loginUserName, setLoginUserName] = useState('');
  const [loginAccessCode, setLoginAccessCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [setPinOnLogin, setSetPinOnLogin] = useState(false);
  const [loginPin, setLoginPin] = useState('');
  const [loginPinConfirm, setLoginPinConfirm] = useState('');

  // Security: PIN lock
  const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem('appPin'));
  const [pinInput, setPinInput] = useState('');
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const storedPin = localStorage.getItem('appPin');

  const completeLogin = useCallback(() => {
    if (!loginUserName.trim()) {
      alert('Please enter a username');
      return;
    }
    if (accessCode && loginAccessCode.trim() !== accessCode) {
      alert('Incorrect access code');
      return;
    }
    if (setPinOnLogin) {
      if (loginPin.length < 4) {
        alert('PIN must be at least 4 digits');
        return;
      }
      if (loginPin !== loginPinConfirm) {
        alert('PINs do not match');
        return;
      }
      localStorage.setItem('appPin', loginPin);
    }
    const payload = JSON.stringify({ userName: loginUserName.trim(), ts: Date.now() });
    if (rememberMe) {
      localStorage.setItem('accessSession', payload);
      sessionStorage.removeItem('accessSession');
    } else {
      sessionStorage.setItem('accessSession', payload);
      localStorage.removeItem('accessSession');
    }
    setUserName(loginUserName.trim());
    setAccessGranted(true);
    setLoginUserName('');
    setLoginAccessCode('');
    setLoginPin('');
    setLoginPinConfirm('');
    setSetPinOnLogin(false);
  }, [loginUserName, loginAccessCode, rememberMe, accessCode, setPinOnLogin, loginPin, loginPinConfirm]);

  const logout = useCallback(() => {
    localStorage.removeItem('accessSession');
    sessionStorage.removeItem('accessSession');
    setAccessGranted(false);
    setUserName('');
    setTotes([]);
    setRooms([]);
    setCurrentTote('');
    setCurrentRoom('');
    setPreviewImage(null);
    setAnalyzedItems([]);
    setShowAddForm(false);
    setSelectedTote(null);
  }, []);

  const unlockApp = useCallback(() => {
    if (pinInput === storedPin) {
      setIsLocked(false);
      setPinInput('');
    } else {
      alert('Incorrect PIN');
      setPinInput('');
    }
  }, [pinInput, storedPin]);

  const setAppPin = useCallback(() => {
    if (newPin.length < 4) {
      alert('PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      alert('PINs do not match');
      return;
    }
    localStorage.setItem('appPin', newPin);
    setShowSetPin(false);
    setNewPin('');
    setConfirmPin('');
    alert('PIN set successfully!');
  }, [newPin, confirmPin]);

  const removePin = useCallback(() => {
    if (confirm('Remove PIN protection?')) {
      localStorage.removeItem('appPin');
      setShowSetPin(false);
    }
  }, []);

  const [totes, setTotes] = useState<Tote[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentTote, setCurrentTote] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomIcon, setNewRoomIcon] = useState('🏠');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [selectedTote, setSelectedTote] = useState<Tote | null>(null);
  const [movingItem, setMovingItem] = useState<MovingItem | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemToteId, setAddItemToteId] = useState<number | null>(null);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemTags, setNewItemTags] = useState('');
  const [analyzedItems, setAnalyzedItems] = useState<Item[]>([]);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomIcon, setEditRoomIcon] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'items'>('name');
  const [showStats, setShowStats] = useState(false);
  const [editingItem, setEditingItem] = useState<{ toteId: number; itemIndex: number } | null>(null);
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editItemTags, setEditItemTags] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showQuickRoom, setShowQuickRoom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 150);

  // Memoized room icon map for O(1) lookups
  const roomIconMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach(r => map.set(r.name, r.icon));
    return map;
  }, [rooms]);

  // Helper to get room icon with O(1) lookup
  const getRoomIcon = useCallback((name: string): string => {
    return roomIconMap.get(name) || '📦';
  }, [roomIconMap]);

  // Load totes and rooms from storage on login
  useEffect(() => {
    if (!accessGranted) return;
    storage.setNamespace(userName);
    const loadData = async () => {
      try {
        const keys = await storage.list('tote:');
        if (keys && keys.keys) {
          const loadedTotes = await Promise.all(
            keys.keys.map(async (key) => {
              const result = await storage.get(key);
              return result ? JSON.parse(result.value) : null;
            })
          );
          setTotes(loadedTotes.filter(Boolean));
        }

        const roomsResult = await storage.get('rooms');
        if (roomsResult) {
          const parsed = JSON.parse(roomsResult.value);
          // Handle migration from old string[] format to new Room[] format
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
            const migratedRooms: Room[] = parsed.map((name: string) => ({ name, icon: '🏠' }));
            setRooms(migratedRooms);
            await storage.set('rooms', JSON.stringify(migratedRooms));
          } else {
            setRooms(parsed);
          }
        }
      } catch {
        console.log('No saved data found');
      }
    };
    loadData();
  }, [accessGranted, userName]);

  useEffect(() => {
    if (!accessGranted) return;
    const loadDraft = async () => {
      const draftResult = await storage.get('draft:new-tote');
      if (!draftResult) return;
      try {
        const draft = JSON.parse(draftResult.value);
        if (draft.currentTote) setCurrentTote(draft.currentTote);
        if (draft.currentRoom) setCurrentRoom(draft.currentRoom);
        if (draft.previewImage) setPreviewImage(draft.previewImage);
        if (Array.isArray(draft.analyzedItems)) setAnalyzedItems(draft.analyzedItems);
      } catch {
        // Ignore invalid draft data.
      }
    };
    loadDraft();
  }, [accessGranted]);

  useEffect(() => {
    if (!accessGranted) return;
    const saveDraft = async () => {
      const payload = JSON.stringify({
        currentTote,
        currentRoom,
        previewImage,
        analyzedItems,
      });
      await storage.set('draft:new-tote', payload);
    };
    saveDraft();
  }, [accessGranted, currentTote, currentRoom, previewImage, analyzedItems]);

  const saveRooms = useCallback(async (updatedRooms: Room[]) => {
    try {
      await storage.set('rooms', JSON.stringify(updatedRooms));
      setRooms(updatedRooms);
    } catch (error) {
      console.error('Error saving rooms:', error);
    }
  }, []);

  const addRoom = useCallback(async () => {
    if (!newRoomName.trim() || rooms.some(r => r.name === newRoomName.trim())) return;
    await saveRooms([...rooms, { name: newRoomName.trim(), icon: newRoomIcon }]);
    setNewRoomName('');
    setNewRoomIcon('🏠');
  }, [newRoomName, newRoomIcon, rooms, saveRooms]);

  const addRoomAndSelect = useCallback(async () => {
    const roomName = newRoomName.trim();
    if (!roomName || rooms.some(r => r.name === roomName)) return;
    await saveRooms([...rooms, { name: roomName, icon: newRoomIcon }]);
    setNewRoomName('');
    setNewRoomIcon('🏠');
    setCurrentRoom(roomName);
    setShowQuickRoom(false);
  }, [newRoomName, newRoomIcon, rooms, saveRooms]);

  const deleteRoom = useCallback(async (roomToDelete: string) => {
    const totesInRoom = totes.filter(t => t.room === roomToDelete);
    if (totesInRoom.length > 0) {
      alert(`Cannot delete "${roomToDelete}" - it contains ${totesInRoom.length} tote(s). Move or delete them first.`);
      return;
    }
    await saveRooms(rooms.filter(r => r.name !== roomToDelete));
  }, [totes, rooms, saveRooms]);

  const updateRoom = useCallback(async (oldName: string, newName: string, newIcon: string) => {
    if (!newName.trim() || (newName !== oldName && rooms.some(r => r.name === newName.trim()))) return;

    // Update rooms list
    const updatedRooms = rooms.map(r => r.name === oldName ? { name: newName.trim(), icon: newIcon } : r);
    await saveRooms(updatedRooms);

    // Update all totes in this room if name changed
    if (newName !== oldName) {
      const totesToUpdate = totes.filter(t => t.room === oldName);
      for (const tote of totesToUpdate) {
        const updatedTote = { ...tote, room: newName.trim() };
        await storage.set(`tote:${tote.id}`, JSON.stringify(updatedTote));
      }
      setTotes(prev => prev.map(t => t.room === oldName ? { ...t, room: newName.trim() } : t));
    }

    setEditingRoom(null);
    setEditRoomName('');
    setEditRoomIcon('');
  }, [rooms, totes, saveRooms]);

  const analyzeImage = async (imageData: string, mediaType: string): Promise<Item[]> => {
    setAnalyzing(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        alert('Please set VITE_ANTHROPIC_API_KEY in your .env file');
        return [];
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: imageData
                  }
                },
                {
                  type: "text",
                  text: `You are cataloging items for a home storage inventory system. Look at this image and identify EVERY distinct physical object/item. Ignore the background, floor, table, or surface they're on.

For each item, I need:
1. A SHORT but SPECIFIC description (under 10 words) that someone would recognize, like:
   - "Blue Nike running shoes size 10"
   - "Black & Decker cordless drill"
   - "Red KitchenAid stand mixer"
   - "Box of assorted Christmas lights"
   - "Infant car seat - Graco gray"

2. MANY searchable tags (10-20) that someone might type when looking for this item later:
   - The exact item name and synonyms (drill, power drill, cordless drill)
   - Brand if visible
   - Colors
   - Category (tools, kitchen, baby, sports, holiday, electronics, clothing, toys, etc.)
   - Material (plastic, metal, fabric, wood, glass)
   - Size descriptors if relevant (small, large, infant, adult)
   - Season/holiday if applicable (christmas, halloween, winter, summer)
   - Room it might belong in (garage, kitchen, nursery, closet)
   - What it's used for (cooking, cleaning, storage, decoration)

Be thorough - if someone searches "red" or "christmas" or "baby" they should find relevant items.

Return ONLY valid JSON: {"items": [{"description": "short item description", "tags": ["tag1", "tag2", "tag3", ...]}]}`
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        alert(`API Error: ${data.error?.message || JSON.stringify(data)}`);
        return [];
      }

      const textContent = data.content?.find((block: { type: string }) => block.type === 'text')?.text || '';
      const cleanedText = textContent.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      return parsed.items || [];
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert(`Error analyzing image: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const mediaType = result.split(';')[0].split(':')[1];
      const base64Data = result.split(',')[1];

      // Compress image for storage (smaller preview)
      const compressedImage = await compressImage(result);
      setPreviewImage(compressedImage);

      const items = await analyzeImage(base64Data, mediaType);
      setAnalyzedItems(items);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const saveTote = useCallback(async () => {
    if (!currentTote || !currentRoom || analyzedItems.length === 0) return;

    const toteExists = totes.some(t => t.number.toLowerCase() === currentTote.toLowerCase());
    if (toteExists) {
      alert(`A tote with the number "${currentTote}" already exists.`);
      return;
    }

    const newTote: Tote = {
      id: Date.now(),
      number: currentTote,
      room: currentRoom,
      items: analyzedItems,
      imageUrl: previewImage || undefined,
      date: new Date().toLocaleDateString()
    };

    try {
      await storage.set(`tote:${newTote.id}`, JSON.stringify(newTote));
      await storage.delete('draft:new-tote');
      setTotes(prev => [...prev, newTote]);
      setCurrentTote('');
      setCurrentRoom('');
      setPreviewImage(null);
      setAnalyzedItems([]);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving tote:', error);
      alert('Error saving tote. Please try again.');
    }
  }, [currentTote, currentRoom, analyzedItems, previewImage, totes]);

  const updateToteRoom = useCallback(async (toteId: number, newRoom: string) => {
    const tote = totes.find(t => t.id === toteId);
    if (!tote) return;

    const updatedTote = { ...tote, room: newRoom };
    try {
      await storage.set(`tote:${toteId}`, JSON.stringify(updatedTote));
      setTotes(prev => prev.map(t => t.id === toteId ? updatedTote : t));
      setSelectedTote(prev => prev?.id === toteId ? updatedTote : prev);
    } catch (error) {
      console.error('Error updating tote:', error);
    }
  }, [totes]);

  const deleteTote = useCallback(async (id: number) => {
    try {
      await storage.delete(`tote:${id}`);
      setTotes(prev => prev.filter(t => t.id !== id));
      setSelectedTote(prev => prev?.id === id ? null : prev);
    } catch (error) {
      console.error('Error deleting tote:', error);
    }
  }, []);

  const deleteItem = useCallback(async (toteId: number, itemIndex: number) => {
    const tote = totes.find(t => t.id === toteId);
    if (!tote) return;

    const updatedItems = tote.items.filter((_, idx) => idx !== itemIndex);

    if (updatedItems.length === 0) {
      await deleteTote(toteId);
    } else {
      const updatedTote = { ...tote, items: updatedItems };
      try {
        await storage.set(`tote:${toteId}`, JSON.stringify(updatedTote));
        setTotes(prev => prev.map(t => t.id === toteId ? updatedTote : t));
        setSelectedTote(prev => prev?.id === toteId ? updatedTote : prev);
      } catch (error) {
        console.error('Error updating tote:', error);
      }
    }
  }, [totes, deleteTote]);

  const moveItem = useCallback(async (fromToteId: number, itemIndex: number, toToteId: number) => {
    const fromTote = totes.find(t => t.id === fromToteId);
    const toTote = totes.find(t => t.id === toToteId);
    if (!fromTote || !toTote) return;

    const itemToMove = fromTote.items[itemIndex];
    const updatedFromItems = fromTote.items.filter((_, idx) => idx !== itemIndex);
    const updatedToItems = [...toTote.items, itemToMove];

    try {
      if (updatedFromItems.length === 0) {
        await storage.delete(`tote:${fromToteId}`);
        const updatedToTote = { ...toTote, items: updatedToItems };
        await storage.set(`tote:${toToteId}`, JSON.stringify(updatedToTote));
        setTotes(prev => prev.filter(t => t.id !== fromToteId).map(t => t.id === toToteId ? updatedToTote : t));
        setSelectedTote(prev => prev?.id === fromToteId ? null : prev);
      } else {
        const updatedFromTote = { ...fromTote, items: updatedFromItems };
        const updatedToTote = { ...toTote, items: updatedToItems };
        await storage.set(`tote:${fromToteId}`, JSON.stringify(updatedFromTote));
        await storage.set(`tote:${toToteId}`, JSON.stringify(updatedToTote));
        setTotes(prev => prev.map(t => {
          if (t.id === fromToteId) return updatedFromTote;
          if (t.id === toToteId) return updatedToTote;
          return t;
        }));
        setSelectedTote(prev => prev?.id === fromToteId ? updatedFromTote : prev);
      }
      setShowMoveModal(false);
      setMovingItem(null);
    } catch (error) {
      console.error('Error moving item:', error);
      alert('Error moving item. Please try again.');
    }
  }, [totes]);

  const addItemToTote = useCallback(async () => {
    if (!newItemDescription.trim() || !addItemToteId) return;

    const tote = totes.find(t => t.id === addItemToteId);
    if (!tote) return;

    const newItem: Item = {
      description: newItemDescription.trim(),
      tags: newItemTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    };

    const updatedTote = { ...tote, items: [...tote.items, newItem] };

    try {
      await storage.set(`tote:${addItemToteId}`, JSON.stringify(updatedTote));
      setTotes(prev => prev.map(t => t.id === addItemToteId ? updatedTote : t));
      setSelectedTote(prev => prev?.id === addItemToteId ? updatedTote : prev);
      setNewItemDescription('');
      setNewItemTags('');
      setShowAddItemModal(false);
      setAddItemToteId(null);
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Error adding item. Please try again.');
    }
  }, [newItemDescription, newItemTags, addItemToteId, totes]);

  // Export all data as JSON
  const exportData = useCallback(() => {
    const data = { totes, rooms, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `totes-mcgoats-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [totes, rooms]);

  // Import data from JSON
  const importData = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.totes && Array.isArray(data.totes)) {
        for (const tote of data.totes) {
          await storage.set(`tote:${tote.id}`, JSON.stringify(tote));
        }
        setTotes(data.totes);
      }

      if (data.rooms && Array.isArray(data.rooms)) {
        await storage.set('rooms', JSON.stringify(data.rooms));
        setRooms(data.rooms);
      }

      alert(`Imported ${data.totes?.length || 0} totes and ${data.rooms?.length || 0} rooms!`);
    } catch {
      alert('Error importing data. Please check the file format.');
    }
    e.target.value = '';
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', String(newValue));
      return newValue;
    });
  }, []);

  // Edit item
  const saveItemEdit = useCallback(async () => {
    if (!editingItem || !editItemDescription.trim()) return;

    const tote = totes.find(t => t.id === editingItem.toteId);
    if (!tote) return;

    const updatedItems = [...tote.items];
    updatedItems[editingItem.itemIndex] = {
      description: editItemDescription.trim(),
      tags: editItemTags.split(',').map(t => t.trim()).filter(t => t.length > 0)
    };

    const updatedTote = { ...tote, items: updatedItems };
    await storage.set(`tote:${tote.id}`, JSON.stringify(updatedTote));
    setTotes(prev => prev.map(t => t.id === tote.id ? updatedTote : t));
    setSelectedTote(prev => prev?.id === tote.id ? updatedTote : prev);
    setEditingItem(null);
    setEditItemDescription('');
    setEditItemTags('');
  }, [editingItem, editItemDescription, editItemTags, totes]);

  // Bulk delete selected items
  const bulkDeleteItems = useCallback(async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected items?`)) return;

    const itemsByTote = new Map<number, number[]>();
    selectedItems.forEach(key => {
      const [toteId, itemIndex] = key.split(':').map(Number);
      if (!itemsByTote.has(toteId)) itemsByTote.set(toteId, []);
      itemsByTote.get(toteId)!.push(itemIndex);
    });

    for (const [toteId, indices] of itemsByTote) {
      const tote = totes.find(t => t.id === toteId);
      if (!tote) continue;

      const sortedIndices = indices.sort((a, b) => b - a);
      const updatedItems = tote.items.filter((_, idx) => !sortedIndices.includes(idx));

      if (updatedItems.length === 0) {
        await storage.delete(`tote:${toteId}`);
        setTotes(prev => prev.filter(t => t.id !== toteId));
      } else {
        const updatedTote = { ...tote, items: updatedItems };
        await storage.set(`tote:${toteId}`, JSON.stringify(updatedTote));
        setTotes(prev => prev.map(t => t.id === toteId ? updatedTote : t));
      }
    }

    setSelectedItems(new Set());
    setBulkMode(false);
    setSelectedTote(null);
  }, [selectedItems, totes]);

  // Toggle item selection
  const toggleItemSelection = useCallback((toteId: number, itemIndex: number) => {
    const key = `${toteId}:${itemIndex}`;
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Statistics
  const stats = useMemo(() => {
    const totalItems = totes.reduce((sum, t) => sum + t.items.length, 0);
    const tagCounts = new Map<string, number>();
    totes.forEach(t => t.items.forEach(item =>
      item.tags.forEach(tag => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1))
    ));
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const itemsByRoom = rooms.map(r => ({
      room: r.name,
      icon: r.icon,
      count: totes.filter(t => t.room === r.name).reduce((sum, t) => sum + t.items.length, 0)
    })).sort((a, b) => b.count - a.count);

    return { totalTotes: totes.length, totalItems, topTags, itemsByRoom, totalRooms: rooms.length };
  }, [totes, rooms]);

  // Memoized filter function
  const getMatchingItems = useCallback((tote: Tote, searchTerms: string[]) => {
    return tote.items.filter(item => {
      const itemText = `${item.description} ${item.tags.join(' ')}`.toLowerCase();
      return searchTerms.some(term => itemText.includes(term));
    });
  }, []);

  // Memoized filtered totes - only recalculates when totes or debounced search changes
  const filteredTotes = useMemo(() => {
    return totes.map(tote => {
      if (!debouncedSearchQuery) return { tote, matchingItems: [] as Item[] };

      const query = debouncedSearchQuery.toLowerCase();
      const searchTerms = query.split(' ').filter(term => term.length > 0);

      const toteMatches = tote.number.toLowerCase().includes(query) ||
                          tote.room?.toLowerCase().includes(query);

      const matchingItems = getMatchingItems(tote, searchTerms);

      if (toteMatches || matchingItems.length > 0) {
        return { tote, matchingItems };
      }
      return null;
    }).filter((result): result is { tote: Tote; matchingItems: Item[] } => result !== null);
  }, [totes, debouncedSearchQuery, getMatchingItems]);

  // Memoized grouping by room with sorting
  const totesByRoom = useMemo(() => {
    const sorted = [...filteredTotes].sort((a, b) => {
      if (sortBy === 'name') return a.tote.number.localeCompare(b.tote.number);
      if (sortBy === 'items') return b.tote.items.length - a.tote.items.length;
      if (sortBy === 'date') return new Date(b.tote.date).getTime() - new Date(a.tote.date).getTime();
      return 0;
    });

    return sorted.reduce<Record<string, { tote: Tote; matchingItems: Item[] }[]>>((acc, result) => {
      const room = result.tote.room || 'Unassigned';
      if (!acc[room]) acc[room] = [];
      acc[room].push(result);
      return acc;
    }, {});
  }, [filteredTotes, sortBy]);

  const closeAddForm = () => {
    setShowAddForm(false);
    setPreviewImage(null);
    setCurrentTote('');
    setCurrentRoom('');
    setAnalyzedItems([]);
    setShowQuickRoom(false);
  };

  const closeAddItemModal = () => {
    setShowAddItemModal(false);
    setAddItemToteId(null);
    setNewItemDescription('');
    setNewItemTags('');
  };

  const closeMoveModal = () => {
    setShowMoveModal(false);
    setMovingItem(null);
  };

  const closeTopModal = useCallback(() => {
    if (showSetPin) return setShowSetPin(false);
    if (showMoveModal) return closeMoveModal();
    if (showAddItemModal) return closeAddItemModal();
    if (selectedTote) return setSelectedTote(null);
    if (showAddForm) return closeAddForm();
    if (showStats) return setShowStats(false);
    if (showRoomManager) return setShowRoomManager(false);
  }, [
    showSetPin,
    showMoveModal,
    showAddItemModal,
    selectedTote,
    showAddForm,
    showStats,
    showRoomManager,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTopModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeTopModal]);

  if (!accessGranted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
          <div className="text-6xl mb-4">🔐🐐</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Totes McGoats</h1>
          <p className="text-gray-500 mb-2">Enter your access details</p>
          <p className="text-xs text-gray-400 mb-6">Your username keeps your totes separate.</p>
          <div className="space-y-4">
            <input
              type="text"
              value={loginUserName}
              onChange={(e) => setLoginUserName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && completeLogin()}
              placeholder="Username"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg"
              autoFocus
            />
            {accessCode && (
              <input
                type="password"
                value={loginAccessCode}
                onChange={(e) => setLoginAccessCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && completeLogin()}
                placeholder="Access code"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg"
              />
            )}
            <label className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={setPinOnLogin}
                onChange={(e) => setSetPinOnLogin(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Set a PIN now
            </label>
            {setPinOnLogin && (
              <div className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && completeLogin()}
                  placeholder="Create PIN (min 4 digits)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg tracking-widest"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  value={loginPinConfirm}
                  onChange={(e) => setLoginPinConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && completeLogin()}
                  placeholder="Confirm PIN"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg tracking-widest"
                />
              </div>
            )}
            <label className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Remember me
            </label>
            <button
              onClick={completeLogin}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lock screen
  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
          <div className="text-6xl mb-4">🐐🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Totes McGoats</h1>
          <input
            type="password"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && unlockApp()}
            placeholder="Enter PIN"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl tracking-widest mb-4"
            autoFocus
          />
          <button
            onClick={unlockApp}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-b from-gray-50 to-gray-100'}`}>
      {/* PIN Settings Modal */}
      {showSetPin && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowSetPin(false)}
        >
          <div
            className={`${darkMode ? 'bg-gray-800' : 'bg-white'} w-full max-w-sm rounded-2xl p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <Lock className="inline w-5 h-5 mr-2" />
                  {storedPin ? 'Change PIN' : 'Set PIN'}
                </h2>
                <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Esc to close</div>
              </div>
              <button onClick={() => setShowSetPin(false)} className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New PIN (min 4 digits)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-xl tracking-widest"
              />
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-xl tracking-widest"
              />
              <button
                onClick={setAppPin}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold"
              >
                Save PIN
              </button>
              {storedPin && (
                <button
                  onClick={removePin}
                  className="w-full bg-red-100 text-red-600 py-3 rounded-xl font-semibold"
                >
                  Remove PIN
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500'} text-white sticky top-0 z-10 shadow-lg`}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-center mb-2">
            <span className="text-3xl animate-bounce">🐐</span>
            <h1 className="text-2xl font-bold ml-2">Totes McGoats</h1>
          </div>
          <p className="text-center text-white/80 text-sm mb-4">
            Organize by room, search by item, and snap a photo to auto-catalog.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            <div className="bg-white/15 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>👤</span>
              <span>{userName || 'Guest'}</span>
            </div>
            <button
              onClick={logout}
              className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl transition-all text-sm font-medium"
              title="Sign out"
            >
              Sign out
            </button>
            <button onClick={() => setShowSetPin(true)} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-all" title={storedPin ? 'Change PIN' : 'Set PIN'}>
              {storedPin ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </button>
            <button onClick={toggleDarkMode} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-all" title="Toggle Dark Mode">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setShowStats(true)} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-all" title="Statistics">
              <BarChart3 className="w-5 h-5" />
            </button>
            <button onClick={exportData} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-all" title="Export Data">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={() => importInputRef.current?.click()} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-all" title="Import Data">
              <Upload className="w-5 h-5" />
            </button>
            <input ref={importInputRef} type="file" accept=".json" onChange={importData} className="hidden" />
            <button onClick={() => setShowRoomManager(true)} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-all" title="Manage Rooms">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={() => setShowAddForm(true)} className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-semibold hover:bg-yellow-100 hover:text-indigo-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105">
              <Plus className="w-5 h-5" />
              New Tote
            </button>
          </div>
          <p className="text-center text-white/70 text-xs mb-4">Tip: Search by description, brand, color, or tag.</p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you looking for? 🔍"
                className={`w-full pl-10 pr-4 py-3 ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white/95 text-gray-800 placeholder-gray-400'} border-0 rounded-xl focus:ring-2 focus:ring-yellow-300 shadow-inner`}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'items')}
              className={`px-3 py-2 rounded-xl ${darkMode ? 'bg-gray-700 text-white' : 'bg-white/95 text-gray-800'} border-0 focus:ring-2 focus:ring-yellow-300`}
            >
              <option value="name">A-Z</option>
              <option value="date">Newest</option>
              <option value="items">Most Items</option>
            </select>
          </div>
        </div>
      </div>

      {/* Room Manager Modal */}
      {showRoomManager && (
        <div
          className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4"
          onClick={() => setShowRoomManager(false)}
        >
          <div
            className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>🏠</span> Manage Rooms
                </h2>
                <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Esc to close</div>
              </div>
              <button
                onClick={() => setShowRoomManager(false)}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Add Room */}
            <div className="mb-6">
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  className={`px-3 py-3 text-2xl border rounded-xl ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}
                >
                  {newRoomIcon}
                </button>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="New room name..."
                  className={`flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-800 placeholder-gray-400'}`}
                  onKeyDown={(e) => e.key === 'Enter' && addRoom()}
                />
                <button
                  onClick={addRoom}
                  disabled={!newRoomName.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-300 transition-all"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {ROOM_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewRoomIcon(icon)}
                    className={`w-9 h-9 text-lg rounded-lg transition-all ${newRoomIcon === icon ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Room List */}
            <div className="space-y-2">
              {rooms.length === 0 ? (
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} text-center py-8`}>No rooms yet. Add one above!</p>
              ) : (
                rooms.map(room => {
                  const toteCount = totes.filter(t => t.room === room.name).length;
                  return (
                    <div key={room.name} className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      {editingRoom === room.name ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={`px-3 py-2 text-xl border rounded-lg ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'}`}
                            >
                              {editRoomIcon}
                            </button>
                            <input
                              type="text"
                              value={editRoomName}
                              onChange={(e) => setEditRoomName(e.target.value)}
                              className={`flex-1 px-3 py-2 border rounded-lg ${darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-800'}`}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && updateRoom(room.name, editRoomName, editRoomIcon)}
                            />
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {ROOM_ICONS.map(icon => (
                              <button
                                key={icon}
                                type="button"
                                onClick={() => setEditRoomIcon(icon)}
                                className={`w-8 h-8 text-sm rounded-lg transition-all ${editRoomIcon === icon ? 'bg-indigo-100 ring-2 ring-indigo-500' : darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateRoom(room.name, editRoomName, editRoomIcon)}
                              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingRoom(null); setEditRoomName(''); setEditRoomIcon(''); }}
                              className="flex-1 px-3 py-2 bg-gray-300 rounded-lg text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{room.icon}</span>
                            <div>
                              <span className="font-medium">{room.name}</span>
                              <span className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>({toteCount} totes)</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setEditingRoom(room.name); setEditRoomName(room.name); setEditRoomIcon(room.icon); }}
                              className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:text-indigo-300 hover:bg-gray-600' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteRoom(room.name)}
                              className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:text-red-400 hover:bg-gray-600' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowRoomManager(false)}
                className={`w-full py-3 rounded-xl font-semibold ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div
          className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4"
          onClick={() => setShowStats(false)}
        >
          <div
            className={`${darkMode ? 'bg-gray-800' : 'bg-white'} w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}>
                  <BarChart3 className="w-6 h-6" /> Statistics
                </h2>
                <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Esc to close</div>
              </div>
              <button onClick={() => setShowStats(false)} className={`p-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-full`}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-indigo-50'} rounded-xl p-4 text-center`}>
                <div className="text-3xl font-bold text-indigo-500">{stats.totalTotes}</div>
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Totes</div>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-green-50'} rounded-xl p-4 text-center`}>
                <div className="text-3xl font-bold text-green-500">{stats.totalItems}</div>
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Items</div>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-purple-50'} rounded-xl p-4 text-center`}>
                <div className="text-3xl font-bold text-purple-500">{stats.totalRooms}</div>
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Rooms</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-700'} mb-3`}>Items by Room</h3>
              <div className="space-y-2">
                {stats.itemsByRoom.map(r => (
                  <div key={r.room} className={`flex items-center justify-between ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-3`}>
                    <span className="flex items-center gap-2">
                      <span>{r.icon}</span>
                      <span className={darkMode ? 'text-white' : 'text-gray-800'}>{r.room}</span>
                    </span>
                    <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{r.count} items</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-700'} mb-3`}>Top Tags</h3>
              <div className="flex flex-wrap gap-2">
                {stats.topTags.map(([tag, count]) => (
                  <span key={tag} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                    {tag} ({count})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Tote Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 z-30 flex items-end sm:items-center justify-center"
          onClick={closeAddForm}
        >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <span>📦</span> Add New Tote
                </h2>
                <div className="text-xs text-gray-500">Esc to close</div>
              </div>
              <button
                onClick={closeAddForm}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Step 1: Add a photo</p>
                <p className="text-xs text-gray-500">Use a clear shot so the AI can list items.</p>
              </div>
              {/* Photo Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:from-indigo-400 disabled:to-purple-400 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                {analyzing ? (
                  <>
                    <Sparkles className="w-6 h-6 animate-spin" />
                    <span>AI is analyzing your stuff...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    <span>{previewImage ? 'Retake Photo' : 'Add Photo of Items'}</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Image Preview */}
              {previewImage && (
                <img src={previewImage} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              )}

              {/* Analyzed Items */}
              {analyzedItems.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    Found {analyzedItems.length} item{analyzedItems.length !== 1 ? 's' : ''}!
                  </h3>
                  <p className="text-xs text-green-700 mb-2">Step 2: Review the list before saving.</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {analyzedItems.map((item, idx) => (
                      <p key={idx} className="text-sm text-green-700">• {item.description}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Tote Details */}
              {analyzedItems.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-gray-700">Step 3: Name it and pick a room</p>
                  <input
                    type="text"
                    value={currentTote}
                    onChange={(e) => setCurrentTote(e.target.value)}
                    placeholder="Tote label (e.g., Tote 1, Holiday Lights)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />

                  <select
                    value={currentRoom}
                    onChange={(e) => setCurrentRoom(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Choose a room...</option>
                    {rooms.map(room => (
                      <option key={room.name} value={room.name}>{room.icon} {room.name}</option>
                    ))}
                  </select>

                  {rooms.length === 0 && (
                    <p className="text-amber-600 text-sm">No rooms yet. Create one below to continue.</p>
                  )}

                  {rooms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowQuickRoom((prev) => !prev)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {showQuickRoom ? 'Hide quick room add' : 'Add a new room here'}
                    </button>
                  )}

                  {showQuickRoom || rooms.length === 0 ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 text-xl border border-indigo-200 rounded-lg bg-white"
                        >
                          {newRoomIcon}
                        </button>
                        <input
                          type="text"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          placeholder="Room name (e.g., Garage, Closet)"
                          className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg bg-white"
                          onKeyDown={(e) => e.key === 'Enter' && addRoomAndSelect()}
                        />
                        <button
                          onClick={addRoomAndSelect}
                          disabled={!newRoomName.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold disabled:bg-indigo-300"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ROOM_ICONS.map(icon => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setNewRoomIcon(icon)}
                            className={`w-8 h-8 text-sm rounded-lg transition-all ${newRoomIcon === icon ? 'bg-white ring-2 ring-indigo-500 scale-110' : 'hover:bg-white'}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <button
                    onClick={saveTote}
                    disabled={!currentTote || !currentRoom}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 disabled:from-gray-300 disabled:to-gray-300 transition-all shadow-md hover:shadow-lg"
                  >
                    🐐 Save Tote
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tote Detail Modal */}
      {selectedTote && (
        <div
          className="fixed inset-0 bg-black/50 z-30 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedTote(null)}
        >
          <div
            className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tote Image Header */}
            {selectedTote.imageUrl && (
              <div className="relative">
                <img src={selectedTote.imageUrl} alt={selectedTote.number} className="w-full h-48 object-cover" />
                <button
                  onClick={() => setSelectedTote(null)}
                  className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="p-6">
              {!selectedTote.imageUrl && (
                <div className="flex justify-between items-start mb-4">
                  <div />
                  <button onClick={() => setSelectedTote(null)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              )}

            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedTote.number}</h2>
                <div className="text-xs text-gray-500">Esc to close</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg">{getRoomIcon(selectedTote.room)}</span>
                  <select
                    value={selectedTote.room}
                      onChange={(e) => updateToteRoom(selectedTote.id, e.target.value)}
                      className="text-gray-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                    >
                      {rooms.map(r => <option key={r.name} value={r.name}>{r.icon} {r.name}</option>)}
                    </select>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-sm">{selectedTote.date}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${selectedTote.number}?`)) {
                      deleteTote(selectedTote.id);
                    }
                  }}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700">{selectedTote.items.length} Items</h3>
                <div className="flex gap-2">
                  {bulkMode && selectedItems.size > 0 && (
                    <button onClick={bulkDeleteItems} className="text-red-600 text-sm font-medium flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-lg">
                      <Trash2 className="w-4 h-4" /> Delete ({selectedItems.size})
                    </button>
                  )}
                  <button
                    onClick={() => { setBulkMode(!bulkMode); setSelectedItems(new Set()); }}
                    className={`text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg ${bulkMode ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Check className="w-4 h-4" /> {bulkMode ? 'Done' : 'Select'}
                  </button>
                  <button
                    onClick={() => { setAddItemToteId(selectedTote.id); setShowAddItemModal(true); }}
                    className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedTote.items.map((item, idx) => {
                  const itemKey = `${selectedTote.id}:${idx}`;
                  const isSelected = selectedItems.has(itemKey);
                  const isEditing = editingItem?.toteId === selectedTote.id && editingItem?.itemIndex === idx;

                  return (
                    <div key={idx} className={`bg-gray-50 rounded-xl p-4 ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}>
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editItemDescription}
                            onChange={(e) => setEditItemDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Description"
                          />
                          <input
                            type="text"
                            value={editItemTags}
                            onChange={(e) => setEditItemTags(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Tags (comma-separated)"
                          />
                          <div className="flex gap-2">
                            <button onClick={saveItemEdit} className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">Save</button>
                            <button onClick={() => setEditingItem(null)} className="flex-1 px-3 py-2 bg-gray-300 rounded-lg text-sm font-medium">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-start gap-3">
                              {bulkMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleItemSelection(selectedTote.id, idx)}
                                  className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              )}
                              <p className="font-medium text-gray-800">{item.description}</p>
                            </div>
                            {!bulkMode && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { setEditingItem({ toteId: selectedTote.id, itemIndex: idx }); setEditItemDescription(item.description); setEditItemTags(item.tags.join(', ')); }}
                                  className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-lg"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setMovingItem({ toteId: selectedTote.id, itemIndex: idx, item }); setShowMoveModal(true); }}
                                  className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg"
                                >
                                  <Move className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { if (confirm(`Delete "${item.description}"?`)) deleteItem(selectedTote.id, idx); }}
                                  className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className={`flex flex-wrap gap-1.5 ${bulkMode ? 'ml-8' : ''}`}>
                            {item.tags.map((tag, tagIdx) => (
                              <span key={tagIdx} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
          onClick={closeAddItemModal}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Add Item</h2>
                <div className="text-xs text-gray-500">Esc to close</div>
              </div>
              <button onClick={closeAddItemModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                placeholder="Item description..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <input
                type="text"
                value={newItemTags}
                onChange={(e) => setNewItemTags(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addItemToTote}
                disabled={!newItemDescription.trim()}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 transition-all"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Item Modal */}
      {showMoveModal && movingItem && (
        <div
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
          onClick={closeMoveModal}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Move Item</h2>
                <div className="text-xs text-gray-500">Esc to close</div>
              </div>
              <button onClick={closeMoveModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">{movingItem.item.description}</p>
            <div className="space-y-2">
              {totes.filter(t => t.id !== movingItem.toteId).map(tote => (
                <button
                  key={tote.id}
                  onClick={() => moveItem(movingItem.toteId, movingItem.itemIndex, tote.id)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-colors"
                >
                  <div className="font-medium text-gray-800">{tote.number}</div>
                  <div className="text-sm text-gray-500">{tote.room} • {tote.items.length} items</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Grid of Totes */}
      <div className="p-4">
        {filteredTotes.length === 0 ? (
          <div className="text-center py-16">
            {totes.length === 0 ? (
              <>
                <div className="text-7xl mb-4 animate-pulse">🐐</div>
                <p className="text-2xl font-bold text-gray-700 mb-2">Start your first tote</p>
                <p className="text-gray-500 mb-6">Create a room, snap a photo, and save your first set of items.</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowRoomManager(true)}
                    className="px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium hover:from-gray-200 hover:to-gray-300 transition-all shadow-md"
                  >
                    🏠 Create a Room
                  </button>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg hover:scale-105"
                  >
                    📦 New Tote
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">🐐❓</div>
                <p className="text-xl text-gray-500">Hmm, no results for "{searchQuery}"</p>
                <p className="text-gray-400 mt-2">Try fewer words or a tag like "red" or "tools".</p>
              </>
            )}
          </div>
        ) : searchQuery ? (
          /* Search Results View - Show matching items */
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">{filteredTotes.length} tote{filteredTotes.length !== 1 ? 's' : ''} found</p>
            {filteredTotes.map(({ tote, matchingItems }) => (
              <div key={tote.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
                <button
                  onClick={() => setSelectedTote(tote)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {tote.imageUrl ? (
                    <img src={tote.imageUrl} alt={tote.number} className="w-16 h-16 object-cover rounded-xl" />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center">
                      <Package className="w-8 h-8 text-indigo-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800">{tote.number}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <span>{getRoomIcon(tote.room)}</span>
                      {tote.room} • {tote.items.length} items
                    </p>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </button>

                {/* Show matching items */}
                {matchingItems.length > 0 && (
                  <div className="border-t border-gray-100 p-4 bg-yellow-50">
                    <p className="text-xs font-semibold text-yellow-700 mb-2">
                      {matchingItems.length} matching item{matchingItems.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="space-y-2">
                      {matchingItems.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-yellow-200">
                          <p className="font-medium text-gray-800 text-sm">{item.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.slice(0, 5).map((tag, tagIdx) => (
                              <span key={tagIdx} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                            {item.tags.length > 5 && (
                              <span className="text-xs text-gray-400">+{item.tags.length - 5} more</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Grid View - No search */
          <div className="space-y-8">
            {Object.entries(totesByRoom).map(([room, roomResults]) => (
              <div key={room}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{getRoomIcon(room)}</span>
                  <h2 className="text-xl font-bold text-gray-800">{room}</h2>
                  <span className="text-gray-400">({roomResults.length})</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {roomResults.map(({ tote }) => (
                    <ToteCard
                      key={tote.id}
                      tote={tote}
                      onClick={() => setSelectedTote(tote)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
