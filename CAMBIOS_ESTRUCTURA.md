# 🔄 Cambios en la Estructura del Código

## 📋 Resumen

Se actualizaron las clases TypeScript para que coincidan con la nueva estructura de la base de datos MongoDB Atlas importada desde el dataset CSV.

---

## 📝 Archivos Modificados

### 1. **`src/song.ts`** - Clase Song

#### Cambios Principales

✅ **Nueva estructura de propiedades**:
- Cambió de estructura plana a estructura normalizada con referencias
- `track_id`: ID de Spotify
- `nombre`: Nombre de la canción
- `artista_ids`: Array de IDs de artistas (soporta colaboraciones)
- `album_id`: ID del álbum
- `genero_id`: ID del género
- `popularidad`: Métrica de popularidad (0-100)
- `duracion_ms`: Duración en milisegundos
- `explicito`: Boolean para contenido explícito
- `caracteristicas_audio`: Objeto con todas las características de audio

✅ **Eliminado**:
- `release_date` - No existe en la BD nueva
- `artistas` (string[]) - Reemplazado por `artista_ids` (number[])

✅ **Nuevos métodos**:
```typescript
// Verifica si comparten artista
comparteArtista(other: Song): boolean

// Verifica si son del mismo género
mismoGenero(other: Song): boolean

// Verifica si son del mismo álbum
mismoAlbum(other: Song): boolean
```

✅ **Método actualizado**:
```typescript
compareTo(other: Song): number
// Ahora usa caracteristicas_audio.danceability, energy, etc.
// Eliminó comparación de release_date
```

#### Interfaz `CaracteristicasAudio`

```typescript
interface CaracteristicasAudio {
    danceability: number;      // 0.0 - 1.0
    energy: number;            // 0.0 - 1.0
    key: number;               // 0 - 11
    loudness: number;          // -60 - 0 dB
    mode: number;              // 0 o 1
    speechiness: number;       // 0.0 - 1.0
    acousticness: number;      // 0.0 - 1.0
    instrumentalness: number;  // 0.0 - 1.0
    liveness: number;          // 0.0 - 1.0
    valence: number;           // 0.0 - 1.0
    tempo: number;             // BPM
    time_signature: number;    // 3 - 7
}
```

---

### 2. **`src/profile.ts`** - Clase Profile

#### Cambios Principales

✅ **Propiedades actualizadas**:
- Removido: `avg_release_year` (no existe en BD)
- Agregado: `avg_danceability` (nueva característica)
- Todos los campos ahora coinciden con `usuarios.json`

✅ **Estructura del perfil**:
```typescript
interface Props {
    nombre_usuario: string;
    contraseña: string;
    canciones_aceptadas: number;
    avg_duration: number;
    avg_explicit: number;
    avg_danceability: number;    // ← NUEVO
    avg_energy: number;
    avg_key: number;
    avg_loudness: number;
    avg_mode: number;
    avg_speechiness: number;
    avg_acousticness: number;
    avg_instrumentalness: number;
    avg_liveness: number;
    avg_valence: number;
    avg_tempo: number;
    avg_time_signature: number;
}
```

✅ **Método actualizado**:
```typescript
static async actualizarPreferenciasPerfil(cancion: Song, nombrePerfil: string)
// Ahora accede a las características con:
// cancion.props.caracteristicas_audio.danceability
// cancion.props.duracion_ms (en vez de duration_ms)
// cancion.props.explicito (en vez de explicit)
```

✅ **Nuevo método**:
```typescript
crearCancionIdeal(): Song
// Crea una canción "ideal" basada en el perfil del usuario
// Útil para buscar recomendaciones personalizadas
```

---

### 3. **`src/recommendations.ts`** - Sistema de Recomendaciones

#### Cambios Principales

✅ **Helper actualizado**:
```typescript
function documentToSong(doc: any): Song
// Convierte documentos de MongoDB a objetos Song
// Maneja la nueva estructura con caracteristicas_audio
```

✅ **Funciones existentes actualizadas**:

1. **`buscarCancionesSimilares`**
   ```typescript
   async function buscarCancionesSimilares(
       idealSong: Song, 
       threshold: number, 
       limit: number = 20
   ): Promise<Song[]>
   ```
   - Usa `caracteristicas_audio.danceability`, `energy`, etc.
   - Usa `duracion_ms` en vez de `duration_ms`
   - Usa `explicito` en vez de `explicit`
   - Excluye la canción de referencia
   - Agregado parámetro `limit`

2. **`retornarCanciones`**
   ```typescript
   async function retornarCanciones(cantidad: number = 100): Promise<Song[]>
   ```
   - Ahora retorna objetos `Song` en vez de documentos raw
   - Agregado parámetro `cantidad`

3. **`recomendacionAleatoria`**
   ```typescript
   async function recomendacionAleatoria(): Promise<Song>
   ```
   - Retorna objeto `Song` correctamente formateado
   - Agrega validación de resultados vacíos

4. **`recomendacionPorTempo`**
   ```typescript
   async function recomendacionPorTempo(
       referenceTempo: number, 
       rango: number = 5, 
       limit: number = 20
   ): Promise<Song[]>
   ```
   - Usa `caracteristicas_audio.tempo`
   - Agregado parámetro `rango` (variación de BPM)
   - Agregado parámetro `limit`

#### ✨ Nuevas Funciones Agregadas

5. **`recomendacionPorGenero`** ⭐ NUEVA
   ```typescript
   async function recomendacionPorGenero(
       generoId: number, 
       limit: number = 20, 
       ordenarPorPopularidad: boolean = true
   ): Promise<Song[]>
   ```
   - Busca canciones del mismo género por ID
   - Opción de ordenar por popularidad o alfabéticamente

