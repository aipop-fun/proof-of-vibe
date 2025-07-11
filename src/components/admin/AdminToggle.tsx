"use client";

import { useState, useEffect, useRef } from 'react';

export function AdminToggle() {
  // Para evitar loop de renderização, usar apenas estado local
  const [isAdmin, setIsAdmin] = useState(false);
  const initialized = useRef(false);

  // Inicializar estado de admin a partir de sessionStorage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      // Obter dados do sessionStorage
      const storageData = sessionStorage.getItem('timbra-root-store');
      if (!storageData) return;

      const parsedData = JSON.parse(storageData);
      setIsAdmin(!!parsedData?.admin?.isAdmin);

      // Adicionar listener para evento de atualização de admin
      const handleAdminUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<{ isAdmin: boolean }>;
        if (customEvent.detail?.isAdmin) {
          setIsAdmin(true);
        }
      };

      window.addEventListener('set-admin-status', handleAdminUpdate as EventListener);

      return () => {
        window.removeEventListener('set-admin-status', handleAdminUpdate as EventListener);
      };
    } catch (error) {
      console.error('Error initializing AdminToggle:', error);
    }
  }, []);

  // Função para alternar o painel de debug via evento customizado
  const toggleDebugPanel = () => {
    // Disparar evento para notificar o AdminPanel
    window.dispatchEvent(new Event('toggle-debug-panel'));
  };

  // Não renderizar se não for admin
  if (!isAdmin) return null;

  return (
    <button
      onClick={toggleDebugPanel}
      className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors z-50"
      title="Toggle Admin Panel"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4V4C8 4 4 8 4 12V20C4 20 8 20 12 20C16 20 20 20 20 20V12C20 8 16 4 12 4Z"></path>
        <path d="M9 15L12 12L15 15"></path>
        <path d="M12 12V18"></path>
      </svg>
    </button>
  );
}

export default AdminToggle;