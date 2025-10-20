# Proyecto Node.js con TypeScript, Express y MongoDB

Este es un proyecto base de Node.js configurado con TypeScript, Express y MongoDB, siguiendo las mejores prácticas de desarrollo.

## 📋 Requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB Atlas (o instancia local de MongoDB)

## 🚀 Instalación

```bash
npm install
```

## ⚙️ Configuración

1. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Configuración del servidor
NODE_ENV=development
PORT=3000

# Configuración de MongoDB
MONGO_URI=tu_uri_de_mongodb
DB_NAME=nombre_de_tu_base_de_datos

# Otras configuraciones
API_VERSION=v1
```

2. Asegúrate de tener acceso a una base de datos MongoDB (MongoDB Atlas o local)

## 💻 Scripts Disponibles

### Desarrollo

```bash
# Ejecutar en modo desarrollo con recarga automática
npm run dev
```

### Compilación

```bash
# Compilar TypeScript a JavaScript
npm run build

# Limpiar directorio de compilación
npm run clean

# Limpiar y compilar
npm run rebuild

# Compilar en modo watch (observar cambios)
npm run watch
```

### Producción

```bash
# Ejecutar versión compilada
npm start
```

### Verificación

```bash
# Verificar tipos sin compilar
npm run type-check

# Probar conexión a base de datos
npm run test:db
```

## 📁 Estructura del Proyecto

```
.
├── src/
│   ├── config/
│   │   └── database.ts      # Configuración de MongoDB
│   ├── app.ts              # Configuración de Express
│   ├── server.ts           # Punto de entrada del servidor
│   └── index.ts            # Archivo de ejemplo original
├── dist/                   # Código compilado (generado)
├── node_modules/           # Dependencias
├── .env                    # Variables de entorno (no incluido en Git)
├── .gitignore             # Archivos ignorados por Git
├── nodemon.json           # Configuración de Nodemon
├── package.json           # Dependencias y scripts
├── tsconfig.json          # Configuración de TypeScript
└── README.md              # Este archivo
```

## 🌐 Rutas API Disponibles

Una vez que el servidor esté corriendo, puedes probar las siguientes rutas:

### Rutas de Prueba

- **GET** `http://localhost:3000/`
  - Página principal con información del servidor

- **GET** `http://localhost:3000/health`
  - Health check del servidor

### Rutas de MongoDB

- **GET** `http://localhost:3000/api/test-db`
  - Prueba la conexión a MongoDB y lista las colecciones disponibles

- **POST** `http://localhost:3000/api/test-insert`
  - Inserta un documento de prueba en la colección `test_usuarios`
  - Body (opcional):
    ```json
    {
      "nombre": "Juan Pérez",
      "email": "juan@ejemplo.com"
    }
    ```

- **GET** `http://localhost:3000/api/test-usuarios`
  - Obtiene todos los usuarios de prueba insertados

## 🧪 Probando el Proyecto

### 1. Ejecutar el servidor

```bash
npm run dev
```

### 2. Probar las rutas con cURL

```bash
# Probar página principal
curl http://localhost:3000/

# Probar health check
curl http://localhost:3000/health

# Probar conexión a MongoDB
curl http://localhost:3000/api/test-db

# Insertar un usuario de prueba
curl -X POST http://localhost:3000/api/test-insert \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Daniel","email":"daniel@ejemplo.com"}'

# Obtener usuarios
curl http://localhost:3000/api/test-usuarios
```

### 3. Probar con Postman o Thunder Client

Importa las siguientes peticiones:

1. **GET** `http://localhost:3000/`
2. **GET** `http://localhost:3000/api/test-db`
3. **POST** `http://localhost:3000/api/test-insert` con body JSON
4. **GET** `http://localhost:3000/api/test-usuarios`

## 🛠️ Tecnologías Utilizadas

### Dependencias de Producción

- **express** - Framework web para Node.js
- **mongodb** - Driver oficial de MongoDB para Node.js
- **dotenv** - Gestión de variables de entorno

### Dependencias de Desarrollo

- **typescript** - Lenguaje con tipado estático
- **@types/node** - Tipos de TypeScript para Node.js
- **@types/express** - Tipos de TypeScript para Express
- **ts-node** - Ejecutor de TypeScript
- **nodemon** - Recarga automática en desarrollo

## 📝 Características

### Configuración de TypeScript

- ✅ Compilación estricta de tipos
- ✅ Soporte para módulos CommonJS
- ✅ Generación de source maps
- ✅ Archivos de declaración de tipos
- ✅ Validaciones estrictas habilitadas

### Configuración de MongoDB

- ✅ Conexión singleton reutilizable
- ✅ Manejo de errores robusto
- ✅ Cierre graceful de conexiones
- ✅ Soporte para MongoDB Atlas
- ✅ Logging detallado de conexiones

### Configuración de Express

- ✅ Middlewares de JSON y URL encoding
- ✅ Logging de peticiones
- ✅ Manejo de errores global
- ✅ Rutas de prueba para MongoDB
- ✅ Health checks

## 🔐 Seguridad

- ⚠️ **IMPORTANTE**: Nunca subas el archivo `.env` al control de versiones
- ⚠️ Las credenciales de MongoDB deben mantenerse privadas
- ⚠️ Usa variables de entorno para información sensible

## 🚧 Próximos Pasos

1. **Crear modelos de datos**
   - Define interfaces y tipos para tus documentos
   - Crea funciones de validación

2. **Implementar rutas CRUD**
   - Crear, leer, actualizar y eliminar documentos
   - Organizar rutas en módulos separados

3. **Agregar validación**
   - Instalar `express-validator` o `joi`
   - Validar datos de entrada

4. **Implementar autenticación**
   - JWT, OAuth, o sesiones
   - Middleware de autenticación

5. **Agregar pruebas**
   - Jest para unit tests
   - Supertest para integration tests

## 📚 Recursos Útiles

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/es/guide/routing.html)
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

## 🐛 Solución de Problemas

### Error de conexión a MongoDB

- Verifica que tu IP esté en la lista blanca de MongoDB Atlas
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que la URI de conexión sea válida

### El servidor no inicia

- Verifica que el puerto 3000 no esté en uso
- Revisa los logs para errores específicos
- Asegúrate de haber ejecutado `npm install`

### Errores de TypeScript

- Ejecuta `npm run type-check` para ver todos los errores
- Verifica que todas las dependencias estén instaladas
- Revisa la configuración de `tsconfig.json`

## 📄 Licencia

ISC

---

**¡Feliz codificación! 🎉**
