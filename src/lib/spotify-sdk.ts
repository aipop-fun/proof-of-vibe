/* eslint-disable  @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
"use client";

import { SpotifyApi, IAuthStrategy, AccessToken } from "@spotify/web-api-ts-sdk";
import { getSession } from "next-auth/react";

// Estratégia de autenticação do NextAuth para o SDK do Spotify
class NextAuthStrategy implements IAuthStrategy {
    public async getAccessToken(): Promise<AccessToken> {
        const session: any = await getSession();

        if (!session?.user?.accessToken) {
            throw new Error("No Spotify access token available");
        }

        return {
            access_token: session.user.accessToken,
            token_type: "Bearer",
            expires_in: session.user.expiresAt
                ? Math.floor((session.user.expiresAt * 1000 - Date.now()) / 1000)
                : 0,
            refresh_token: session.user.refreshToken || "",
        };
    }

    public getOrCreateAccessToken(): Promise<AccessToken> {
        return this.getAccessToken();
    }

    public removeAccessToken(): void {
        // Não necessário para implementação com NextAuth
        console.warn("removeAccessToken not implemented");
    }

    public setConfiguration(): void {
        // Não necessário para implementação com NextAuth
        console.warn("setConfiguration not implemented");
    }
}

// Criar instância do SDK com estratégia NextAuth
const spotifyApi = new SpotifyApi(
    new NextAuthStrategy(),
    {
        beforeRequest: (url, options) => {
            // Opcional: log ou pré-processamento
            console.debug(`Making Spotify API request to: ${url}`);
        },
        afterRequest: (url, options, response) => {
            // Opcional: log de resposta ou pós-processamento
            console.debug(`Spotify API response status: ${response.status}`);
        },
    }
);

export default spotifyApi;