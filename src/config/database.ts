/**
 * Configuración de conexión a MongoDB
 */

import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Conecta a la base de datos MongoDB
 * @returns {Promise<Db>} Instancia de la base de datos
 */
export const connectDB = async (): Promise<Db> => {
  try {
    if (db) {
      console.log('⚡ Usando conexión existente a MongoDB');
      return db;
    }

    console.log('🔄 Conectando a MongoDB...');

    client = new MongoClient(MONGO_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    
    // Verificar la conexión
    await client.db('admin').command({ ping: 1 });
    
    db = client.db(DB_NAME);
    
    console.log(`✅ Conectado exitosamente a MongoDB - Base de datos: ${DB_NAME}`);
    
    return db;
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

/**
 * Obtiene la instancia de la base de datos
 * @returns {Db | null} Instancia de la base de datos o null si no está conectada
 */
export const getDB = (): Db | null => {
  if (!db) {
    console.warn('⚠️ Base de datos no inicializada. Llama a connectDB() primero.');
  }
  return db;
};

/**
 * Cierra la conexión a MongoDB
 */
export const closeDB = async (): Promise<void> => {
  try {
    if (client) {
      await client.close();
      client = null;
      db = null;
      console.log('🔒 Conexión a MongoDB cerrada');
    }
  } catch (error) {
    console.error('❌ Error al cerrar la conexión a MongoDB:', error);
    throw error;
  }
};

/**
 * Maneja el cierre graceful de la aplicación
 */
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

