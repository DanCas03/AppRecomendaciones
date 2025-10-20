import { ObjectId } from 'mongodb';

/**
 * Características de audio de una canción según Spotify API
 */
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

/**
 * Propiedades de una canción según la estructura de la base de datos
 */
interface Props {
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
    fecha_creacion?: Date;
}

/**
 * Clase que representa una canción del sistema
 */
export class Song {
    public props: Props;

    constructor(props: Props) {
        this.props = props;
    }

    /**
     * Comparación normalizada entre dos valores numéricos
     * Para referencia:
     * - Resultado entre 0.00 y 0.01: muy similar
     * - Resultado entre 0.01 y 0.05: similar
     * - Resultado entre 0.05 y 0.15: medianamente similar
     * - Resultado entre 0.15 y 0.30: poco similar
     * - Resultado mayor a 0.30: muy poco similar
     */
    private normalizedComparation(value1: number, value2: number): number {
        if (value1 === 0 && value2 === 0) return 0;
        return ((value1 ** 2 - value2 ** 2) / (value1 ** 2 + value2 ** 2)) ** 2;
    }

    /**
     * Compara esta canción con otra y retorna un score de similitud
     * @param other - Otra canción para comparar
     * @returns Score normalizado entre 0 (idénticas) y 1 (muy diferentes)
     */
    compareTo(other: Song): number {
        let score = 0;
        const audio1 = this.props.caracteristicas_audio;
        const audio2 = other.props.caracteristicas_audio;

        // Comparar características de audio
        score += this.normalizedComparation(this.props.duracion_ms, other.props.duracion_ms);
        score += this.normalizedComparation(audio1.energy, audio2.energy);
        score += this.normalizedComparation(audio1.loudness, audio2.loudness);
        score += this.normalizedComparation(audio1.speechiness, audio2.speechiness);
        score += this.normalizedComparation(audio1.acousticness, audio2.acousticness);
        score += this.normalizedComparation(audio1.instrumentalness, audio2.instrumentalness);
        score += this.normalizedComparation(audio1.liveness, audio2.liveness);
        score += this.normalizedComparation(audio1.valence, audio2.valence);
        score += this.normalizedComparation(audio1.tempo, audio2.tempo);
        score += this.normalizedComparation(audio1.danceability, audio2.danceability);
        
        // Comparar atributos discretos
        score += this.props.explicito === other.props.explicito ? 0 : 1;
        score += this.normalizedComparation(audio1.key, audio2.key);
        score += this.normalizedComparation(audio1.mode, audio2.mode);
        score += this.normalizedComparation(audio1.time_signature, audio2.time_signature);

        return score / 14; // Normalizado entre 0 y 1
    }

    /**
     * Verifica si dos canciones comparten al menos un artista
     */
    comparteArtista(other: Song): boolean {
        return this.props.artista_ids.some(id => other.props.artista_ids.includes(id));
    }

    /**
     * Verifica si dos canciones son del mismo género
     */
    mismoGenero(other: Song): boolean {
        return this.props.genero_id === other.props.genero_id;
    }

    /**
     * Verifica si dos canciones son del mismo álbum
     */
    mismoAlbum(other: Song): boolean {
        return this.props.album_id === other.props.album_id;
    }
}