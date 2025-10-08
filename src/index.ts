/**
 * Punto de entrada principal de la aplicación
 */

// Función de ejemplo con tipos de TypeScript
function saludar(nombre: string): string {
  return `¡Hola, ${nombre}! Bienvenido a TypeScript con Node.js`;
}

// Interfaz de ejemplo
interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

// Clase de ejemplo
class Aplicacion {
  private usuarios: Usuario[] = [];

  constructor(private nombreApp: string) {
    console.log(`Iniciando aplicación: ${this.nombreApp}`);
  }

  agregarUsuario(usuario: Usuario): void {
    this.usuarios.push(usuario);
    console.log(`Usuario agregado: ${usuario.nombre}`);
  }

  listarUsuarios(): Usuario[] {
    return this.usuarios;
  }
}

// Ejecución principal
async function main(): Promise<void> {
  console.log(saludar('TypeScript'));
  
  const app = new Aplicacion('Mi Proyecto TypeScript');
  
  app.agregarUsuario({
    id: 1,
    nombre: 'Daniel',
    email: 'daniel@ejemplo.com'
  });

  const usuarios = app.listarUsuarios();
  console.log('Usuarios registrados:', usuarios);
}

// Ejecutar la aplicación
main().catch((error) => {
  console.error('Error en la aplicación:', error);
  process.exit(1);
});

