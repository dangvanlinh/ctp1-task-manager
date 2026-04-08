import { Routes, Route, Navigate } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-2xl font-bold">CTP1 Task Manager</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
