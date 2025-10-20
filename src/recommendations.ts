import { connectDB } from "./database";
import { MongoClient } from "mongodb";
import { Song } from "./song";



function normalizedExpr(field: string, refValue: number) {
  return {
    $cond: [
      { $and: [{ $eq: [`$${field}`, 0] }, { $eq: [refValue, 0] }] },
      0,
      {
        $pow: [
          {
            $divide: [
              {
                $subtract: [
                  { $pow: [`$${field}`, 2] },
                  Math.pow(refValue, 2)
                ]
              },
              {
                $add: [
                  { $pow: [`$${field}`, 2] },
                  Math.pow(refValue, 2)
                ]
              }
            ]
          },
          2
        ]
      }
    ]
  };
}

function dateComparationExpr(field: string, refDate: Date) {
    const refYear = new Date(refDate).getFullYear();
    return {
        $cond: [
        { $eq: [{ $year: `$${field}` }, refYear] },
        0,
        {
            $pow: [
            {
                $divide: [
                {
                    $subtract: [
                    { $pow: [{ $subtract: [{ $year: `$${field}` }, 1920] }, 2] },
                    Math.pow(refYear - 1920, 2)
                    ]
                },
                {
                    $add: [
                    { $pow: [{ $subtract: [{ $year: `$${field}` }, 1920] }, 2] },
                    Math.pow(refYear - 1920, 2)
                    ]
                }
                ]
            },
            2
            ]
        }
        ]
    };
    }

export async function buscarCancionesSimilares(idealSong: Song, threshold: number): Promise<Song[]> {
    let client: MongoClient | undefined;

    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;

        const exprScore = {
        $divide: [
            {
            $add: [
                normalizedExpr('duration_ms', idealSong.props.duration_ms),
                normalizedExpr('energy', idealSong.props.energy),
                normalizedExpr('loudness', idealSong.props.loudness),
                normalizedExpr('speechiness', idealSong.props.speechiness),
                normalizedExpr('acousticness', idealSong.props.acousticness),
                normalizedExpr('instrumentalness', idealSong.props.instrumentalness),
                normalizedExpr('liveness', idealSong.props.liveness),
                normalizedExpr('valence', idealSong.props.valence),
                normalizedExpr('tempo', idealSong.props.tempo),
                { $cond: [{ $eq: ['$explicit', idealSong.props.explicit] }, 0, 1] },
                normalizedExpr('key', idealSong.props.key),
                normalizedExpr('mode', idealSong.props.mode),
                normalizedExpr('time_signature', idealSong.props.time_signature),
                dateComparationExpr('release_date', idealSong.props.release_date)
            ]
            },
            14
        ]
        };
        const results = await db.collection('canciones').find({
        $expr: { $lt: [exprScore, threshold] }
        }).toArray();

        return results.map(doc => {
        const props = {
            nombre: doc.name,
            artistas: doc.artists,
            explicit: doc.explicit,
            release_date: new Date(doc.release_date),
            duration_ms: doc.duration_ms,
            energy: doc.energy,
            key: doc.key,
            loudness: doc.loudness,
            mode: doc.mode,
            speechiness: doc.speechiness,
            acousticness: doc.acousticness,
            instrumentalness: doc.instrumentalness,
            liveness: doc.liveness,
            valence: doc.valence,
            tempo: doc.tempo,
            time_signature: doc.time_signature
        };
        return new Song(props);
        });
    } catch (error) {
        console.error('Error al buscar canciones similares:', error);
        throw error;
    } finally {
        if (client) {
        await client.close();
        }
    }
    }

export async function retornarCanciones() {
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        return await db.collection('canciones').aggregate([
        { $sample: { size: 100 } }
        ]).toArray();
    } 
    catch (error) {
        console.error('Error al buscar canciones similares:', error);
        throw error;
    }
    finally{
        if(client){
        await client.close();
        }
    }
}

export async function recomendacionAleatoria(): Promise<Song>{
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        let results=await db.collection('canciones').aggregate([
        { $sample: { size: 1 } }
        ]).toArray();
        return results.map(doc => {
        const props = {
            nombre: doc.name,
            artistas: doc.artists,
            explicit: doc.explicit,
            release_date: new Date(doc.release_date),
            duration_ms: doc.duration_ms,
            energy: doc.energy,
            key: doc.key,
            loudness: doc.loudness,
            mode: doc.mode,
            speechiness: doc.speechiness,
            acousticness: doc.acousticness,
            instrumentalness: doc.instrumentalness,
            liveness: doc.liveness,
            valence: doc.valence,
            tempo: doc.tempo,
            time_signature: doc.time_signature
        };
        return new Song(props);
        })[0];
    } 
    catch (error) {
        console.error('Error al buscar canciones similares:', error);
        throw error;
    }
    finally{
        if(client){
        await client.close();
        }
    }
}

export async function recomendacionPorTempo(referenceTempo:number): Promise<Song[]>{
    let client: MongoClient | undefined;
    try {
        const { client: mongoClient, db } = await connectDB();
        client = mongoClient;
        let results= await db.collection('canciones').find({
        tempo: { $gte: referenceTempo - 2, $lte: referenceTempo + 2 }
        }).toArray();
        return results.map(doc => {
            const props = {
                nombre: doc.name,
                artistas: doc.artists,
                explicit: doc.explicit,
                release_date: new Date(doc.release_date),
                duration_ms: doc.duration_ms,
                energy: doc.energy,
                key: doc.key,
                loudness: doc.loudness,
                mode: doc.mode,
                speechiness: doc.speechiness,
                acousticness: doc.acousticness,
                instrumentalness: doc.instrumentalness,
                liveness: doc.liveness,
                valence: doc.valence,
                tempo: doc.tempo,
                time_signature: doc.time_signature
            };
            return new Song(props);
        });
    } 
    catch (error) {
        console.error('Error al buscar canciones similares:', error);
        throw error;
    }
    finally{
        if(client){
        await client.close();
        }
    }
}