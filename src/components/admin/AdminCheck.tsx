"use client";

import { useState, useRef, useEffect } from 'react';

// IMPORTANTE: Este componente não deve importar nenhum seletor do Zustand diretamente
// Em vez disso, ele acessa o store diretamente via window
export function AdminCheck() {
    // Usar uma ref para evitar múltiplas atualizações
    const hasChecked = useRef(false);

    // Usar useState para forçar uma única renderização
    const [, forceRender] = useState({});

    // Executar a lógica apenas uma vez
    useEffect(() => {
        // Se já verificou, pular
        if (hasChecked.current) return;

        // Marcar como verificado para evitar múltiplas execuções
        hasChecked.current = true;

        // Acessar store diretamente via window para evitar loops de seletor
        const checkAdmin = async () => {
            try {
                // Verificar se temos acesso ao store de uma forma segura
                if (typeof window === 'undefined') return;

                // Esperar um tempo antes de verificar
                await new Promise(resolve => setTimeout(resolve, 100));

                // Forçar uma renderização para garantir que os dados mais recentes estejam disponíveis
                forceRender({});

                // Obter dados do sessionStorage para verificação de admin
                const storageData = sessionStorage.getItem('timbra-root-store');
                if (!storageData) return;

                // Analisar dados
                const parsedData = JSON.parse(storageData);

                // Verificar se o usuário está autenticado e tem informações
                if (!parsedData?.auth?.isAuthenticated || !parsedData?.auth?.user) return;

                // Obter informações para verificação de admin
                const adminUsers = process.env.NEXT_PUBLIC_ADMIN_USERS?.split(',') || [];
                const user = parsedData.auth.user;
                const userFid = user?.fid?.toString();
                const userSpotifyId = user?.spotifyId;

                // Verificar se o usuário é admin
                const isUserAdmin =
                    adminUsers.includes(userFid || '') ||
                    adminUsers.includes(userSpotifyId || '');

                // Se for admin e não estiver definido no store, atualizar
                if (isUserAdmin && !parsedData?.admin?.isAdmin) {
                    // Acessar o store via objeto window personalizado
                    // Isto evita importá-lo, o que poderia causar problemas com seletores reativos
                    const event = new CustomEvent('set-admin-status', { detail: { isAdmin: true } });
                    window.dispatchEvent(event);
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
            }
        };

        // Executar verificação após um delay para garantir que tudo esteja carregado
        checkAdmin();
    }, []);

    // Este componente não renderiza nada visível
    return null;
}

export default AdminCheck;