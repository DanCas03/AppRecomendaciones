/**
 * Script para inspeccionar la estructura de la base de datos
 * Ejecutar con: npx ts-node src/inspect-db.ts
 */

import { connectDB } from './database';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function inspeccionarBaseDatos() {
    let client: MongoClient | undefined;
    
    try {
        console.log('🔍 Intentando conectar a la base de datos...');
        console.log(`📡 MongoDB URI: ${process.env.MONGO_URI ? 'Configurada (Atlas)' : 'No configurada (usando localhost)'}`);
        console.log(`📦 Base de datos: ${process.env.DB_NAME || 'GestionDeDatosProyecto'}\n`);
        
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        
        console.log('\n📊 INSpección DE LA BASE DE DATOS\n');
        console.log('═'.repeat(60));
        
        // Listar todas las colecciones
        const colecciones = await db.listCollections().toArray();
        console.log(`\n📚 Colecciones encontradas: ${colecciones.length}\n`);
        
        for (const coleccion of colecciones) {
            console.log(`\n${'─'.repeat(60)}`);
            console.log(`📦 Colección: ${coleccion.name}`);
            console.log('─'.repeat(60));
            
            const collection = db.collection(coleccion.name);
            const totalDocs = await collection.countDocuments();
            console.log(`Total de documentos: ${totalDocs}`);
            
            if (totalDocs > 0) {
                // Obtener un documento de ejemplo
                const ejemplo = await collection.findOne({});
                
                if (ejemplo) {
                    console.log('\n📄 Estructura de un documento de ejemplo:');
                    console.log(JSON.stringify(ejemplo, null, 2));
                    
                    // Si es la colección de canciones, mostrar más detalles
                    if (coleccion.name === 'canciones') {
                        console.log('\n🎵 Campos específicos de canciones:');
                        const cancion = ejemplo as any;
                        console.log(`  - track_id: ${cancion.track_id || 'N/A'}`);
                        console.log(`  - nombre: ${cancion.nombre || cancion.name || 'N/A'}`);
                        console.log(`  - artista_ids: ${Array.isArray(cancion.artista_ids) ? cancion.artista_ids.length : 'N/A'}`);
                        console.log(`  - duracion_ms: ${cancion.duracion_ms || cancion.duration_ms || 'N/A'}`);
                        console.log(`  - caracteristicas_audio: ${cancion.caracteristicas_audio ? '✓ Presente' : cancion.audio_features ? '✓ (como audio_features)' : '✗ No encontrado'}`);
                        
                        if (cancion.caracteristicas_audio) {
                            const audio = cancion.caracteristicas_audio;
                            console.log('    Campos de características:');
                            console.log(`      - danceability: ${audio.danceability !== undefined ? audio.danceability : 'N/A'}`);
                            console.log(`      - energy: ${audio.energy !== undefined ? audio.energy : 'N/A'}`);
                            console.log(`      - tempo: ${audio.tempo !== undefined ? audio.tempo : 'N/A'}`);
                        }
                        
                        if (cancion.audio_features) {
                            const audio = cancion.audio_features;
                            console.log('    Campos de audio_features (nombre alternativo):');
                            console.log(`      - danceability: ${audio.danceability !== undefined ? audio.danceability : 'N/A'}`);
                            console.log(`      - energy: ${audio.energy !== undefined ? audio.energy : 'N/A'}`);
                            console.log(`      - tempo: ${audio.tempo !== undefined ? audio.tempo : 'N/A'}`);
                        }
                    }
                    
                    // Si es la colección de usuarios, mostrar más detalles
                    if (coleccion.name === 'usuarios') {
                        console.log('\n👤 Campos específicos de usuarios:');
                        const usuario = ejemplo as any;
                        console.log(`  - nombre_usuario: ${usuario.nombre_usuario || usuario.username || 'N/A'}`);
                        console.log(`  - canciones_aceptadas: ${usuario.canciones_aceptadas || 0}`);
                    }
                }
                
                // Mostrar algunos valores únicos de campos importantes
                if (coleccion.name === 'canciones' && totalDocs > 0) {
                    console.log('\n🔍 Análisis de campos:');
                    
                    // Verificar campos comunes
                    const campos = [
                        'track_id', 'nombre', 'name', 
                        'artista_ids', 'artist_ids',
                        'duracion_ms', 'duration_ms',
                        'caracteristicas_audio', 'audio_features'
                    ];
                    
                    for (const campo of campos) {
                        const tieneCampo = await collection.countDocuments({ [campo]: { $exists: true } });
                        if (tieneCampo > 0) {
                            console.log(`  ✓ Campo "${campo}": presente en ${tieneCampo} documentos`);
                        }
                    }
                }
            }
        }
        
        console.log('\n' + '═'.repeat(60));
        console.log('✅ Inspección completada\n');
        
    } catch (error) {
        console.error('❌ Error al inspeccionar la base de datos:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
    inspeccionarBaseDatos()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { inspeccionarBaseDatos };

