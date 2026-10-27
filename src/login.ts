// ============================================================
// BLOQUE 1: Tipo de la respuesta del servidor
// ============================================================
interface RespuestaLogin {
    mensaje: string;
}

// ============================================================
// BLOQUE 2: Buscar los elementos de la página
// ============================================================
const formLogin = document.querySelector<HTMLFormElement>("#form-login");
const formRegistro = document.querySelector<HTMLFormElement>("#form-registro");
const mensajeLogin = document.querySelector<HTMLParagraphElement>("#mensaje-login");

// ============================================================
// BLOQUE 3: Enviar usuario y contraseña al servidor
// Si sale bien, va al juego; si no, muestra el error
// ============================================================
async function enviarCredenciales(
    url: string,
    nombre: string,
    contrasena: string,
    mensaje: HTMLParagraphElement
): Promise<void> {
    mensaje.textContent = "";
    try {
        const respuesta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, contrasena })
        });
        const resultado: RespuestaLogin = await respuesta.json();
        // fetch no falla solo con un 400 o 401, por eso revisamos respuesta.ok
        if (!respuesta.ok) throw new Error(resultado.mensaje);
        window.location.href = "/";
    } catch (error) {
        if (error instanceof TypeError) {
            mensaje.textContent = "No se pudo conectar con el servidor. ¿Está corriendo node build/index.js?";
        } else if (error instanceof Error) {
            mensaje.textContent = error.message;
        } else {
            mensaje.textContent = "Ocurrió un error.";
        }
    }
}

// ============================================================
// BLOQUE 4: Conectar cada formulario con su ruta de la API
// ============================================================
if (formLogin !== null && formRegistro !== null && mensajeLogin !== null) {
    // Inicio de sesión
    formLogin.addEventListener("submit", (evento) => {
        evento.preventDefault();   // evita que la página se recargue sola
        const campos = new FormData(formLogin);
        enviarCredenciales(
            "/api/login",
            String(campos.get("nombre")),
            String(campos.get("contrasena")),
            mensajeLogin
        );
    });

    // Registro
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