# 📊 Estructura de la Base de Datos - Music Database

## 🎯 Información General

- **Base de Datos**: `music_database`
- **Motor**: MongoDB Atlas (Cloud)
- **Total de Documentos**: ~190,000+
- **Colecciones**: 4 (géneros, artistas, álbumes, canciones)

---

## 📁 Colecciones

### 1. **generos** (114 documentos)

Almacena todos los géneros musicales únicos del dataset.

#### Estructura del Documento

```json
{
  "_id": 1,
  "nombre": "acoustic",
  "fecha_creacion": ISODate("2025-10-20T...")
}
```

#### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | Integer | ID único del género |
| `nombre` | String | Nombre del género musical |
| `fecha_creacion` | Date | Timestamp de creación del registro |

#### Índices

- `_id_` (automático)
- `nombre_1` (optimiza búsquedas por nombre)

#### Ejemplos de Géneros

```
acoustic, afrobeat, alt-rock, alternative, ambient, anime, 
black-metal, bluegrass, blues, bossanova, brazil, breakbeat,
british, cantopop, chicago-house, children, chill, classical,
club, comedy, country, dance, dancehall, death-metal, deep-house,
detroit-techno, disco, disney, drum-and-bass, dub, dubstep,
edm, electro, electronic, emo, folk, forro, french, funk,
garage, german, gospel, goth, grindcore, groove, grunge,
guitar, happy, hard-rock, hardcore, hardstyle, heavy-metal,
hip-hop, holidays, honky-tonk, house, idm, indian, indie,
indie-pop, industrial, iranian, j-dance, j-idol, j-pop, j-rock,
jazz, k-pop, kids, latin, latino, malay, mandopop, metal,
metal-misc, metalcore, minimal-techno, movies, mpb, new-age,
new-release, opera, pagode, party, philippines-opm, piano, pop,
pop-film, post-dubstep, power-pop, progressive-house, psych-rock,
punk, punk-rock, r-n-b, rainy-day, reggae, reggaeton, road-trip,
rock, rock-n-roll, rockabilly, romance, sad, salsa, samba,
sertanejo, show-tunes, singer-songwriter, ska, sleep, songwriter,
soul, soundtracks, spanish, study, summer, swedish, synth-pop,
tango, techno, trance, trip-hop, turkish, work-out, world-music
```

---

### 2. **artistas** (29,858 documentos)

Almacena todos los artistas únicos. Cuando una canción tiene múltiples artistas (colaboraciones), cada uno se almacena por separado.

#### Estructura del Documento

```json
{
  "_id": 1523,
  "nombre": "The Beatles",
  "fecha_creacion": ISODate("2025-10-20T...")
}
```

#### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | Integer | ID único del artista |
| `nombre` | String | Nombre del artista o banda |
| `fecha_creacion` | Date | Timestamp de creación del registro |

#### Índices

- `_id_` (automático)
- `nombre_1` (optimiza búsquedas por nombre)

#### Notas

- Los artistas colaboradores están separados
- Ejemplo: "Jason Mraz;Colbie Caillat" se almacena como dos artistas separados
- Total de artistas únicos: 29,858

---

### 3. **albumes** (46,589 documentos)

Almacena todos los álbumes únicos del dataset.

#### Estructura del Documento

```json
{
  "_id": 15234,
  "nombre": "Abbey Road",
  "fecha_creacion": ISODate("2025-10-20T...")
}
```

#### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | Integer | ID único del álbum |
| `nombre` | String | Nombre del álbum |
| `fecha_creacion` | Date | Timestamp de creación del registro |

#### Índices

- `_id_` (automático)
- `nombre_1` (optimiza búsquedas por nombre)

#### Notas

- Incluye álbumes, EPs, singles y compilaciones
- Total de álbumes únicos: 46,589

---

### 4. **canciones** (114,000 documentos)

Colección principal que almacena todas las canciones con sus características de audio y referencias a las otras colecciones.

#### Estructura del Documento

```json
{
  "_id": ObjectId("..."),
  "track_id": "5SuOikwiRyPMVoIQDJUgSV",
  "nombre": "Comedy",
  "artista_ids": [1, 2],
  "album_id": 1,
  "genero_id": 1,
  "popularidad": 73,
  "duracion_ms": 230666,
  "explicito": false,
  "caracteristicas_audio": {
    "danceability": 0.676,
    "energy": 0.461,
    "key": 1,
    "loudness": -6.746,
    "mode": 0,
    "speechiness": 0.143,
    "acousticness": 0.0322,
    "instrumentalness": 0.00000101,
    "liveness": 0.358,
    "valence": 0.715,
    "tempo": 87.917,
    "time_signature": 4
  },
  "fecha_creacion": ISODate("2025-10-20T...")
}
```

