import { useState, useEffect } from 'react';
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { AdminPortal } from '@/components/admin/AdminPortal';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isAdminRoute =
    currentPath === '/admin' ||
    currentPath === '/super-admin' ||
    currentPath.startsWith('/admin/') ||
    window.location.search.includes('route=admin');

  if (isAdminRoute) {
    return <AdminPortal />;
  }

  return <WorkspaceLayout />;
}
