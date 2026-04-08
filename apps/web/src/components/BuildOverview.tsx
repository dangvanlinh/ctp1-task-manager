import type { BuildDto } from '@ctp1/shared';

interface Props {
  builds: BuildDto[];
  onAddBuild: () => void;
}

export default function BuildOverview({ builds, onAddBuild }: Props) {
  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-700">Builds thang nay</h2>
        <button onClick={onAddBuild} className="text-sm text-blue-600 hover:text-blue-800">+ Them Build</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {builds.map((b) => (
          <span key={b.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{b.name}</span>
        ))}
        {builds.length === 0 && <span className="text-sm text-gray-400">Chua co build nao</span>}
      </div>
    </div>
  );
}
