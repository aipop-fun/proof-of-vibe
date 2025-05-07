import { NextRequest, NextResponse } from 'next/server';

/**
 * API route que serve como proxy para buscar imagens de domínios externos
 * Útil para contornar restrições de CORS e limitações de domínio do Next.js
 */
export async function GET(request: NextRequest) {
    // Obter URL da imagem dos parâmetros da query
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    // Se nenhuma URL for fornecida, retornar erro
    if (!imageUrl) {
        return new NextResponse('URL da imagem não fornecida', { status: 400 });
    }

    try {
        // Validar URL (básico)
        const url = new URL(imageUrl);

        // Verificar se é uma URL do Spotify (aumente a segurança se necessário)
        const isSpotifyUrl = url.hostname.includes('scdn.co') ||
            url.hostname.includes('spotifycdn.com');

        if (!isSpotifyUrl) {
            return new NextResponse('Apenas URLs do Spotify são permitidas', { status: 403 });
        }

        // Buscar a imagem
        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error(`Falha ao buscar imagem: ${response.statusText}`);
        }

        // Obter os dados da imagem
        const imageData = await response.arrayBuffer();

        // Detectar o tipo de conteúdo ou usar o do response
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Criar uma nova resposta com os dados da imagem
        return new NextResponse(imageData, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache por 24 horas
            }
        });

    } catch (error) {
        console.error('Erro no proxy de imagem:', error);
        return new NextResponse(
            error instanceof Error ? error.message : 'Erro ao processar imagem',
            { status: 500 }
        );
    }
}