#### Campos Principales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID único de MongoDB |
| `track_id` | String | ID de Spotify (puede tener duplicados) |
| `nombre` | String | Nombre de la canción |
| `artista_ids` | Array[Integer] | IDs de los artistas (referencias a colección artistas) |
| `album_id` | Integer | ID del álbum (referencia a colección albumes) |
| `genero_id` | Integer | ID del género (referencia a colección generos) |
| `popularidad` | Integer | Popularidad de 0 a 100 |
| `duracion_ms` | Integer | Duración en milisegundos |
| `explicito` | Boolean | Si contiene contenido explícito |
| `caracteristicas_audio` | Object | Características de audio de Spotify |
| `fecha_creacion` | Date | Timestamp de creación del registro |

#### Características de Audio

| Campo | Tipo | Rango | Descripción |
|-------|------|-------|-------------|
| `danceability` | Float | 0.0 - 1.0 | Qué tan adecuada es para bailar |
| `energy` | Float | 0.0 - 1.0 | Medida de intensidad y actividad |
| `key` | Integer | 0 - 11 | Tonalidad musical (0=C, 1=C#, etc.) |
| `loudness` | Float | -60 - 0 | Volumen general en dB |
| `mode` | Integer | 0 o 1 | Modalidad (0=menor, 1=mayor) |
| `speechiness` | Float | 0.0 - 1.0 | Presencia de palabras habladas |
| `acousticness` | Float | 0.0 - 1.0 | Confianza de que es acústica |
| `instrumentalness` | Float | 0.0 - 1.0 | Predice si no tiene vocales |
| `liveness` | Float | 0.0 - 1.0 | Presencia de audiencia |
| `valence` | Float | 0.0 - 1.0 | Positividad musical |
| `tempo` | Float | ~0 - 250 | BPM (beats por minuto) |
| `time_signature` | Integer | 3 - 7 | Compás musical |

#### Índices

- `_id_` (automático)
- `track_id_1` (optimiza búsquedas por track_id de Spotify)
- `nombre_1` (optimiza búsquedas por nombre)
- `artista_ids_1` (optimiza búsquedas por artista)
- `album_id_1` (optimiza búsquedas por álbum)
- `genero_id_1` (optimiza búsquedas por género)
- `popularidad_1` (optimiza ordenamiento por popularidad)

#### Notas

- **Track ID duplicados**: Es normal, la misma canción puede aparecer en múltiples géneros
- **Artistas múltiples**: Una canción puede tener varios artistas (array)
- Total de canciones: 114,000

---

## 🔗 Relaciones entre Colecciones

### Diagrama de Relaciones

```
┌─────────────┐
│   generos   │
│  (114 docs) │
└──────┬──────┘
       │
       │ genero_id
       │
┌──────▼──────────────┐
│     canciones       │
│   (114,000 docs)    │◄─────┐
└──────┬──────────────┘      │
       │                     │
       │ artista_ids[]       │ album_id
       │                     │
┌──────▼──────┐       ┌──────┴──────┐
│  artistas   │       │   albumes   │
│ (29,858)    │       │  (46,589)   │
└─────────────┘       └─────────────┘
```

### Tipo de Relaciones

1. **Género → Canciones**: Uno a Muchos
   - Un género puede tener muchas canciones
   - Una canción tiene un género

2. **Artista → Canciones**: Muchos a Muchos
   - Un artista puede tener muchas canciones
   - Una canción puede tener muchos artistas (colaboraciones)

3. **Álbum → Canciones**: Uno a Muchos
   - Un álbum puede tener muchas canciones
   - Una canción pertenece a un álbum

---

## 📝 Ejemplos de Consultas

### 1. Obtener una Canción Completa con Detalles

```javascript
// En MongoDB Shell o Compass
use music_database

// Obtener canción con información básica
db.canciones.findOne({ nombre: "Shape of You" })

// Obtener canción con información de artistas
const cancion = db.canciones.findOne({ nombre: "Shape of You" })
const artistas = db.artistas.find({ _id: { $in: cancion.artista_ids } }).toArray()
const album = db.albumes.findOne({ _id: cancion.album_id })
const genero = db.generos.findOne({ _id: cancion.genero_id })
```

### 2. Buscar Canciones por Artista

```javascript
// Primero encontrar el ID del artista
const artista = db.artistas.findOne({ nombre: "Ed Sheeran" })

// Luego buscar sus canciones
db.canciones.find({ artista_ids: artista._id })
```

### 3. Canciones Populares de un Género

```javascript
// Encontrar el género
const genero = db.generos.findOne({ nombre: "pop" })

// Buscar canciones populares de ese género
db.canciones.find({ 
  genero_id: genero._id, 
  popularidad: { $gte: 80 } 
}).sort({ popularidad: -1 }).limit(10)
```

### 4. Canciones con Alta "Danceability"

```javascript
db.canciones.find({ 
  "caracteristicas_audio.danceability": { $gte: 0.8 }
}).sort({ "caracteristicas_audio.danceability": -1 }).limit(20)
```

### 5. Estadísticas por Género

```javascript
db.canciones.aggregate([
  {
    $group: {
      _id: "$genero_id",
      total_canciones: { $sum: 1 },
      popularidad_promedio: { $avg: "$popularidad" },
      duracion_promedio: { $avg: "$duracion_ms" }
    }
  },
  { $sort: { total_canciones: -1 } },
  { $limit: 10 }
])
```

### 6. Artistas con Más Canciones

```javascript
db.canciones.aggregate([
  { $unwind: "$artista_ids" },
  {
    $group: {
      _id: "$artista_ids",
      total_canciones: { $sum: 1 }
    }
  },
  { $sort: { total_canciones: -1 } },
  { $limit: 20 }
])
```

---

## 🔍 Uso con TypeScript/Node.js

### Conexión

```typescript
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI!);
const db: Db = client.db(process.env.DB_NAME || 'music_database');
```

### Interfaces TypeScript

```typescript
interface Genero {
  _id: number;
  nombre: string;
  fecha_creacion: Date;
}

interface Artista {
  _id: number;
  nombre: string;
  fecha_creacion: Date;
}

interface Album {
  _id: number;
  nombre: string;
  fecha_creacion: Date;
}

interface CaracteristicasAudio {
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  time_signature: number;
}

interface Cancion {
  _id?: ObjectId;
  track_id: string;
  nombre: string;
  artista_ids: number[];
  album_id: number;
  genero_id: number;
  popularidad: number;
  duracion_ms: number;
  explicito: boolean;
  caracteristicas_audio: CaracteristicasAudio;
  fecha_creacion: Date;
}
```

### Ejemplo de Consulta

```typescript
// Buscar canciones populares
const cancionesPopulares = await db.collection<Cancion>('canciones')
  .find({ popularidad: { $gte: 80 } })
  .sort({ popularidad: -1 })
  .limit(20)
  .toArray();

// Buscar por artista
const artista = await db.collection<Artista>('artistas')
  .findOne({ nombre: /ed sheeran/i });

if (artista) {
  const canciones = await db.collection<Cancion>('canciones')
    .find({ artista_ids: artista._id })
    .toArray();
}

// Búsqueda con agregación
const estadisticas = await db.collection<Cancion>('canciones').aggregate([
  {
    $group: {
      _id: "$genero_id",
      total: { $sum: 1 },
      popularidad_promedio: { $avg: "$popularidad" }
    }
  }
]).toArray();
```

---

## 📈 Estadísticas de la Base de Datos

| Métrica | Valor |
|---------|-------|
| **Total de documentos** | ~190,561 |
| **Géneros únicos** | 114 |
| **Artistas únicos** | 29,858 |
| **Álbumes únicos** | 46,589 |
| **Canciones** | 114,000 |
| **Tamaño aproximado** | ~150-200 MB |
| **Índices totales** | 13 (9 personalizados + 4 _id) |

---

## 🎯 Casos de Uso

### 1. Sistema de Recomendaciones
- Usar características de audio para encontrar canciones similares
- Filtrar por género y popularidad
- Analizar patrones de artistas

### 2. Análisis Musical
- Estudiar tendencias por género
- Comparar características de audio entre géneros
- Analizar popularidad vs características

### 3. API de Búsqueda
- Búsqueda por nombre de canción
- Búsqueda por artista
- Filtrado por múltiples criterios

### 4. Playlist Generator
- Crear playlists basadas en mood (usando valence, energy)
- Playlists por tempo (workout, chill, etc.)
- Mezclar géneros con características similares

---

## 🔐 Consideraciones de Seguridad

- ✅ Base de datos en MongoDB Atlas (encriptación en tránsito)
- ✅ Autenticación requerida (usuario/contraseña)
- ✅ Network Access configurado (lista blanca de IPs)
- ✅ Variables sensibles en archivo `.env` (no versionado)

---

## 📚 Recursos Adicionales

- **MongoDB Atlas**: https://cloud.mongodb.com/
- **Spotify Audio Features**: https://developer.spotify.com/documentation/web-api/reference/get-audio-features
- **MongoDB Node.js Driver**: https://mongodb.github.io/node-mongodb-native/

---

**Fecha de creación**: Octubre 2025  
**Última actualización**: Octubre 2025  
**Versión**: 1.0

