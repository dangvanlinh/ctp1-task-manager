import { useState, useCallback } from 'react';

interface BacklogItem {
  id: string;
  text: string;
  done: boolean;
}

function getKey(projectId: string) {
  return `backlog-${projectId}`;
}

function load(projectId: string): BacklogItem[] {
  try {
    const raw = localStorage.getItem(getKey(projectId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function save(projectId: string, items: BacklogItem[]) {
  try { localStorage.setItem(getKey(projectId), JSON.stringify(items)); } catch { /* ignore */ }
}

export default function BacklogBox({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<BacklogItem[]>(() => load(projectId));
  const [collapsed, setCollapsed] = useState(false);
  const [newText, setNewText] = useState('');

  const update = useCallback((updater: (prev: BacklogItem[]) => BacklogItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      save(projectId, next);
      return next;
    });
  }, [projectId]);

  const addItem = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    update((prev) => [...prev, { id: Date.now().toString(), text: trimmed, done: false }]);
    setNewText('');
  };

  const toggleDone = (id: string) => {
    update((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  };

  const removeItem = (id: string) => {
    update((prev) => prev.filter((item) => item.id !== id));
  };

  const editItem = (id: string, text: string) => {
    update((prev) => prev.map((item) => item.id === id ? { ...item, text } : item));
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="flex items-center px-4 py-2 border-b bg-gradient-to-r from-amber-50 to-orange-50 gap-2">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700 text-xs">
          {collapsed ? '▶' : '▼'}
        </button>
        <h2 className="font-semibold text-gray-700 text-sm">📋 Backlog</h2>
        <span className="text-[10px] text-gray-400">{items.filter((i) => !i.done).length} items</span>
      </div>
      {!collapsed && (
        <div className="px-4 py-3">
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group/bl text-xs">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleDone(item.id)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 flex-shrink-0"
                />
                <input
                  value={item.text}
                  onChange={(e) => editItem(item.id, e.target.value)}
                  className={`flex-1 bg-transparent outline-none border-0 px-1 py-0.5 hover:bg-gray-50 rounded ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover/bl:opacity-100 text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
              placeholder="Thêm backlog item..."
              className="flex-1 text-xs border rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-gray-50"
            />
            <button
              onClick={addItem}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5"
            >
              + Thêm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
