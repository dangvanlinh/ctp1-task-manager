import { useState } from 'react';
import type { TaskDto, UserDto, BuildDto } from '@ctp1/shared';

interface Props {
  task?: TaskDto;
  users: UserDto[];
  builds: BuildDto[];
  projectId: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function TaskForm({ task, users, builds, projectId, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState(task?.priority ?? 'MEDIUM');
  const [startDate, setStartDate] = useState(task?.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(task?.endDate?.slice(0, 10) ?? '');
  const [week, setWeek] = useState(task?.week ?? 1);
  const [buildId, setBuildId] = useState(task?.buildId ?? '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');

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
            buildId,
            assigneeId,
            projectId,
          });
        }}
        className="bg-white rounded-lg p-6 w-[480px] max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <h2 className="text-lg font-bold mb-4">{task ? 'Sua Task' : 'Tao Task'}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ten task</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mo ta</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded px-3 py-2" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tuan</label>
              <select value={week} onChange={(e) => setWeek(+e.target.value)} className="w-full border rounded px-3 py-2">
                <option value={1}>Tuan 1</option>
                <option value={2}>Tuan 2</option>
                <option value={3}>Tuan 3</option>
                <option value={4}>Tuan 4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full border rounded px-3 py-2">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Build</label>
            <select value={buildId} onChange={(e) => setBuildId(e.target.value)} className="w-full border rounded px-3 py-2" required>
              <option value="">Chon build</option>
              {builds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full border rounded px-3 py-2" required>
              <option value="">Chon member</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded border hover:bg-gray-50">Huy</button>
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">{task ? 'Cap nhat' : 'Tao'}</button>
        </div>
      </form>
    </div>
  );
}
