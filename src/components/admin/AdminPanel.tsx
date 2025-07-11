/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '~/components/ui/Button';

interface AdminPanelProps {
  className?: string;
}

type TabType = 'users' | 'vibes' | 'debug';
type DataSource = { source: string; data?: Record<string, unknown>; loading?: boolean; error?: string };

export function AdminPanel({ className = '' }: AdminPanelProps) {
  // Usar uma ref para garantir que não ocorra loop
  const initialized = useRef(false);

  // Estados locais - não usar seletores do Zustand diretamente
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugData, setDebugData] = useState<DataSource | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [jsonFilter, setJsonFilter] = useState('');
  const [sortedData, setSortedData] = useState<Record<string, unknown>[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Inicializar dados do sessionStorage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      // Ler configuração do sessionStorage
      const storageData = sessionStorage.getItem('timbra-root-store');
      if (!storageData) return;

      const parsedData = JSON.parse(storageData);

      // Configurar estados locais
      setIsAdmin(!!parsedData?.admin?.isAdmin);
      setAccessToken(parsedData?.auth?.accessToken || null);

      // Configurar listener para atualizações de admin
      const handleAdminUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<{ isAdmin: boolean }>;
        if (customEvent.detail?.isAdmin) {
          setIsAdmin(true);
        }
      };

      // Adicionar listener para evento personalizado
      window.addEventListener('set-admin-status', handleAdminUpdate as EventListener);

      // Listener para alternar painel
      const handleTogglePanel = () => {
        setShowDebugPanel(prev => !prev);
      };

      window.addEventListener('toggle-debug-panel', handleTogglePanel);

      return () => {
        window.removeEventListener('set-admin-status', handleAdminUpdate as EventListener);
        window.removeEventListener('toggle-debug-panel', handleTogglePanel);
      };
    } catch (error) {
      console.error('Error initializing AdminPanel:', error);
    }
  }, []);

  // Alternar painel de depuração
  const togglePanel = useCallback(() => {
    setShowDebugPanel(prev => !prev);
  }, []);

  // Fetch user list
  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;

    try {
      setDebugData({ source: 'users', loading: true });

      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setDebugData({ source: 'users', data: data as Record<string, unknown> });
      setSortedData((data.users || []) as Record<string, unknown>[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      setDebugData({
        source: 'users',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [accessToken]);

  // Fetch vibes data
  const fetchVibesData = useCallback(async () => {
    if (!accessToken) return;

    try {
      setDebugData({ source: 'vibes', loading: true });

      const response = await fetch('/api/admin/vibes', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch vibes data');

      const data = await response.json();
      setDebugData({ source: 'vibes', data: data as Record<string, unknown> });
      setSortedData((data.vibes || []) as Record<string, unknown>[]);
    } catch (error) {
      console.error('Error fetching vibes:', error);
      setDebugData({
        source: 'vibes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [accessToken]);

  // Load store state for debugging
  const loadStoreState = useCallback(() => {
    try {
      // Ler configuração do sessionStorage
      const storageData = sessionStorage.getItem('timbra-root-store');
      if (!storageData) return;

      const parsedData = JSON.parse(storageData);

      setDebugData({ source: 'store', data: parsedData as Record<string, unknown> });
      setSortedData([parsedData as Record<string, unknown>]);
    } catch (error) {
      console.error('Error loading store state:', error);
      setDebugData({
        source: 'store',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  // Change active tab
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);

    switch (tab) {
      case 'users':
        fetchUsers();
        break;
      case 'vibes':
        fetchVibesData();
        break;
      case 'debug':
        loadStoreState();
        break;
    }
  }, [fetchUsers, fetchVibesData, loadStoreState]);

  // Initial data load
  useEffect(() => {
    if (isAdmin && showDebugPanel && activeTab && sortedData.length === 0) {
      handleTabChange(activeTab);
    }
  }, [isAdmin, showDebugPanel, activeTab, sortedData.length, handleTabChange]);

  // Não renderizar se não for admin
  if (!isAdmin) return null;

  // Filter JSON data
  const filterJson = (data: Record<string, unknown>, filter: string): unknown => {
    if (!filter.trim()) return data;

    try {
      // Allow dot notation, like "user.fid" to drill down
      const parts = filter.split('.');
      let result = JSON.parse(JSON.stringify(data)); // Deep copy

      for (const part of parts) {
        if (result && typeof result === 'object' && part in (result as Record<string, unknown>)) {
          result = (result as Record<string, unknown>)[part];
        } else {
          return null;
        }
      }

      return result;
    } catch (e) {
      console.error('Error filtering JSON:', e);
      return data;
    }
  };

  return (
    <div className={`bg-slate-900 text-white p-4 rounded-lg shadow-lg ${showDebugPanel ? 'block' : 'hidden'} ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl">Admin Panel</h2>
        <Button
          onClick={togglePanel}
          className="bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs"
        >
          Close
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 mb-4">
        <button
          className={`px-4 py-2 ${activeTab === 'users' ? 'bg-purple-800 text-white' : 'text-slate-400'}`}
          onClick={() => handleTabChange('users')}
        >
          Users
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'vibes' ? 'bg-purple-800 text-white' : 'text-slate-400'}`}
          onClick={() => handleTabChange('vibes')}
        >
          Vibes
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'debug' ? 'bg-purple-800 text-white' : 'text-slate-400'}`}
          onClick={() => handleTabChange('debug')}
        >
          Debug
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by key path (e.g. 'users.0.fid')"
          className="w-full px-3 py-2 bg-slate-800 text-white border border-slate-700 rounded"
          value={jsonFilter}
          onChange={(e) => setJsonFilter(e.target.value)}
        />
      </div>

      {/* Data display */}
      <div className="bg-slate-800 p-4 rounded overflow-auto max-h-[70vh]">
        {debugData?.loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        ) : debugData?.error ? (
          <div className="text-red-400 bg-red-900/20 p-4 rounded">
            Error: {debugData.error}
          </div>
        ) : (
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
            {sortedData && sortedData.length > 0
              ? JSON.stringify(
                jsonFilter ? filterJson(sortedData as Record<string, unknown>, jsonFilter) : sortedData,
                null,
                2
              )
              : 'No data available'}
          </pre>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex space-x-2">
        <Button
          onClick={() => handleTabChange(activeTab)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Refresh Data
        </Button>
        <Button
          onClick={() => {
            const dataStr = JSON.stringify(sortedData, null, 2);
            const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
            const link = document.createElement('a');
            link.setAttribute('href', dataUri);
            link.setAttribute('download', `${activeTab}-${new Date().toISOString()}.json`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="bg-slate-700 hover:bg-slate-600"
        >
          Export JSON
        </Button>
      </div>
    </div>
  );
}

export default AdminPanel;