# Proyecto Node.js con TypeScript

Este es un proyecto base de Node.js configurado con TypeScript y las mejores prácticas de desarrollo.

## 📋 Requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0

## 🚀 Instalación

```bash
npm install
```

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

### Verificación de Tipos

```bash
# Verificar tipos sin compilar
npm run type-check
```

## 📁 Estructura del Proyecto

```
.
├── src/                  # Código fuente TypeScript
│   └── index.ts         # Punto de entrada principal
├── dist/                # Código compilado (generado)
├── node_modules/        # Dependencias
├── .gitignore          # Archivos ignorados por Git
├── nodemon.json        # Configuración de Nodemon
├── package.json        # Dependencias y scripts
├── tsconfig.json       # Configuración de TypeScript
└── README.md           # Este archivo
```

## 🛠️ Configuración

### TypeScript

El archivo `tsconfig.json` está configurado con:
- Compilación estricta de tipos
- Soporte para módulos CommonJS
- Generación de source maps
- Archivos de declaración de tipos

### Nodemon

El archivo `nodemon.json` configura la recarga automática al detectar cambios en archivos `.ts` y `.json` dentro de `src/`.

## 📝 Notas

- El código fuente TypeScript va en `src/`
- Los archivos compilados se generan en `dist/`
- El directorio `dist/` está excluido del control de versiones

## 🔧 Próximos Pasos

1. Instala las dependencias que necesites:
   ```bash
   npm install express
   npm install --save-dev @types/express
   ```

2. Configura tus variables de entorno en un archivo `.env`

3. ¡Comienza a desarrollar en `src/index.ts`!

## 📚 Recursos

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [npm Documentation](https://docs.npmjs.com/)

