/** NAVY ay internal routes (mounted under /navy/* in AppLayout). */
import { Navigate, Route, Routes } from 'react-router-dom';
import NavyHomePage from './NavyHomePage';

export default function NavyRoutes() {
  return (
    <Routes>
      <Route index element={<NavyHomePage />} />
      <Route path="*" element={<Navigate to="/navy" replace />} />
    </Routes>
  );
}
