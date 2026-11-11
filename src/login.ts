// ============================================================
// BLOQUE 1: Tipo de la respuesta del servidor
// ============================================================

// El servidor responde con un JSON que trae un texto (por ejemplo, el motivo del error)
interface RespuestaLogin {
    mensaje: string;
}

// ============================================================
// BLOQUE 2: Buscar los elementos de la página
// ============================================================

// Pueden ser null si el id no existe en el HTML, por eso se verifican en el Bloque 4
const formLogin = document.querySelector<HTMLFormElement>("#form-login");
const formRegistro = document.querySelector<HTMLFormElement>("#form-registro");
const mensajeLogin = document.querySelector<HTMLParagraphElement>("#mensaje-login");

// ============================================================
// BLOQUE 3: Enviar usuario y contraseña al servidor
// Si sale bien, va al juego; si no, muestra el error
// ============================================================

/**
 * Manda nombre y contraseña por POST a la ruta indicada.
 * Sirve tanto para iniciar sesión como para registrarse: lo único que cambia es la url.
 * Recibe la url de la API, el nombre, la contraseña y el párrafo donde mostrar errores.
 * No devuelve nada: si todo sale bien redirige al juego, si no muestra un mensaje.
 */
async function enviarCredenciales(
    url: string,
    nombre: string,
    contrasena: string,
    mensaje: HTMLParagraphElement
): Promise<void> {
    mensaje.textContent = "";   // limpiamos el error anterior
    try {
        // Pedido POST con los datos en formato JSON
        const respuesta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, contrasena })
        });
        const resultado: RespuestaLogin = await respuesta.json();
        // fetch no falla solo con un 400 o 401, por eso revisamos respuesta.ok
        if (!respuesta.ok) throw new Error(resultado.mensaje);
        // Todo bien: vamos a la página del juego
        window.location.href = "/";
    } catch (error) {
        // TypeError = fetch no pudo conectar (servidor apagado o sin red)
        if (error instanceof TypeError) {
            mensaje.textContent = "No se pudo conectar con el servidor. ¿Está corriendo node build/index.js?";
        // Error = el que lanzamos nosotros arriba con el mensaje del servidor
        } else if (error instanceof Error) {
            mensaje.textContent = error.message;
        // Cualquier otra cosa inesperada
        } else {
            mensaje.textContent = "Ocurrió un error.";
        }
    }
}

// ============================================================
// BLOQUE 4: Conectar cada formulario con su ruta de la API
// ============================================================

// Solo se conectan los eventos si los tres elementos existen en el HTML
if (formLogin !== null && formRegistro !== null && mensajeLogin !== null) {
    // Inicio de sesión
    formLogin.addEventListener("submit", (evento) => {
        evento.preventDefault();   // evita que la página se recargue sola
        // FormData lee los valores de los inputs usando el atributo "name" de cada uno
        const campos = new FormData(formLogin);
        enviarCredenciales(
            "/api/login",
            String(campos.get("nombre")),
            String(campos.get("contrasena")),
            mensajeLogin
        );
    });

    // Registro (mismo proceso, pero contra la ruta de registro)
    formRegistro.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const campos = new FormData(formRegistro);
        enviarCredenciales(
            "/api/registro",
            String(campos.get("nombre")),
            String(campos.get("contrasena")),
            mensajeLogin
        );
    });
}