import { MongoClient } from "mongodb";

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

export async function connectDB() {
  try {
    await client.connect();
    console.log("Conectado a la base de datos MongoDB");
    const db = client.db("GestionDeDatosProyecto");
    return { client, db };
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error);
    throw error;
  }
}