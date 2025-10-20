import { connectDB } from "./database";
import { MongoClient } from "mongodb";
import { Song } from "./song";

/**
 * Crea una expresión de agregación para comparación normalizada
 * Usado en MongoDB aggregation pipeline
 */
function normalizedExpr(field: string, refValue: number) {
    return {
        $cond: [
            { $and: [{ $eq: [`$${field}`, 0] }, { $eq: [refValue, 0] }] },
            0,
            {
                $pow: [
                    {
                        $divide: [
                            {
                                $subtract: [
                                    { $pow: [`$${field}`, 2] },
                                    Math.pow(refValue, 2)
                                ]
                            },
                            {
                                $add: [
                                    { $pow: [`$${field}`, 2] },
                                    Math.pow(refValue, 2)
                                ]
                            }
                        ]
                    },
                    2
                ]
            }
        ]
    };
}

/**
 * Convierte un documento de MongoDB a un objeto Song
 */
function documentToSong(doc: any): Song {
    return new Song({
        _id: doc._id,
        track_id: doc.track_id,
        nombre: doc.nombre,
        artista_ids: doc.artista_ids || [],
        album_id: doc.album_id,
        genero_id: doc.genero_id,
        popularidad: doc.popularidad,
        duracion_ms: doc.duracion_ms,
        explicito: doc.explicito,
        caracteristicas_audio: doc.caracteristicas_audio,
        fecha_creacion: doc.fecha_creacion
    });
}

/**
 * Busca canciones similares a una canción de referencia
 * @param idealSong - Canción de referencia
 * @param threshold - Umbral de similitud (0-1). Valores más bajos = más similares
 * @param limit - Número máximo de canciones a retornar
 * @returns Array de canciones similares
 */
