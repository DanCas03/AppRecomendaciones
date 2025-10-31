/**
 * Configuración de la aplicación Express
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { buscarCancionesSimilares, recomendacionAleatoria, recomendacionPorTempo, retornarCanciones } from './recommendations';
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
        const limitParam = parseInt(req.query?.limit as string) || parseInt(req.body?.limit as string) || 1;
        const idealSong: Song = new Song(params);
        
        // Validar que la canción tenga características de audio
        if (!idealSong.props?.caracteristicas_audio) {
            console.error('⚠️ Canción sin características de audio, usando canción aleatoria');
            const alternativa = await recomendacionAleatoria();
            res.json(limitParam > 1 ? [alternativa] : alternativa);
            return;
        }
        
        console.log(`🔍 Buscando recomendaciones para: ${idealSong.props?.nombre || idealSong.props?.track_id}`);
        if (idealSong.props?.caracteristicas_audio) {
            console.log(`   Tempo: ${idealSong.props.caracteristicas_audio.tempo}, Energy: ${idealSong.props.caracteristicas_audio.energy}, Danceability: ${idealSong.props.caracteristicas_audio.danceability}`);
        }
        
        // Optimización: Hacer solo UNA consulta con threshold más permisivo (0.2)
        // Luego filtrar y ordenar en memoria (mucho más rápido que múltiples consultas)
        const thresholdBusqueda = 0.2; // Threshold inicial que balancea similitud y velocidad
        const limiteCandidatos = limitParam > 1 ? Math.min(limitParam * 3, 40) : 40; // Limitar para mejorar velocidad
        
        console.log(`🔍 Buscando candidatos con threshold ${thresholdBusqueda} (máximo ${limiteCandidatos} candidatos)...`);
        let recomendaciones = await buscarCancionesSimilares(idealSong, thresholdBusqueda, limiteCandidatos);
        
        // Si no hay resultados, intentar solo UNA vez más con threshold más alto
        if (recomendaciones.length === 0) {
            console.log(`⚠️ No se encontraron candidatos, intentando con threshold 0.3...`);
            recomendaciones = await buscarCancionesSimilares(idealSong, 0.3, limiteCandidatos);
        }
        
        console.log(`📊 Encontradas ${recomendaciones.length} candidatos`);
        
        if (recomendaciones.length === 0) {
            console.log('⚠️ No se encontraron recomendaciones, usando canción aleatoria');
            const alternativa = await recomendacionAleatoria();
            res.json(limitParam > 1 ? [alternativa] : alternativa);
            return;
        }
        
        // Re-ordenar usando compareTo() para asegurar que sean las más similares
        // Esto es rápido porque solo calcula scores para los candidatos ya encontrados
        // Filtrar primero para excluir la canción base
        const cancionesFiltradas = recomendaciones.filter(cancion => {
            // Excluir si tiene el mismo track_id
            if (cancion.props?.track_id && idealSong.props?.track_id) {
                return cancion.props.track_id !== idealSong.props.track_id;
            }
            // Excluir si tiene el mismo _id
            if (cancion.props?._id && idealSong.props?._id) {
                return cancion.props._id !== idealSong.props._id;
            }
            // Si no hay IDs, comparar por nombre (menos preciso pero mejor que nada)
            if (cancion.props?.nombre && idealSong.props?.nombre) {
                return cancion.props.nombre.toLowerCase() !== idealSong.props.nombre.toLowerCase();
            }
            return true; // Si no hay forma de comparar, incluir
        });
        
        if (cancionesFiltradas.length === 0) {
            console.log('⚠️ Todas las recomendaciones eran la canción base, usando canción aleatoria');
            const alternativa = await recomendacionAleatoria();
            // Asegurarse de que la alternativa no sea la misma canción
            if (alternativa.props?.track_id === idealSong.props?.track_id || 
                alternativa.props?._id === idealSong.props?._id) {
                const otraAlternativa = await recomendacionAleatoria();
                res.json(limitParam > 1 ? [otraAlternativa] : otraAlternativa);
            } else {
                res.json(limitParam > 1 ? [alternativa] : alternativa);
            }
            return;
        }
        
        const conScores = cancionesFiltradas.map(cancion => {
            const score = idealSong.compareTo(cancion);
            return { cancion, score };
        });
        
        // Ordenar por similitud (menor score = más similar)
        conScores.sort((a, b) => a.score - b.score);
        
        // Filtrar solo las realmente similares con thresholds progresivos
        const muySimilares = conScores.filter(item => item.score < 0.15);
        const similares = muySimilares.length >= limitParam 
            ? muySimilares 
            : conScores.filter(item => item.score < 0.18);
        
        const similaresFinales = similares.length >= limitParam 
            ? similares 
            : conScores.filter(item => item.score < 0.2);
        
        // Si aún no hay suficientes, usar las mejores disponibles (ordenadas)
        const finales = similaresFinales.length >= limitParam 
            ? similaresFinales.slice(0, limitParam)
            : conScores.slice(0, Math.min(limitParam, conScores.length));
        
        const resultado = finales.map(item => item.cancion);
        
        console.log(`✅ Retornando ${resultado.length} recomendaciones ordenadas por similitud`);
        if (resultado.length > 0) {
            const mejorScore = conScores[0].score;
            console.log(`   Mejor match - Score: ${mejorScore.toFixed(4)} (${resultado[0].props?.nombre || 'N/A'})`);
            console.log(`   Rangos de score: ${Math.min(...finales.map(f => f.score)).toFixed(4)} - ${Math.max(...finales.map(f => f.score)).toFixed(4)}`);
        }
        
        if (limitParam > 1) {
            res.json(resultado);
        } else {
            res.json(resultado[0] || recomendaciones[0]);
        }
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

