import { useState } from 'react';
import type { UserDto } from '@ctp1/shared';

interface MilestoneInput {
  name: string;
  date: string;
  type: string;
}

interface Props {
  users: UserDto[];
  projectId: string;
  month: number;
  year: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const MILESTONE_TYPES = [
  { value: 'REVIEW', label: 'Review' },
  { value: 'BUILD', label: 'Build' },
  { value: 'SENDOUT', label: 'Sendout' },
  { value: 'LIVE', label: 'Live' },
];

export default function BuildForm({ users, projectId, month, year, onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { name: 'Build 1', date: '', type: 'BUILD' },
    { name: 'Live', date: '', type: 'LIVE' },
  ]);
  const [endDate, setEndDate] = useState('');

  const addMilestone = () => {
    setMilestones([...milestones, { name: '', date: '', type: 'BUILD' }]);
  };

  const removeMilestone = (idx: number) => {
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  const updateMilestone = (idx: number, field: keyof MilestoneInput, value: string) => {
    const updated = [...milestones];
    updated[idx] = { ...updated[idx], [field]: value };
    setMilestones(updated);
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validMilestones = milestones.filter((m) => m.name && m.date);
    const liveMilestone = validMilestones.find((m) => m.type === 'LIVE');
    const sortedMs = [...validMilestones].sort((a, b) => a.date.localeCompare(b.date));
    const startDate = sortedMs.length ? sortedMs[0].date : undefined;
    const liveDate = liveMilestone?.date;

    onSubmit({
      name,
      projectId,
      month,
      year,
      startDate,
      liveDate,
      endDate: endDate || undefined,
      assigneeIds,
      milestones: validMilestones,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-[560px] max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-lg font-bold mb-4">Tạo Build</h2>
        <div className="space-y-4">
          {/* Build name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên Build</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ trách</label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    assigneeIds.includes(u.id)
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Milestones</label>
            <div className="space-y-2">
              {milestones.map((ms, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={ms.type}
                    onChange={(e) => updateMilestone(idx, 'type', e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm w-28"
                  >
                    {MILESTONE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    value={ms.name}
                    onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                    placeholder="Tên milestone"
                    className="border rounded px-2 py-1.5 text-sm flex-1"
                    required
                  />
                  <input
                    type="date"
                    value={ms.date}
                    onChange={(e) => updateMilestone(idx, 'date', e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm"
                    required
                  />
                  {milestones.length > 1 && (
                    <button type="button" onClick={() => removeMilestone(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addMilestone} className="text-sm text-blue-500 hover:text-blue-700 mt-2">
              + Thêm milestone
            </button>
          </div>

          {/* End date (post-live) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc (post-live) <span className="text-gray-400">(tuỳ chọn)</span></label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded border hover:bg-gray-50">Huỷ</button>
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Tạo</button>
        </div>
      </form>
    </div>
  );
}
