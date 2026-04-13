import { useState, useMemo } from 'react';
import type { TaskDto, UserDto, BuildDto } from '@ctp1/shared';
import { getWeeksInMonth } from '../utils/weekUtils';

interface Props {
  task?: TaskDto;
  users: UserDto[];
  builds: BuildDto[];
  projectId: string;
  month: number;
  year: number;
  defaultAssigneeId?: string;
  defaultWeek?: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function TaskForm({ task, users, builds, projectId, month, year, defaultAssigneeId, defaultWeek, onSubmit, onCancel }: Props) {
  const weeks = useMemo(() => getWeeksInMonth(month, year), [month, year]);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState(task?.priority ?? 'MEDIUM');
  const [startDate, setStartDate] = useState(task?.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(task?.endDate?.slice(0, 10) ?? '');
  const [week, setWeek] = useState(task?.week ?? defaultWeek ?? 1);
  const [buildId, setBuildId] = useState(task?.buildId ?? '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? defaultAssigneeId ?? '');

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...(task ? { id: task.id } : {}),
            title,
            description: description || undefined,
            priority,
            startDate,
            endDate,
            week,
            buildId: buildId || undefined,
            assigneeId,
            projectId,
          });
        }}
        className="bg-white rounded-lg p-6 w-[480px] max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <h2 className="text-lg font-bold mb-4">{task ? 'Sửa Task' : 'Tạo Task'}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên task</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded px-3 py-2" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tuần</label>
              <select value={week} onChange={(e) => setWeek(+e.target.value)} className="w-full border rounded px-3 py-2">
                {weeks.map((w) => (
                  <option key={w.week} value={w.week}>Tuần {w.week} (ngày {w.startDay}-{w.endDay})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Độ ưu tiên</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full border rounded px-3 py-2">
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Build <span className="text-gray-400">(optional)</span></label>
            <select value={buildId} onChange={(e) => setBuildId(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">Không chọn</option>
              {builds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full border rounded px-3 py-2" required>
              <option value="">Chọn thành viên</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded border hover:bg-gray-50">Huỷ</button>
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">{task ? 'Cập nhật' : 'Tạo'}</button>
        </div>
      </form>
    </div>
  );
}