6. **`recomendacionPorNombreGenero`** ⭐ NUEVA
   ```typescript
   async function recomendacionPorNombreGenero(
       nombreGenero: string, 
       limit: number = 20, 
       ordenarPorPopularidad: boolean = true
   ): Promise<Song[]>
   ```
   - Busca canciones del mismo género por nombre
   - Búsqueda case-insensitive
   - Útil para interfaces de usuario

7. **`recomendacionPorArtista`** ⭐ NUEVA
   ```typescript
   async function recomendacionPorArtista(
       artistaId: number, 
       limit: number = 20, 
       ordenarPorPopularidad: boolean = true
   ): Promise<Song[]>
   ```
   - Busca todas las canciones de un artista por ID
   - Opción de ordenar por popularidad o alfabéticamente

8. **`recomendacionPorNombreArtista`** ⭐ NUEVA
   ```typescript
   async function recomendacionPorNombreArtista(
       nombreArtista: string, 
       limit: number = 20, 
       ordenarPorPopularidad: boolean = true
   ): Promise<Song[]>
   ```
   - Busca canciones de un artista por nombre
   - Búsqueda case-insensitive
   - Útil para interfaces de usuario

9. **`recomendacionSimilarPorGenero`** ⭐ NUEVA
   ```typescript
   async function recomendacionSimilarPorGenero(
       idealSong: Song, 
       generoId: number, 
       threshold: number = 0.3, 
       limit: number = 20
   ): Promise<Song[]>
   ```
   - Combina búsqueda de similitud con filtro de género
   - Encuentra canciones similares DENTRO de un género específico
   - Perfecto para recomendaciones contextuales

---

## 🎯 Casos de Uso

### Ejemplo 1: Buscar canciones similares
```typescript
const cancion = new Song({...});
const similares = await buscarCancionesSimilares(cancion, 0.15, 10);
// Retorna hasta 10 canciones con score < 0.15 (muy similares)
```

### Ejemplo 2: Recomendación por género
```typescript
// Por ID
const rocksongs = await recomendacionPorGenero(45, 20, true);

// Por nombre
const popSongs = await recomendacionPorNombreGenero("pop", 20, true);
```

### Ejemplo 3: Recomendación por artista
```typescript
// Por ID
const artistaSongs = await recomendacionPorArtista(1523, 15);

// Por nombre
const beatlesSongs = await recomendacionPorNombreArtista("The Beatles", 15);
```

### Ejemplo 4: Canciones similares en un género específico
```typescript
const miCancion = new Song({...});
const jazzSimilar = await recomendacionSimilarPorGenero(miCancion, 35, 0.2, 10);
// Canciones de jazz similares a miCancion
```

### Ejemplo 5: Crear perfil ideal y buscar recomendaciones
```typescript
const perfil = new Profile({...});
const cancionIdeal = perfil.crearCancionIdeal();
const recomendaciones = await buscarCancionesSimilares(cancionIdeal, 0.2, 20);
```

---

## 🔗 Relación con la Base de Datos

### Colecciones Referenciadas

| Campo en Song | Colección | Campo en BD |
|---------------|-----------|-------------|
| `genero_id` | `generos` | `_id` (integer) |
| `artista_ids[]` | `artistas` | `_id` (integer) |
| `album_id` | `albumes` | `_id` (integer) |

### Flujo de Datos

```
MongoDB Atlas
    ↓
documentToSong()
    ↓
Song Object
    ↓
Funciones de Recomendación
    ↓
Array<Song>
```

---

## ✅ Checklist de Compatibilidad

- ✅ Todas las clases usan la nueva estructura de BD
- ✅ No hay referencias a campos eliminados (`release_date`, `artists` string)
- ✅ Todas las características de audio usan `caracteristicas_audio` object
- ✅ Los nombres de campos coinciden exactamente con MongoDB
- ✅ Se agregaron funciones para género y artista
- ✅ Todas las funciones retornan objetos `Song` correctamente formateados
- ✅ No hay errores de linting
- ✅ Los tipos TypeScript son correctos

---

## 📊 Resumen de Funciones de Recomendación

| Función | Tipo | Usa Similitud | Filtro | Nuevo |
|---------|------|---------------|--------|-------|
| `buscarCancionesSimilares` | Similitud | ✅ | - | Actualizada |
| `retornarCanciones` | Aleatorio | - | - | Actualizada |
| `recomendacionAleatoria` | Aleatorio | - | - | Actualizada |
| `recomendacionPorTempo` | Filtro | - | Tempo | Actualizada |
| `recomendacionPorGenero` | Filtro | - | Género | ⭐ Nueva |
| `recomendacionPorNombreGenero` | Filtro | - | Género | ⭐ Nueva |
| `recomendacionPorArtista` | Filtro | - | Artista | ⭐ Nueva |
| `recomendacionPorNombreArtista` | Filtro | - | Artista | ⭐ Nueva |
| `recomendacionSimilarPorGenero` | Híbrido | ✅ | Género | ⭐ Nueva |

---

## 🚀 Próximos Pasos Recomendados

1. ✅ Actualizar las rutas del servidor para usar las nuevas funciones
2. ✅ Agregar endpoints para las nuevas funciones de género y artista
3. ✅ Actualizar la documentación de la API
4. ✅ Crear tests unitarios para las nuevas funciones
5. ✅ Optimizar consultas con índices (ya creados en BD)

---

**Fecha de actualización**: Octubre 2025  
**Versión**: 2.0

