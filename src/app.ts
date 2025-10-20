/**
 * Configuración de la aplicación Express
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging de peticiones
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Ruta de prueba principal
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '¡Hola! Servidor Express con TypeScript funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta de health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba para MongoDB
app.get('/api/test-db', async (req: Request, res: Response) => {
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
});

// Ruta de prueba para obtener documentos
app.get('/api/test-usuarios', async (req: Request, res: Response) => {
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
    
    res.json({
      message: 'Usuarios recuperados exitosamente',
      total: usuarios.length,
      usuarios: usuarios
    });
  } catch (error) {
    console.error('Error en /api/test-usuarios:', error);
    res.status(500).json({
      error: 'Error al obtener usuarios',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

export default app;

