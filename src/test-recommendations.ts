/**
 * Script de prueba para verificar las recomendaciones
 * Ejecutar con: npx ts-node src/test-recommendations.ts
 */

import { connectDB } from './database';
import { retornarCanciones, buscarCancionesSimilares } from './recommendations';
import { Song } from './song';

async function testRecomendaciones() {
    try {
        console.log('\n🧪 PRUEBA DE RECOMENDACIONES\n');
        console.log('═'.repeat(60));
        
        // Obtener una canción de prueba
        const canciones = await retornarCanciones(1);
        if (canciones.length === 0) {
            console.log('❌ No hay canciones en la base de datos');
            return;
        }
        
        const cancionBase = canciones[0];
        console.log('\n📀 Canción base:');
        console.log(`   Track ID: ${cancionBase.props?.track_id}`);
        console.log(`   Nombre: ${cancionBase.props?.nombre}`);
        console.log(`   Duración: ${cancionBase.props?.duracion_ms}ms`);
        if (cancionBase.props?.caracteristicas_audio) {
            const audio = cancionBase.props.caracteristicas_audio;
            console.log(`   Tempo: ${audio.tempo} BPM`);
            console.log(`   Energy: ${audio.energy}`);
            console.log(`   Danceability: ${audio.danceability}`);
        }
        
        // Buscar recomendaciones
        console.log('\n🔍 Buscando recomendaciones...');
        const recomendaciones = await buscarCancionesSimilares(cancionBase, 0.4, 10);
        
        console.log(`\n📊 Encontradas ${recomendaciones.length} recomendaciones con threshold 0.4`);
        
        if (recomendaciones.length > 0) {
            console.log('\n🎵 Recomendaciones encontradas:');
            recomendaciones.forEach((rec, idx) => {
                const score = cancionBase.compareTo(rec);
                console.log(`\n${idx + 1}. ${rec.props?.nombre || 'Sin nombre'}`);
                console.log(`   Track ID: ${rec.props?.track_id}`);
                console.log(`   Score de similitud: ${score.toFixed(4)} (menor = más similar)`);
                if (rec.props?.caracteristicas_audio) {
                    const audio = rec.props.caracteristicas_audio;
                    console.log(`   Tempo: ${audio.tempo} BPM (base: ${cancionBase.props?.caracteristicas_audio?.tempo} BPM)`);
                    console.log(`   Energy: ${audio.energy} (base: ${cancionBase.props?.caracteristicas_audio?.energy})`);
                }
            });
            
            // Ordenar por similitud
            const ordenadas = recomendaciones
                .map(rec => ({ cancion: rec, score: cancionBase.compareTo(rec) }))
                .sort((a, b) => a.score - b.score);
            
            console.log('\n✅ Top 5 más similares (ordenadas por score):');
            ordenadas.slice(0, 5).forEach((item, idx) => {
                console.log(`${idx + 1}. ${item.cancion.props?.nombre || 'Sin nombre'} - Score: ${item.score.toFixed(4)}`);
            });
        } else {
            console.log('\n⚠️ No se encontraron recomendaciones con threshold 0.4');
            console.log('   Intentando con threshold más alto (0.5)...');
            const recomendaciones2 = await buscarCancionesSimilares(cancionBase, 0.5, 10);
            console.log(`   Encontradas: ${recomendaciones2.length} recomendaciones`);
        }
        
        console.log('\n' + '═'.repeat(60));
        console.log('✅ Prueba completada\n');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
    testRecomendaciones()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { testRecomendaciones };

