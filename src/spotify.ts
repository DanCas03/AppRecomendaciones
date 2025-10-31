/**
 * Servicio para interactuar con la API de Spotify
 * Basado en: https://developer.spotify.com/documentation/web-api/tutorials/getting-started
 */

import dotenv from 'dotenv';

dotenv.config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface SpotifyTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface SpotifyTrack {
    id: string;
    name: string;
    artists: Array<{ name: string; id: string }>;
    album: {
        name: string;
        images: Array<{ url: string; height: number; width: number }>;
        external_urls: { spotify: string };
    };
    preview_url: string | null;
    external_urls: { spotify: string };
    duration_ms: number;
    popularity: number;
    explicit: boolean;
}

/**
 * Cache para el access token
 */
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtiene un access token de Spotify usando Client Credentials flow
 * El token es válido por 1 hora
 */
async function getAccessToken(): Promise<string> {
    // Verificar si tenemos un token válido en caché
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.token;
    }

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        // No mostrar warnings en cada intento, solo lanzar error silenciosamente
        throw new Error('Spotify API no configurada');
    }

    try {
        const response = await fetch(SPOTIFY_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: SPOTIFY_CLIENT_ID,
                client_secret: SPOTIFY_CLIENT_SECRET,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al obtener token de Spotify: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as SpotifyTokenResponse;
        
        // Guardar en caché (expira 5 minutos antes para evitar problemas de timing)
        cachedToken = {
            token: data.access_token,
            expiresAt: Date.now() + (data.expires_in - 300) * 1000,
        };

        return data.access_token;
    } catch (error) {
        console.error('Error al obtener access token de Spotify:', error);
        throw error;
    }
}

/**
 * Obtiene información de un track individual desde Spotify
 */
export async function getSpotifyTrack(trackId: string): Promise<SpotifyTrack | null> {
    try {
        const token = await getAccessToken();
        
        const response = await fetch(`${SPOTIFY_API_BASE}/tracks/${trackId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Track ${trackId} no encontrado en Spotify`);
                return null;
            }
            const errorText = await response.text();
            throw new Error(`Error al obtener track de Spotify: ${response.status} - ${errorText}`);
        }

        const track = await response.json() as SpotifyTrack;
        return track;
    } catch (error) {
        console.error(`Error al obtener track ${trackId} de Spotify:`, error);
        return null;
    }
}

/**
 * Obtiene información de múltiples tracks desde Spotify
 * Máximo 50 tracks por request
 */
export async function getSpotifyTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
    if (trackIds.length === 0) {
        return [];
    }

    // Spotify permite máximo 50 tracks por request
    const batches: string[][] = [];
    for (let i = 0; i < trackIds.length; i += 50) {
        batches.push(trackIds.slice(i, i + 50));
    }

    try {
        const token = await getAccessToken();
        const allTracks: SpotifyTrack[] = [];

        for (const batch of batches) {
            const idsParam = batch.join(',');
            const response = await fetch(`${SPOTIFY_API_BASE}/tracks?ids=${idsParam}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                console.error(`Error al obtener batch de tracks: ${response.status}`);
                continue;
            }

            const data = await response.json() as { tracks: (SpotifyTrack | null)[] };
            // Filtrar tracks nulos
            const validTracks = data.tracks.filter((track): track is SpotifyTrack => track !== null);
            allTracks.push(...validTracks);
        }

        return allTracks;
    } catch (error) {
        console.error('Error al obtener tracks de Spotify:', error);
        return [];
    }
}

/**
 * Obtiene el preview URL de un track (si está disponible)
 */
export async function getTrackPreview(trackId: string): Promise<string | null> {
    const track = await getSpotifyTrack(trackId);
    return track?.preview_url || null;
}

/**
 * Genera la URL del embed de Spotify para un track
 */
export function getSpotifyEmbedUrl(trackId: string): string {
    return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
}

