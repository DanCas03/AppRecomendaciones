/**
 * Configuración de la aplicación Express
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { buscarCancionesSimilares, recomendacionAleatoria, recomendacionPorTempo, retornarCanciones, recomendacionSimilarPorGenero, recomendacionPorArtista, recomendacionPorGenero } from './recommendations';
import { Song } from './song';
import { Profile } from './profile';
import { getSpotifyTrack, getSpotifyTracks, getSpotifyEmbedUrl } from './spotify';
import { connectDB } from './database';

dotenv.config();

const app: Application = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static('public'));

// Middleware para logging de peticiones
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Ruta de prueba principal
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '¡Hola! Servidor Express con TypeScript funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta de health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba para MongoDB
app.get('/api/test-db', async (_req: Request, res: Response) => {
  try {
    const { getDB } = await import('./config/database');
    const db = getDB();
    
    if (!db) {
      return res.status(500).json({
        error: 'Base de datos no conectada'
      });
    }

    // Intentar listar las colecciones
    const collections = await db.listCollections().toArray();
    
    res.json({
      message: 'Conexión a MongoDB exitosa',
      database: db.databaseName,
      collections: collections.map(col => col.name),
      totalCollections: collections.length
    });
  } catch (error) {
    console.error('Error en /api/test-db:', error);
    res.status(500).json({
      error: 'Error al conectar con la base de datos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
  return null;
});

// Ruta de prueba para insertar un documento
app.post('/api/test-insert', async (req: Request, res: Response) => {
  try {
    const { getDB } = await import('./config/database');
    const db = getDB();
    
    if (!db) {
      return res.status(500).json({
        error: 'Base de datos no conectada'
      });
    }

    const testCollection = db.collection('test_usuarios');
    
    const testDocument = {
      nombre: req.body.nombre || 'Usuario de Prueba',
      email: req.body.email || `test${Date.now()}@ejemplo.com`,
      createdAt: new Date(),
      activo: true
    };

    const result = await testCollection.insertOne(testDocument);
    
    res.json({
      message: 'Documento insertado exitosamente',
      insertedId: result.insertedId,
      document: testDocument
    });
  } catch (error) {
    console.error('Error en /api/test-insert:', error);
    res.status(500).json({
      error: 'Error al insertar documento',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
  return null;
});

// Ruta de prueba para obtener documentos
app.get('/api/test-usuarios', async (_req: Request, res: Response) => {
  try {
    const { getDB } = await import('./config/database');
    const db = getDB();
    
    if (!db) {
      return res.status(500).json({
        error: 'Base de datos no conectada'
      });
    }

    const testCollection = db.collection('test_usuarios');
    const usuarios = await testCollection.find({}).toArray();
    
    return res.json({
      message: 'Usuarios recuperados exitosamente',
      total: usuarios.length,
      usuarios: usuarios
    });
  } catch (error) {
    console.error('Error en /api/test-usuarios:', error);
    return res.status(500).json({
      error: 'Error al obtener usuarios',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para obtener recomendaciones basadas en una canción
app.post('/recomendaciones', async (req: Request, res: Response): Promise<void> => {
    // Configurar timeout más largo para esta operación (30 segundos)
    req.setTimeout(30000);
    
    try {
        const params = req.body;
        const limitParam = parseInt(req.query?.limit as string) || parseInt(req.body?.limit as string) || 5;
        const filterParam = (req.query?.filter as string) || (req.body?.filter as string) || 'top';
        const idealSong: Song = new Song(params);
        
        // Validar que la canción tenga características de audio
        if (!idealSong.props?.caracteristicas_audio) {
            console.error('⚠️ Canción sin características de audio, usando canción aleatoria');
            const alternativa = await recomendacionAleatoria();
            res.json(limitParam > 1 ? [alternativa] : alternativa);
            return;
        }
        
        console.log(`🔍 Buscando recomendaciones para: ${idealSong.props?.nombre || idealSong.props?.track_id} con filtro: ${filterParam}`);
        if (idealSong.props?.caracteristicas_audio) {
            console.log(`   Tempo: ${idealSong.props.caracteristicas_audio.tempo}, Energy: ${idealSong.props.caracteristicas_audio.energy}, Danceability: ${idealSong.props.caracteristicas_audio.danceability}`);
        }
        
        let resultado: Song[] = [];
        
        // Aplicar filtros según el parámetro
        switch (filterParam) {
            case 'genre':
                // Buscar canciones similares del mismo género
                if (idealSong.props?.genero_id) {
                    console.log(`🎵 Filtrando por género ID: ${idealSong.props.genero_id}`);
                    resultado = await recomendacionSimilarPorGenero(idealSong, idealSong.props.genero_id, 0.20, limitParam);
                    // Si no hay suficientes, intentar con threshold más alto
                    if (resultado.length < limitParam) {
                        resultado = await recomendacionSimilarPorGenero(idealSong, idealSong.props.genero_id, 0.30, limitParam);
                    }
                    // Si aún no hay suficientes, buscar solo por género sin similitud
                    if (resultado.length < limitParam) {
                        const porGenero = await recomendacionPorGenero(idealSong.props.genero_id, limitParam, true);
                        resultado = porGenero.filter(c => c.props?.track_id !== idealSong.props?.track_id);
                    }
                }
                break;
                
            case 'artist':
                // Buscar canciones del mismo artista
                if (idealSong.props?.artista_ids && idealSong.props.artista_ids.length > 0) {
                    console.log(`🎤 Filtrando por artista IDs: ${idealSong.props.artista_ids.join(', ')}`);
                    // Buscar por cada artista y combinar resultados
                    const todasCanciones: Song[] = [];
                    for (const artistaId of idealSong.props.artista_ids) {
                        const cancionesArtista = await recomendacionPorArtista(artistaId, limitParam * 2, true);
                        todasCanciones.push(...cancionesArtista);
                    }
                    // Eliminar duplicados y la canción base
                    const unicas = todasCanciones.filter((cancion, index, self) => {
                        const trackId = cancion.props?.track_id;
                        if (!trackId || trackId === idealSong.props?.track_id) return false;
                        return index === self.findIndex(c => c.props?.track_id === trackId);
                    });
                    // Ordenar por popularidad y tomar las mejores
                    unicas.sort((a, b) => (b.props?.popularidad || 0) - (a.props?.popularidad || 0));
                    resultado = unicas.slice(0, limitParam);
                }
                break;
                
            case 'energy':
                // Buscar canciones con alta energía similar
                if (idealSong.props?.caracteristicas_audio?.energy !== undefined) {
                    console.log(`⚡ Filtrando por energía similar: ${idealSong.props.caracteristicas_audio.energy}`);
                    // Buscar canciones similares primero
                    const similares = await buscarCancionesSimilares(idealSong, 0.20, limitParam * 3);
                    // Filtrar por energía alta (>= 0.6) y ordenar por energía descendente
                    resultado = similares
                        .filter(c => {
                            const energy = c.props?.caracteristicas_audio?.energy || 0;
                            return energy >= 0.6 && c.props?.track_id !== idealSong.props?.track_id;
                        })
                        .sort((a, b) => {
                            const energyA = a.props?.caracteristicas_audio?.energy || 0;
                            const energyB = b.props?.caracteristicas_audio?.energy || 0;
                            return energyB - energyA;
                        })
                        .slice(0, limitParam);
                    
                    // Si no hay suficientes, bajar el threshold a 0.5
                    if (resultado.length < limitParam) {
                        resultado = similares
                            .filter(c => {
                                const energy = c.props?.caracteristicas_audio?.energy || 0;
                                return energy >= 0.5 && c.props?.track_id !== idealSong.props?.track_id;
                            })
                            .sort((a, b) => {
                                const energyA = a.props?.caracteristicas_audio?.energy || 0;
                                const energyB = b.props?.caracteristicas_audio?.energy || 0;
                                return energyB - energyA;
                            })
                            .slice(0, limitParam);
                    }
                }
                break;
                
            case 'tempo':
                // Buscar canciones con tempo similar
                if (idealSong.props?.caracteristicas_audio?.tempo) {
                    console.log(`🎶 Filtrando por tempo similar: ${idealSong.props.caracteristicas_audio.tempo}`);
                    const targetTempo = idealSong.props.caracteristicas_audio.tempo;
                    resultado = await recomendacionPorTempo(targetTempo, 10, limitParam * 2);
                    // Filtrar la canción base y ordenar por diferencia de tempo
                    resultado = resultado
                        .filter(c => c.props?.track_id !== idealSong.props?.track_id)
                        .sort((a, b) => {
                            const tempoA = a.props?.caracteristicas_audio?.tempo || 0;
                            const tempoB = b.props?.caracteristicas_audio?.tempo || 0;
                            const diffA = Math.abs(tempoA - targetTempo);
                            const diffB = Math.abs(tempoB - targetTempo);
                            return diffA - diffB;
                        })
                        .slice(0, limitParam);
                }
                break;
                
            case 'top':
            default:
                // Recomendaciones normales ordenadas por popularidad después de similitud
                const thresholdBusqueda = 0.15;
                const limiteCandidatos = limitParam * 5;
                
                console.log(`🔍 Buscando candidatos con threshold ${thresholdBusqueda} (máximo ${limiteCandidatos} candidatos)...`);
                let recomendaciones = await buscarCancionesSimilares(idealSong, thresholdBusqueda, limiteCandidatos);
                
                if (recomendaciones.length === 0) {
                    console.log(`⚠️ No se encontraron candidatos, intentando con threshold 0.20...`);
                    recomendaciones = await buscarCancionesSimilares(idealSong, 0.20, limiteCandidatos);
                }
                
                // Filtrar la canción base
                const cancionesFiltradas = recomendaciones.filter(cancion => {
                    if (cancion.props?.track_id && idealSong.props?.track_id) {
                        return cancion.props.track_id !== idealSong.props.track_id;
                    }
                    return true;
                });
                
                // Calcular scores y ordenar
                const conScores = cancionesFiltradas.map(cancion => {
                    const score = idealSong.compareTo(cancion);
                    return { cancion, score };
                });
                
                conScores.sort((a, b) => a.score - b.score);
                
                // Tomar las más similares pero también considerar popularidad
                const mejoresSimilares = conScores
                    .filter(item => item.score < 0.20)
                    .slice(0, limitParam * 2);
                
                // Ordenar por popularidad y tomar las mejores
                mejoresSimilares.sort((a, b) => {
                    const popA = a.cancion.props?.popularidad || 0;
                    const popB = b.cancion.props?.popularidad || 0;
                    return popB - popA;
                });
                
                resultado = mejoresSimilares.slice(0, limitParam).map(item => item.cancion);
                break;
        }
        
        // Si no hay resultados, usar fallback
        if (resultado.length === 0) {
            console.log('⚠️ No se encontraron recomendaciones con el filtro, usando recomendación aleatoria');
            const alternativa = await recomendacionAleatoria();
            resultado = [alternativa];
        }
        
        console.log(`✅ Retornando ${resultado.length} recomendaciones con filtro ${filterParam}`);
        
        res.json(resultado);
        return;
    } catch (error) {
        console.error('❌ Error en /recomendaciones:', error);
        res.status(500).json({ 
            error: 'Error al obtener recomendaciones',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
        return;
    }
});

// ==================== AUTENTICACIÓN Y USUARIOS ====================

// Middleware simple para obtener usuario desde headers (por ahora)
const obtenerUsuario = async (req: Request): Promise<string | null> => {
    const username = req.headers['x-username'] as string || req.body.username || req.query.username;
    return username || null;
};

// Registrar nuevo usuario
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
            return;
        }
        
        const { db } = await connectDB();
        
        // Verificar si el usuario ya existe
        const usuarioExistente = await db.collection('usuarios').findOne({ nombre_usuario: username });
        if (usuarioExistente) {
            res.status(409).json({ error: 'El nombre de usuario ya existe' });
            return;
        }
        
        // Crear nuevo usuario con valores por defecto
        const nuevoUsuario = {
            nombre_usuario: username,
            contraseña: password,
            canciones_aceptadas: 0,
            canciones_liked: [],
            avg_duration: 180000,
            avg_explicit: 0,
            avg_danceability: 0.5,
            avg_energy: 0.5,
            avg_key: 5,
            avg_loudness: -10,
            avg_mode: 1,
            avg_speechiness: 0.1,
            avg_acousticness: 0.5,
            avg_instrumentalness: 0.1,
            avg_liveness: 0.2,
            avg_valence: 0.5,
            avg_tempo: 120,
            avg_time_signature: 4,
            fecha_creacion: new Date()
        };
        
        await db.collection('usuarios').insertOne(nuevoUsuario);
        
        res.json({ 
            message: 'Usuario registrado exitosamente',
            usuario: {
                nombre_usuario: nuevoUsuario.nombre_usuario,
                canciones_liked: nuevoUsuario.canciones_liked.length
            }
        });
        return;
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ 
            error: 'Error al registrar usuario',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
        return;
    }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
            return;
        }
        
        const { db } = await connectDB();
        
        const usuario = await db.collection('usuarios').findOne({ 
            nombre_usuario: username,
            contraseña: password
        });
        
        if (!usuario) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }
        
        res.json({ 
            message: 'Login exitoso',
            usuario: {
                nombre_usuario: usuario.nombre_usuario,
                canciones_liked: usuario.canciones_liked?.length || 0,
                canciones_aceptadas: usuario.canciones_aceptadas || 0
            }
        });
        return;
    } catch (error) {
        console.error('Error al hacer login:', error);
        res.status(500).json({ 
            error: 'Error al hacer login',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
        return;
    }
});

// Obtener perfil de usuario
app.get('/api/user/profile', async (req: Request, res: Response): Promise<void> => {
    try {
        const username = await obtenerUsuario(req);
        if (!username) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        
        const { db } = await connectDB();
        const usuario = await db.collection('usuarios').findOne({ nombre_usuario: username });
        
        if (!usuario) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        
        res.json({
            nombre_usuario: usuario.nombre_usuario,
            canciones_aceptadas: usuario.canciones_aceptadas || 0,
            canciones_liked_count: usuario.canciones_liked?.length || 0,
            preferencias: {
                avg_duration: usuario.avg_duration,
                avg_danceability: usuario.avg_danceability,
                avg_energy: usuario.avg_energy,
                avg_tempo: usuario.avg_tempo,
                avg_valence: usuario.avg_valence
            },
            fecha_creacion: usuario.fecha_creacion
        });
        return;
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ 
            error: 'Error al obtener perfil',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
        return;
    }
});

// Agregar like a una canción
app.post('/api/user/like', async (req: Request, res: Response): Promise<void> => {
    try {
        const username = await obtenerUsuario(req);
        if (!username) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        
        const { track_id } = req.body;
        if (!track_id) {
            res.status(400).json({ error: 'track_id es requerido' });
            return;
        }
        
        const { db } = await connectDB();
        
        // Agregar track_id a la lista de likes (si no existe)
        const resultado = await db.collection('usuarios').updateOne(
            { nombre_usuario: username },
            { 
                $addToSet: { canciones_liked: track_id }
            }
        );
        
        if (resultado.matchedCount === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        
        // Obtener la canción completa para retornarla
        const cancion = await db.collection('canciones').findOne({ track_id: track_id });
        
        res.json({ 
            message: 'Canción agregada a favoritos',
            liked: true,
            track_id: track_id,
            cancion: cancion
        });
        return;
    } catch (error) {
        console.error('Error al agregar like:', error);
        res.status(500).json({ 
            error: 'Error al agregar like',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
        return;
    }
});

// Quitar like de una canción
app.delete('/api/user/like/:trackId', async (req: Request, res: Response): Promise<void> => {
    try {
        const username = await obtenerUsuario(req);
        if (!username) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        
        const { trackId } = req.params;
        if (!trackId) {
            res.status(400).json({ error: 'track_id es requerido' });
            return;
        }
        
        const { db } = await connectDB();
        
        const resultado = await db.collection('usuarios').updateOne(
            { nombre_usuario: username },
            { 
                $pull: { canciones_liked: trackId as any }
            }
        );
        
        if (resultado.matchedCount === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        
        res.json({ 
            message: 'Canción eliminada de favoritos',
            liked: false,
            track_id: trackId
        });
        return;
    } catch (error) {
        console.error('Error al quitar like:', error);
        res.status(500).json({ 
            error: 'Error al quitar like',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
        return;
    }
});

// Obtener lista de canciones liked
app.get('/api/user/likes', async (req: Request, res: Response): Promise<void> => {
    try {
        const username = await obtenerUsuario(req);
        if (!username) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        
        const { db } = await connectDB();
        const usuario = await db.collection('usuarios').findOne({ nombre_usuario: username });
        
        if (!usuario) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        
        const trackIds = usuario.canciones_liked || [];
        
        if (trackIds.length === 0) {
            res.json({ canciones: [], total: 0 });
            return;
        }
        
        // Obtener las canciones completas
        const canciones = await db.collection('canciones').find({
            track_id: { $in: trackIds }
        }).toArray();
        
        // Ordenar según el orden de los likes
        const cancionesOrdenadas = trackIds
            .map((trackId: string) => canciones.find(c => c.track_id === trackId))
            .filter(Boolean);
        
        res.json({ 
            canciones: cancionesOrdenadas,
            total: cancionesOrdenadas.length
        });
        return;
    } catch (error) {
        console.error('Error al obtener likes:', error);
        res.status(500).json({ 
            error: 'Error al obtener likes',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
        return;
    }
});

// Verificar si una canción está liked
app.get('/api/user/like/:trackId', async (req: Request, res: Response): Promise<void> => {
    try {
        const username = await obtenerUsuario(req);
        if (!username) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        
        const { trackId } = req.params;
        const { db } = await connectDB();
        const usuario = await db.collection('usuarios').findOne({ nombre_usuario: username });
        
        if (!usuario) {
            res.json({ liked: false });
            return;
        }
        
        const liked = usuario.canciones_liked?.includes(trackId) || false;
        res.json({ liked });
        return;
    } catch (error) {
        console.error('Error al verificar like:', error);
        res.json({ liked: false });
        return;
    }
});

app.post('/updatePreferences', async(req:Request, res:Response) =>{
    const params = req.body;
    const profile:string= params.profile;
    const song:Song =new Song(params.song);
    Profile.actualizarPreferenciasPerfil(song,profile);
    res.send('Preferencias actualizadas').status(200);
});

app.get('/cancionAleatoria', async(_req:Request, res:Response)=>{
    return res.json(await recomendacionAleatoria());
})

app.get('/cancionPorTempo', async(req:Request, res:Response)=>{
    const tempo=req.params.tempo;
    const canciones=await recomendacionPorTempo(Number(tempo));
    const cancionesLength=canciones.length;
    const recomendacionDefinitiva=canciones[Math.floor(Math.random() * (cancionesLength + 1))];
    return res.json(recomendacionDefinitiva);
});

app.get('/prueba', async (_req:Request, res:Response) =>{
    res.json(await retornarCanciones());
});

app.get('/api/canciones/random', async (_req: Request, res: Response): Promise<void> => {
    try {
        const { db } = await connectDB();
        const cancionDoc = await db.collection('canciones').aggregate([{ $sample: { size: 1 } }]).next();
        if (!cancionDoc) {
            res.status(404).json({"message":"No se encontró ninguna canción"});
            return;
        }
        const cancion = new Song({
            _id: cancionDoc._id,
            track_id: cancionDoc.track_id,
            nombre: cancionDoc.nombre,
            artista_ids: cancionDoc.artista_ids || [],
            album_id: cancionDoc.album_id,
            genero_id: cancionDoc.genero_id,
            popularidad: cancionDoc.popularidad,
            duracion_ms: cancionDoc.duracion_ms,
            explicito: cancionDoc.explicito,
            caracteristicas_audio: cancionDoc.caracteristicas_audio,
            fecha_creacion: cancionDoc.fecha_creacion
        });
        const spotifyConfigured = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
        if (spotifyConfigured && cancion.props?.track_id) {
            try {
                const spotifyTrack = await getSpotifyTrack(cancion.props.track_id);
                if (spotifyTrack) {
                  res.json({
                      ...cancion,
                      spotify: {
                          name: spotifyTrack.name,
                          artists: spotifyTrack.artists.map(a => a.name).join(', '),
                          album: spotifyTrack.album.name,
                          albumImage: spotifyTrack.album.images[0]?.url || null,
                          previewUrl: spotifyTrack.preview_url,
                          spotifyUrl: spotifyTrack.external_urls.spotify,
                          embedUrl: getSpotifyEmbedUrl(spotifyTrack.id),
                          popularity: spotifyTrack.popularity,
                          explicit: spotifyTrack.explicit,
                      }
                  });
                  return;
                }
            } 
            catch (spotifyError) {
                console.log("Error obteniendo datos de Spotify:", spotifyError);
                console.log('Continuando sin datos de Spotify para canción aleatoria');
            }
            res.json(cancion);
            return;
        }
        res.json(cancion);
        return;
    } catch (error) {
        console.error('Error en /api/canciones/random:', error);
        res.status(500).json({"message":"Error al obtener canción aleatoria"});
        return;
    }
});

// Endpoint para buscar canciones por nombre o artista
app.get('/api/canciones/search', async (req: Request, res: Response): Promise<void> => {
    try {
        const query = req.query.q as string;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        
        if (!query || query.trim().length === 0) {
            res.json({ canciones: [], total: 0, hasMore: false });
            return;
        }
        
        const { db } = await connectDB();
        
        // Buscar por nombre de canción usando regex (case-insensitive)
        const searchRegex = new RegExp(query.trim(), 'i');
        
        // Búsqueda paralela en canciones y artistas
        const [cancionesPorNombre, artistasEncontrados] = await Promise.all([
            // Buscar canciones por nombre
            db.collection('canciones')
                .find({ nombre: { $regex: searchRegex } })
                .limit(limit + offset + 20) // Obtener más para tener suficientes después de combinar
                .toArray(),
            
            // Buscar artistas por nombre
            db.collection('artistas')
                .find({ nombre: { $regex: searchRegex } })
                .limit(20)
                .toArray()
        ]);
        
        // Obtener IDs de artistas encontrados
        const artistaIds = artistasEncontrados.map(artista => artista._id);
        
        // Buscar canciones de esos artistas
        let cancionesPorArtista: any[] = [];
        if (artistaIds.length > 0) {
            cancionesPorArtista = await db.collection('canciones')
                .find({ artista_ids: { $in: artistaIds } })
                .limit(limit + offset + 20)
                .toArray();
        }
        
        // Combinar resultados y eliminar duplicados
        const cancionesMap = new Map();
        
        // Primero agregar canciones por nombre (tienen prioridad)
        cancionesPorNombre.forEach(doc => {
            cancionesMap.set(doc._id.toString(), doc);
        });
        
        // Luego agregar canciones por artista (si no están ya)
        cancionesPorArtista.forEach(doc => {
            if (!cancionesMap.has(doc._id.toString())) {
                cancionesMap.set(doc._id.toString(), doc);
            }
        });
        
        // Obtener todos los resultados únicos
        const todosLosResultados = Array.from(cancionesMap.values());
        const total = todosLosResultados.length;
        
        // Aplicar offset y limit
        const resultadosUnicos = todosLosResultados.slice(offset, offset + limit);
        const hasMore = (offset + limit) < total;
        
        // Convertir a formato Song
        const canciones = resultadosUnicos.map(doc => new Song({
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
        }));
        
        // Enriquecer con datos de Spotify si está configurado
        const spotifyConfigured = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
        
        if (spotifyConfigured && canciones.length > 0) {
            const trackIds = canciones
                .map(c => c.props?.track_id)
                .filter((id): id is string => typeof id === 'string' && id.length > 0);
            
            if (trackIds.length > 0) {
                try {
                    const spotifyTracks = await getSpotifyTracks(trackIds);
                    const spotifyMap = new Map(spotifyTracks.map(track => [track.id, track]));
                    
                    const cancionesEnriquecidas = canciones.map(cancion => {
                        const spotifyTrack = spotifyMap.get(cancion.props?.track_id || '');
                        return {
                            ...cancion,
                            spotify: spotifyTrack ? {
                                name: spotifyTrack.name,
                                artists: spotifyTrack.artists.map(a => a.name).join(', '),
                                album: spotifyTrack.album.name,
                                albumImage: spotifyTrack.album.images[0]?.url || null,
                                previewUrl: spotifyTrack.preview_url,
                                spotifyUrl: spotifyTrack.external_urls.spotify,
                                embedUrl: getSpotifyEmbedUrl(spotifyTrack.id),
                                popularity: spotifyTrack.popularity,
                                explicit: spotifyTrack.explicit,
                            } : null,
                        };
                    });
                    
                    res.json({
                        canciones: cancionesEnriquecidas,
                        total,
                        hasMore,
                        offset,
                        limit
                    });
                    return;
                } catch (spotifyError) {
                    // Continuar sin datos de Spotify
                    console.log('Continuando sin datos de Spotify para búsqueda');
                }
            }
        }
        
        res.json({
            canciones,
            total,
            hasMore,
            offset,
            limit
        });
        return;
    } catch (error) {
        console.error('Error en /api/canciones/search:', error);
        res.status(500).json({ 
            error: 'Error al buscar canciones',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
        return;
    }
});

// Endpoint para obtener múltiples canciones para el feed con información de Spotify
app.get('/api/canciones', async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const includeSpotify = req.query.spotify !== 'false'; // Por defecto incluir Spotify
        
        const canciones = await retornarCanciones(limit);
        
        // Si se solicita información de Spotify, enriquecer las canciones
        // Solo intentar si Spotify está configurado
        const spotifyConfigured = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
        
        if (includeSpotify && spotifyConfigured && canciones.length > 0) {
            const trackIds = canciones
                .map(c => c.props?.track_id)
                .filter((id): id is string => typeof id === 'string' && id.length > 0);
            
            if (trackIds.length > 0) {
                try {
                    const spotifyTracks = await getSpotifyTracks(trackIds);
                    
                    // Crear un mapa de track_id -> Spotify track
                    const spotifyMap = new Map(
                        spotifyTracks.map(track => [track.id, track])
                    );
                    
                    // Combinar datos de MongoDB con datos de Spotify
                    const cancionesEnriquecidas = canciones.map(cancion => {
                        const spotifyTrack = spotifyMap.get(cancion.props?.track_id || '');
                        return {
                            ...cancion,
                            spotify: spotifyTrack ? {
                                name: spotifyTrack.name,
                                artists: spotifyTrack.artists.map(a => a.name).join(', '),
                                album: spotifyTrack.album.name,
                                albumImage: spotifyTrack.album.images[0]?.url || null,
                                previewUrl: spotifyTrack.preview_url,
                                spotifyUrl: spotifyTrack.external_urls.spotify,
                                embedUrl: getSpotifyEmbedUrl(spotifyTrack.id),
                                popularity: spotifyTrack.popularity,
                                explicit: spotifyTrack.explicit,
                            } : null,
                        };
                    });
                    
                    res.json(cancionesEnriquecidas);
                    return;
                } catch (spotifyError) {
                    // Si Spotify no está configurado o falla, continuar sin datos de Spotify
                    if (spotifyError instanceof Error && spotifyError.message.includes('no configurada')) {
                        // Silencioso: Spotify simplemente no está configurado, es normal
                    } else {
                        // Solo mostrar errores reales (no configuración faltante)
                        console.error('Error al obtener datos de Spotify, retornando datos de BD únicamente:', spotifyError);
                    }
                    // Continuar para retornar solo datos de MongoDB
                }
            }
        }
        
        res.json(canciones);
        return;
    } catch (error) {
        console.error('Error en /api/canciones:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        // Detectar si es un error de conexión
        if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('MongoServerSelectionError')) {
            res.status(503).json({ 
                error: 'No se pudo conectar a la base de datos',
                message: 'Verifica que MongoDB esté corriendo o que tu MONGO_URI en .env sea correcta',
                details: errorMessage
            });
            return;
        } else {
            res.status(500).json({ 
                error: 'Error al obtener canciones',
                details: errorMessage
            });
            return;
        }
    }
});



// Endpoint para obtener información de Spotify de un track específico
app.get('/api/spotify/track/:trackId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { trackId } = req.params;
        const track = await getSpotifyTrack(trackId);
        
        if (!track) {
            res.status(404).json({ error: 'Track no encontrado en Spotify' });
            return;
        }
        
        res.json({
            id: track.id,
            name: track.name,
            artists: track.artists,
            album: track.album,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            embedUrl: getSpotifyEmbedUrl(track.id),
            popularity: track.popularity,
            explicit: track.explicit,
            duration_ms: track.duration_ms,
        });
        return;
    } catch (error) {
        console.error('Error en /api/spotify/track:', error);
        res.status(500).json({ 
            error: 'Error al obtener información de Spotify',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
        return;
    }
});

// Manejo de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// Manejo de errores global
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

export default app;

