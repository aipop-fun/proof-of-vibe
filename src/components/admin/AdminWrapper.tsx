"use client";

import dynamic from 'next/dynamic';
import { AdminCheck } from './AdminCheck';
import StoreEventListeners from './StoreEventListeners';

// Import admin components dinamicamente com SSR desativado
const AdminToggle = dynamic(() => import('./AdminToggle').then(mod => ({ default: mod.AdminToggle })),
  { ssr: false }
);
const AdminPanel = dynamic(() => import('./AdminPanel').then(mod => ({ default: mod.AdminPanel })),
  { ssr: false }
);

interface AdminWrapperProps {
  className?: string;
}

export function AdminWrapper({ className = '' }: AdminWrapperProps) {
  return (
    <>
      {/* Listener para eventos do store */}
      <StoreEventListeners />

      {/* Verificador de admin que usa uma abordagem isolada */}
      <AdminCheck />

      {/* Componentes UI para admin */}
      <AdminToggle />
      <AdminPanel className={`fixed top-0 left-0 right-0 bottom-0 z-50 m-4 ${className}`} />
    </>
  );
}

export default AdminWrapper;