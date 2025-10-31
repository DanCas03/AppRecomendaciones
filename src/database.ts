import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

// Usar MONGO_URI del .env si está disponible, si no usar localhost
const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "GestionDeDatosProyecto";

let client: MongoClient | null = null;

export async function connectDB() {
  try {
    // Si ya hay una conexión activa, reutilizarla
    if (client) {
      const db = client.db(dbName);
      return { client, db };
    }

    // Crear nueva conexión
    client = new MongoClient(uri);
    await client.connect();
    console.log("✅ Conectado a la base de datos MongoDB");
    console.log(`📦 Base de datos: ${dbName}`);
    const db = client.db(dbName);
    return { client, db };
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:", error);
    console.log("\n💡 Soluciones posibles:");
    console.log("   1. Si usas MongoDB Atlas, verifica tu MONGO_URI en el archivo .env");
    console.log("   2. Si usas MongoDB local, asegúrate de que esté corriendo");
    console.log("   3. Verifica tu conexión a internet (si usas Atlas)");
    throw error;
  }
}