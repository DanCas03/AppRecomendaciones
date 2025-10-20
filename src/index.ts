import express, { Request, Response } from 'express';
import { buscarCancionesSimilares, recomendacionAleatoria, recomendacionPorTempo, retornarCanciones } from './recommendations';
import { Song } from './song';
import { Profile } from './profile';

const app = express();
const port = 3000;

app.use(express.json());

// Endpoint GET
app.get('/saludo', (_req: Request, res: Response) => {
    res.send('¡Hola desde TypeScript!');
});

app.get('/recomendaciones', async (req: Request, res: Response) => {
    const params = req.body;
    const idealSong: Song = new Song(params);
    const recomendaciones = await buscarCancionesSimilares(idealSong,0.4);
    const recomendacionesLength=recomendaciones.length;
    const recomendacionDefinitiva=recomendaciones[Math.floor(Math.random() * (recomendacionesLength + 1))];
    res.json(recomendacionDefinitiva);
});

app.post('/updatePreferences', async(req:Request, res:Response) =>{
    const params = req.body;
    const profile:string= params.profile;
    const song:Song =new Song(params.song);
    Profile.actualizarPreferenciasPerfil(song,profile);
    res.send('Preferencias actualizadas').status(200);
});

app.get('/cancionAleatoria', async(_req:Request, res:Response)=>{
    return res.json(await recomendacionAleatoria());
})

app.get('/cancionPorTempo', async(req:Request, res:Response)=>{
    const tempo=req.params.tempo;
    const canciones=await recomendacionPorTempo(Number(tempo));
    const cancionesLength=canciones.length;
    const recomendacionDefinitiva=canciones[Math.floor(Math.random() * (cancionesLength + 1))];
    return res.json(recomendacionDefinitiva);
});

app.get('/prueba', async (_req:Request, res:Response) =>{
    res.json(await retornarCanciones());
})

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
