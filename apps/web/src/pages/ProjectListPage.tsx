import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useCreateProject } from '../hooks/useProjects';

export default function ProjectListPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ New Project</button>
      </div>
      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createProject.mutate({ name }, { onSuccess: () => { setShowForm(false); setName(''); } }); }} className="flex gap-2 mb-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ten project" className="border rounded px-3 py-2 flex-1" required />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Tao</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2">Huy</button>
        </form>
      )}
      <div className="space-y-2">
        {projects?.map((p) => (
          <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow">
            <h2 className="font-semibold">{p.name}</h2>
            {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