export async function buscarCancionesSimilares(idealSong: Song, threshold: number, limit: number = 20): Promise<Song[]> {
    let client: MongoClient | undefined;

    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;

        const audio = idealSong.props.caracteristicas_audio;

        // Construir expresión de score usando las características de audio
        const exprScore = {
            $divide: [
                {
                    $add: [
                        normalizedExpr('duracion_ms', idealSong.props.duracion_ms),
                        normalizedExpr('caracteristicas_audio.danceability', audio.danceability),
                        normalizedExpr('caracteristicas_audio.energy', audio.energy),
                        normalizedExpr('caracteristicas_audio.loudness', audio.loudness),
                        normalizedExpr('caracteristicas_audio.speechiness', audio.speechiness),
                        normalizedExpr('caracteristicas_audio.acousticness', audio.acousticness),
                        normalizedExpr('caracteristicas_audio.instrumentalness', audio.instrumentalness),
                        normalizedExpr('caracteristicas_audio.liveness', audio.liveness),
                        normalizedExpr('caracteristicas_audio.valence', audio.valence),
                        normalizedExpr('caracteristicas_audio.tempo', audio.tempo),
                        { $cond: [{ $eq: ['$explicito', idealSong.props.explicito] }, 0, 1] },
                        normalizedExpr('caracteristicas_audio.key', audio.key),
                        normalizedExpr('caracteristicas_audio.mode', audio.mode),
                        normalizedExpr('caracteristicas_audio.time_signature', audio.time_signature)
                    ]
                },
                14
            ]
        };

        const results = await db.collection('canciones')
            .find({
                $expr: { $lt: [exprScore, threshold] },
                track_id: { $ne: idealSong.props.track_id } // Excluir la canción de referencia
            })
            .limit(limit)
            .toArray();

        return results.map(documentToSong);
    } catch (error) {
        console.error('Error al buscar canciones similares:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * Retorna una muestra aleatoria de canciones
 * @param cantidad - Número de canciones a retornar (default: 100)
 * @returns Array de canciones aleatorias
 */
export async function retornarCanciones(cantidad: number = 100): Promise<Song[]> {
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        
        const results = await db.collection('canciones')
            .aggregate([
                { $sample: { size: cantidad } }
            ])
            .toArray();
        
        return results.map(documentToSong);
    } catch (error) {
        console.error('Error al retornar canciones:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * Retorna una canción aleatoria
 * @returns Una canción aleatoria
 */
export async function recomendacionAleatoria(): Promise<Song> {
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        
        const results = await db.collection('canciones')
            .aggregate([
                { $sample: { size: 1 } }
            ])
            .toArray();
        
        if (results.length === 0) {
            throw new Error('No se encontraron canciones en la base de datos');
        }
        
        return documentToSong(results[0]);
    } catch (error) {
        console.error('Error al buscar canción aleatoria:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * Recomendación de canciones por tempo (BPM)
 * @param referenceTempo - Tempo de referencia en BPM
 * @param rango - Rango de variación permitido (default: 5 BPM)
 * @param limit - Número máximo de canciones a retornar (default: 20)
 * @returns Array de canciones con tempo similar
 */
export async function recomendacionPorTempo(referenceTempo: number, rango: number = 5, limit: number = 20): Promise<Song[]> {
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        
        const results = await db.collection('canciones')
            .find({
                'caracteristicas_audio.tempo': { 
                    $gte: referenceTempo - rango, 
                    $lte: referenceTempo + rango 
                }
            })
            .limit(limit)
            .toArray();
        
        return results.map(documentToSong);
    } catch (error) {
        console.error('Error al buscar canciones por tempo:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * Recomendación de canciones del mismo género
 * @param generoId - ID del género
 * @param limit - Número máximo de canciones a retornar (default: 20)
 * @param ordenarPorPopularidad - Si debe ordenar por popularidad descendente (default: true)
 * @returns Array de canciones del mismo género
 */
export async function recomendacionPorGenero(generoId: number, limit: number = 20, ordenarPorPopularidad: boolean = true): Promise<Song[]> {
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        
        let query = db.collection('canciones').find({ genero_id: generoId });
        
        if (ordenarPorPopularidad) {
            query = query.sort({ popularidad: -1 });
        } else {
            query = query.sort({ nombre: 1 });
        }
        
        const results = await query.limit(limit).toArray();
        
        return results.map(documentToSong);
    } catch (error) {
        console.error('Error al buscar canciones por género:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * Recomendación de canciones del mismo género (por nombre)
 * @param nombreGenero - Nombre del género
 * @param limit - Número máximo de canciones a retornar (default: 20)
 * @param ordenarPorPopularidad - Si debe ordenar por popularidad descendente (default: true)
 * @returns Array de canciones del mismo género
 */
export async function recomendacionPorNombreGenero(nombreGenero: string, limit: number = 20, ordenarPorPopularidad: boolean = true): Promise<Song[]> {
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        
        // Buscar el género por nombre
        const genero = await db.collection('generos').findOne({ 
            nombre: { $regex: new RegExp(`^${nombreGenero}$`, 'i') } 
        });
        
        if (!genero) {
            throw new Error(`Género "${nombreGenero}" no encontrado`);
        }
        
        return await recomendacionPorGenero(genero._id as unknown as number, limit, ordenarPorPopularidad);
    } catch (error) {
        console.error('Error al buscar canciones por nombre de género:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * Recomendación de canciones del mismo artista
 * @param artistaId - ID del artista
 * @param limit - Número máximo de canciones a retornar (default: 20)
 * @param ordenarPorPopularidad - Si debe ordenar por popularidad descendente (default: true)
 * @returns Array de canciones del mismo artista
 */
export async function recomendacionPorArtista(artistaId: number, limit: number = 20, ordenarPorPopularidad: boolean = true): Promise<Song[]> {
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        
        let query = db.collection('canciones').find({ 
            artista_ids: artistaId 
        });
        
        if (ordenarPorPopularidad) {
            query = query.sort({ popularidad: -1 });
        } else {
            query = query.sort({ nombre: 1 });
        }
        
        const results = await query.limit(limit).toArray();
        
        return results.map(documentToSong);
    } catch (error) {
        console.error('Error al buscar canciones por artista:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * Recomendación de canciones del mismo artista (por nombre)
 * @param nombreArtista - Nombre del artista
 * @param limit - Número máximo de canciones a retornar (default: 20)
 * @param ordenarPorPopularidad - Si debe ordenar por popularidad descendente (default: true)
 * @returns Array de canciones del mismo artista
 */
export async function recomendacionPorNombreArtista(nombreArtista: string, limit: number = 20, ordenarPorPopularidad: boolean = true): Promise<Song[]> {
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        
        // Buscar el artista por nombre (case-insensitive)
        const artista = await db.collection('artistas').findOne({ 
            nombre: { $regex: new RegExp(`^${nombreArtista}$`, 'i') } 
        });
        
        if (!artista) {
            throw new Error(`Artista "${nombreArtista}" no encontrado`);
        }
        
        return await recomendacionPorArtista(artista._id as unknown as number, limit, ordenarPorPopularidad);
    } catch (error) {
        console.error('Error al buscar canciones por nombre de artista:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

/**
 * Busca canciones de un género específico con características similares a una canción de referencia
 * @param idealSong - Canción de referencia
 * @param generoId - ID del género deseado
 * @param threshold - Umbral de similitud (0-1)
 * @param limit - Número máximo de canciones a retornar
 * @returns Array de canciones similares del género especificado
 */
export async function recomendacionSimilarPorGenero(idealSong: Song, generoId: number, threshold: number = 0.3, limit: number = 20): Promise<Song[]> {
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;

        const audio = idealSong.props.caracteristicas_audio;

        const exprScore = {
            $divide: [
                {
                    $add: [
                        normalizedExpr('duracion_ms', idealSong.props.duracion_ms),
                        normalizedExpr('caracteristicas_audio.danceability', audio.danceability),
                        normalizedExpr('caracteristicas_audio.energy', audio.energy),
                        normalizedExpr('caracteristicas_audio.loudness', audio.loudness),
                        normalizedExpr('caracteristicas_audio.speechiness', audio.speechiness),
                        normalizedExpr('caracteristicas_audio.acousticness', audio.acousticness),
                        normalizedExpr('caracteristicas_audio.instrumentalness', audio.instrumentalness),
                        normalizedExpr('caracteristicas_audio.liveness', audio.liveness),
                        normalizedExpr('caracteristicas_audio.valence', audio.valence),
                        normalizedExpr('caracteristicas_audio.tempo', audio.tempo),
                        { $cond: [{ $eq: ['$explicito', idealSong.props.explicito] }, 0, 1] },
                        normalizedExpr('caracteristicas_audio.key', audio.key),
                        normalizedExpr('caracteristicas_audio.mode', audio.mode),
                        normalizedExpr('caracteristicas_audio.time_signature', audio.time_signature)
                    ]
                },
                14
            ]
        };

        const results = await db.collection('canciones')
            .find({
                $expr: { $lt: [exprScore, threshold] },
                genero_id: generoId,
                track_id: { $ne: idealSong.props.track_id }
            })
            .limit(limit)
            .toArray();

        return results.map(documentToSong);
    } catch (error) {
        console.error('Error al buscar canciones similares por género:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}