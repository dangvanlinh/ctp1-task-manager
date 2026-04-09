import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface KPI {
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
}

interface RevenueItem {
  name: string;
  value: number;
  color: string;
}

const STORAGE_KEY = 'perfOverview';

interface PerfData {
  runrateRev: string;
  a1_30d: string;
  n1_30d: string;
  revenueItems: RevenueItem[];
}

const DEFAULT_REVENUE: RevenueItem[] = [
  { name: 'Bán NV', value: 35, color: '#22c55e' },
  { name: 'Bán Trang sức', value: 25, color: '#eab308' },
  { name: 'Đấu trường', value: 15, color: '#f97316' },
  { name: 'VIP Sub', value: 12, color: '#3b82f6' },
  { name: 'IAP khác', value: 13, color: '#8b5cf6' },
];

function loadPerfData(): PerfData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    runrateRev: '2.8B',
    a1_30d: '12,500',
    n1_30d: '3,200',
    revenueItems: DEFAULT_REVENUE,
  };
}

function savePerfData(data: PerfData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export default function PerformanceOverview() {
  const [data, setData] = useState<PerfData>(loadPerfData);
  const [collapsed, setCollapsed] = useState(false);
  const [editingKpi, setEditingKpi] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const updateField = (field: keyof PerfData, value: string) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      savePerfData(next);
      return next;
    });
  };

  const updateRevenueItem = (index: number, field: 'name' | 'value', value: string) => {
    setData((prev) => {
      const items = [...prev.revenueItems];
      if (field === 'value') {
        items[index] = { ...items[index], value: Number(value) || 0 };
      } else {
        items[index] = { ...items[index], name: value };
      }
      const next = { ...prev, revenueItems: items };
      savePerfData(next);
      return next;
    });
  };

  const addRevenueItem = () => {
    const colors = ['#ec4899', '#14b8a6', '#f43f5e', '#06b6d4', '#84cc16'];
    setData((prev) => {
      const items = [...prev.revenueItems, { name: 'Mới', value: 5, color: colors[prev.revenueItems.length % colors.length] }];
      const next = { ...prev, revenueItems: items };
      savePerfData(next);
      return next;
    });
  };

  const removeRevenueItem = (index: number) => {
    setData((prev) => {
      const items = prev.revenueItems.filter((_, i) => i !== index);
      const next = { ...prev, revenueItems: items };
      savePerfData(next);
      return next;
    });
  };

  const total = useMemo(() => data.revenueItems.reduce((s, i) => s + i.value, 0), [data.revenueItems]);

  const kpis: KPI[] = [
    { label: 'Runrate Rev', value: data.runrateRev, change: '+12%', changeType: 'up' },
    { label: 'A1 (30 ngày)', value: data.a1_30d, change: '+5%', changeType: 'up' },
    { label: 'N1 (30 ngày)', value: data.n1_30d, change: '-2%', changeType: 'down' },
  ];

  const kpiFields: (keyof PerfData)[] = ['runrateRev', 'a1_30d', 'n1_30d'];

  const now = new Date();
  const dayOfMonth = now.getDate();
  const monthName = now.toLocaleString('vi-VN', { month: 'long' });

  return (
    <div className="bg-white border rounded-lg mb-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700">
            {collapsed ? '▶' : '▼'}
          </button>
          <h2 className="font-semibold text-gray-700">📊 Performance Overview</h2>
          <span className="text-xs text-gray-400">{monthName} (ngày 1 → {dayOfMonth})</span>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 py-3">
          <div className="flex gap-6">
            {/* KPI Cards */}
            <div className="flex gap-3 flex-shrink-0">
              {kpis.map((kpi, i) => (
                <div key={kpi.label} className="bg-gray-50 rounded-lg px-4 py-3 min-w-[140px] border">
                  <div className="text-xs text-gray-500 font-medium mb-1">{kpi.label}</div>
                  {editingKpi === kpiFields[i] ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { updateField(kpiFields[i], editValue); setEditingKpi(null); }
                        if (e.key === 'Escape') setEditingKpi(null);
                      }}
                      onBlur={() => { updateField(kpiFields[i], editValue); setEditingKpi(null); }}
                      className="text-xl font-bold text-gray-800 bg-white border rounded px-1 w-full outline-none focus:border-blue-400"
                    />
                  ) : (
                    <div
                      className="text-xl font-bold text-gray-800 cursor-pointer hover:text-blue-600"
                      onDoubleClick={() => { setEditingKpi(kpiFields[i]); setEditValue(data[kpiFields[i]] as string); }}
                      title="Double-click để sửa"
                    >
                      {kpi.value}
                    </div>
                  )}
                  {kpi.change && (
                    <div className={`text-xs mt-0.5 font-medium ${kpi.changeType === 'up' ? 'text-green-600' : kpi.changeType === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                      {kpi.change} vs tháng trước
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            <div className="flex-1 flex items-center gap-4 min-w-0">
              <div className="w-[180px] h-[140px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.revenueItems}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={30}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {data.revenueItems.map((item, index) => (
                        <Cell key={index} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${((value / total) * 100).toFixed(1)}%`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue legend + editable */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-semibold mb-1.5">Phân bổ Rev theo mặt hàng</div>
                <div className="space-y-1">
                  {data.revenueItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm group/rev">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <input
                        value={item.name}
                        onChange={(e) => updateRevenueItem(i, 'name', e.target.value)}
                        className="bg-transparent border-0 outline-none text-gray-700 font-medium w-20 hover:bg-gray-100 rounded px-0.5"
                      />
                      <input
                        value={item.value}
                        onChange={(e) => updateRevenueItem(i, 'value', e.target.value)}
                        className="bg-transparent border-0 outline-none text-gray-500 w-10 text-right hover:bg-gray-100 rounded px-0.5"
                        type="number"
                      />
                      <span className="text-xs text-gray-400">{((item.value / total) * 100).toFixed(0)}%</span>
                      <button
                        onClick={() => removeRevenueItem(i)}
                        className="opacity-0 group-hover/rev:opacity-100 text-red-400 hover:text-red-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button onClick={addRevenueItem} className="text-xs text-blue-500 hover:text-blue-700 mt-1">+ Thêm</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
