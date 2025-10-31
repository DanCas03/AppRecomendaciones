/**
 * Punto de entrada del servidor
 */

import app from './app';
//import { connectDB } from './config/database';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

/**
 * Inicia el servidor
 */
const startServer = async (): Promise<void> => {
  try {
    // Conectar a MongoDB
    //await connectDB();

    // Verificar configuración de Spotify
    const spotifyConfigured = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);

    // Iniciar servidor Express
    app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🎵 Spotify API: ${spotifyConfigured ? '✅ Configurada' : '⚠️  No configurada (opcional)'}`);
      if (!spotifyConfigured) {
        console.log('   Para habilitar Spotify, agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET a .env');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📋 Rutas disponibles:');
      console.log(`   GET  http://localhost:${PORT}/`);
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log(`   GET  http://localhost:${PORT}/api/canciones`);
      console.log(`   GET  http://localhost:${PORT}/api/canciones/search?q=query`);
      console.log(`   POST http://localhost:${PORT}/recomendaciones`);
      console.log(`   GET  http://localhost:${PORT}/api/spotify/track/:trackId`);
      console.log(`   POST http://localhost:${PORT}/api/auth/register`);
      console.log(`   POST http://localhost:${PORT}/api/auth/login`);
      console.log(`   GET  http://localhost:${PORT}/api/user/profile`);
      console.log(`   GET  http://localhost:${PORT}/api/user/likes`);
      console.log(`   POST http://localhost:${PORT}/api/user/like`);
      console.log(`   DELETE http://localhost:${PORT}/api/user/like/:trackId`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();

