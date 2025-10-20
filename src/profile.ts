import { Song } from "./song.js";
import { connectDB } from "./database.js";
import { MongoClient } from "mongodb";
interface Props{
    name: string;
    canciones_aceptadas: number;
    avg_duration: number;
    avg_explicit: number;
    avg_release_year: number;
    avg_danceability: number;
    avg_energy: number;
    avg_key: number;
    avg_loudness: number;
    avg_speechiness: number;
    avg_acousticness: number;
    avg_instrumentalness: number;
    avg_liveness: number;
    avg_valence: number;
    avg_tempo: number;
    avg_time_signature: number;
    avg_mode:number;
}
export class Profile{
    public props:Props;

    constructor(props:Props){
        this.props=props;
    }

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

            await db.collection('usuarios').findOneAndUpdate(
            { nombre_usuario: nombrePerfil },
            {
                $set: {
                avg_duration: ((n * perfil.avg_duration / 2) + cancion.props.duration_ms) / divisor,
                avg_explicit: ((n * perfil.avg_explicit / 2) + (cancion.props.explicit ? 1 : 0)) / divisor,
                avg_release_year: ((n * perfil.avg_release_year / 2) + cancion.props.release_date.getFullYear()) / divisor,
                avg_energy: ((n * perfil.avg_energy / 2) + cancion.props.energy) / divisor,
                avg_key: ((n * perfil.avg_key / 2) + cancion.props.key) / divisor,
                avg_loudness: ((n * perfil.avg_loudness / 2) + cancion.props.loudness) / divisor,
                avg_mode: ((n * perfil.avg_mode / 2) + cancion.props.mode) / divisor,
                avg_speechiness: ((n * perfil.avg_speechiness / 2) + cancion.props.speechiness) / divisor,
                avg_acousticness: ((n * perfil.avg_acousticness / 2) + cancion.props.acousticness) / divisor,
                avg_instrumentalness: ((n * perfil.avg_instrumentalness / 2) + cancion.props.instrumentalness) / divisor,
                avg_liveness: ((n * perfil.avg_liveness / 2) + cancion.props.liveness) / divisor,
                avg_valence: ((n * perfil.avg_valence / 2) + cancion.props.valence) / divisor,
                avg_tempo: ((n * perfil.avg_tempo / 2) + cancion.props.tempo) / divisor,
                avg_time_signature: ((n * perfil.avg_time_signature / 2) + cancion.props.time_signature) / divisor,
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
}