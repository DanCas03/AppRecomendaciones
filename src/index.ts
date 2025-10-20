import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

app.use(express.json());

// Endpoint GET
app.get('/saludo', (_req: Request, res: Response) => {
    res.send('¡Hola desde TypeScript!');
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
