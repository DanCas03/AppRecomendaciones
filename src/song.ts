interface Props{
    nombre: string;
    artistas: string[];
    explicit: boolean;
    release_date: Date;
    duration_ms: number;
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
export class Song {
    public props: Props;

    constructor(props:Props) {
        this.props = props;
    }


    //Para referencia:
    //Resultado entre 0.00 y 0.01: muy similar
    //Resultado entre 0.01 y 0.05: similar
    //Resultado entre 0.05 y 0.15: medianamente similar
    //Resultado entre 0.15 y 0.30: poco similar
    //Resultado mayor a 0.30: muy poco similar
    normalizedComparation(value1:number, value2:number):number{
        if(value1 === 0 && value2 === 0) return 0;
        return ((value1**2 - value2**2) / (value1**2 + value2**2))**2;
    }

    dateComparation(date1: Date, date2: Date): number {
        const year1 = date1.getFullYear();
        const year2 = date2.getFullYear();

        if (year1 === year2) return 0;

        const y1 = year1 - 1920;
        const y2 = year2 - 1920;

        return ((y1**2 - y2**2) / (y1**2 + y2**2))**2;
    }

    compareTo(other: Song): number {
        let score = 0;
        score += this.normalizedComparation(this.props.duration_ms, other.props.duration_ms);
        score += this.normalizedComparation(this.props.energy, other.props.energy);
        score += this.normalizedComparation(this.props.loudness, other.props.loudness);
        score += this.normalizedComparation(this.props.speechiness, other.props.speechiness);
        score += this.normalizedComparation(this.props.acousticness, other.props.acousticness);
        score += this.normalizedComparation(this.props.instrumentalness, other.props.instrumentalness);
        score += this.normalizedComparation(this.props.liveness, other.props.liveness);
        score += this.normalizedComparation(this.props.valence, other.props.valence);
        score += this.normalizedComparation(this.props.tempo, other.props.tempo);
        score += this.props.explicit === other.props.explicit ? 0 : 1;
        score += this.normalizedComparation(this.props.key, other.props.key);
        score += this.normalizedComparation(this.props.mode, other.props.mode);
        score += this.normalizedComparation(this.props.time_signature, other.props.time_signature);
        score += this.dateComparation(this.props.release_date, other.props.release_date);
        return score/14; // Normalizado entre 0 y 1
    }
}