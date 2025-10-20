import { Song } from "./song.js";
import { connectDB } from "./database.js";
import { MongoClient } from "mongodb";

/**
 * Propiedades del perfil de usuario según la estructura en usuarios.json
 */
interface Props {
    nombre_usuario: string;
    contraseña: string;
    canciones_aceptadas: number;
    avg_duration: number;
    avg_explicit: number;
    avg_danceability: number;
    avg_energy: number;
    avg_key: number;
    avg_loudness: number;
    avg_mode: number;
    avg_speechiness: number;
    avg_acousticness: number;
    avg_instrumentalness: number;
    avg_liveness: number;
    avg_valence: number;
    avg_tempo: number;
    avg_time_signature: number;
}

/**
 * Clase que representa el perfil de un usuario
 */
export class Profile {
    public props: Props;

    constructor(props: Props) {
        this.props = props;
    }

    /**
     * Actualiza las preferencias del perfil basándose en una canción aceptada
     * Usa un algoritmo de promedio ponderado que da más peso a las canciones recientes
     * @param cancion - Canción que el usuario aceptó
     * @param nombrePerfil - Nombre del usuario cuyo perfil se actualizará
     */
    static async actualizarPreferenciasPerfil(cancion: Song, nombrePerfil: string): Promise<void> {
        let client: MongoClient | undefined;
        try {
            const { client: mongoClient, db } = await connectDB();
            client = mongoClient;

            const perfil = await db.collection('usuarios').findOne({ nombre_usuario: nombrePerfil });
            if (!perfil) {
                throw new Error(`Perfil "${nombrePerfil}" no encontrado.`);
            }

            const n = perfil.canciones_aceptadas ?? 0;
            const divisor = (n / 2) + 1;

            const audio = cancion.props.caracteristicas_audio;

            await db.collection('usuarios').findOneAndUpdate(
                { nombre_usuario: nombrePerfil },
                {
                    $set: {
                        avg_duration: ((n * perfil.avg_duration / 2) + cancion.props.duracion_ms) / divisor,
                        avg_explicit: ((n * perfil.avg_explicit / 2) + (cancion.props.explicito ? 1 : 0)) / divisor,
                        avg_danceability: ((n * perfil.avg_danceability / 2) + audio.danceability) / divisor,
                        avg_energy: ((n * perfil.avg_energy / 2) + audio.energy) / divisor,
                        avg_key: ((n * perfil.avg_key / 2) + audio.key) / divisor,
                        avg_loudness: ((n * perfil.avg_loudness / 2) + audio.loudness) / divisor,
                        avg_mode: ((n * perfil.avg_mode / 2) + audio.mode) / divisor,
                        avg_speechiness: ((n * perfil.avg_speechiness / 2) + audio.speechiness) / divisor,
                        avg_acousticness: ((n * perfil.avg_acousticness / 2) + audio.acousticness) / divisor,
                        avg_instrumentalness: ((n * perfil.avg_instrumentalness / 2) + audio.instrumentalness) / divisor,
                        avg_liveness: ((n * perfil.avg_liveness / 2) + audio.liveness) / divisor,
                        avg_valence: ((n * perfil.avg_valence / 2) + audio.valence) / divisor,
                        avg_tempo: ((n * perfil.avg_tempo / 2) + audio.tempo) / divisor,
                        avg_time_signature: ((n * perfil.avg_time_signature / 2) + audio.time_signature) / divisor,
                        canciones_aceptadas: n + 1
                    }
                }
            );
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            throw error;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    /**
     * Crea una canción "ideal" basada en el perfil del usuario
     * Útil para buscar recomendaciones
     */
    crearCancionIdeal(): Song {
        const props = {
            track_id: 'ideal',
            nombre: 'Canción Ideal',
            artista_ids: [],
            album_id: 0,
            genero_id: 0,
            popularidad: 50,
            duracion_ms: this.props.avg_duration,
            explicito: this.props.avg_explicit > 0.5,
            caracteristicas_audio: {
                danceability: this.props.avg_danceability,
                energy: this.props.avg_energy,
                key: this.props.avg_key,
                loudness: this.props.avg_loudness,
                mode: this.props.avg_mode,
                speechiness: this.props.avg_speechiness,
                acousticness: this.props.avg_acousticness,
                instrumentalness: this.props.avg_instrumentalness,
                liveness: this.props.avg_liveness,
                valence: this.props.avg_valence,
                tempo: this.props.avg_tempo,
                time_signature: Math.round(this.props.avg_time_signature)
            }
        };
        return new Song(props);
    }
}