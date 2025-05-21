"use client";

import { useEffect } from 'react';
import { useStore } from '~/lib/stores/rootStore';

// Este componente escuta eventos personalizados e atualiza o store
export function StoreEventListeners() {
    const store = useStore();

    useEffect(() => {
        // Handler para o evento set-admin-status
        const handleSetAdminStatus = (event: Event) => {
            const customEvent = event as CustomEvent<{ isAdmin: boolean }>;
            if (customEvent.detail?.isAdmin) {
                store.setAdmin(true);
            }
        };

        // Handler para alternar o painel de debug
        const handleToggleDebugPanel = () => {
            store.toggleDebugPanel();
        };

        // Adicionar listeners
        window.addEventListener('set-admin-status', handleSetAdminStatus as EventListener);
        window.addEventListener('toggle-debug-panel', handleToggleDebugPanel);

        // Cleanup
        return () => {
            window.removeEventListener('set-admin-status', handleSetAdminStatus as EventListener);
            window.removeEventListener('toggle-debug-panel', handleToggleDebugPanel);
        };
    }, [store]);

    return null;
}

export default StoreEventListeners;