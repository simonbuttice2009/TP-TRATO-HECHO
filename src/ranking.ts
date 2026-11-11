// ============================================================
// BLOQUE 1: Tipo de cada fila que manda /api/ranking
// ============================================================

// Describe la forma de cada jugador que devuelve el servidor.
// TypeScript usa esto para avisarnos si nos equivocamos con un nombre de campo.
interface FilaRanking {
    nombre: string;    // nombre del jugador
    puntaje: number;   // mejor puntaje (plata ganada)
    partidas: number;  // cantidad de partidas jugadas
}

// ============================================================
// BLOQUE 2: Buscar los elementos de la página
// ============================================================

// querySelector devuelve el elemento o null si no existe en el HTML,
// por eso más abajo se verifica que ninguno sea null antes de usarlos.
const cuerpoTabla = document.querySelector<HTMLTableSectionElement>("#tabla-ranking tbody");
const mensajeRanking = document.querySelector<HTMLParagraphElement>("#mensaje-ranking");
const botonVolver = document.querySelector<HTMLButtonElement>("#boton-volver");

// ============================================================
// BLOQUE 3: Pedir el ranking al servidor y dibujar la tabla
// ============================================================

/**
 * Pide el ranking a la API y arma una fila de la tabla por cada jugador.
 * Recibe el <tbody> donde se agregan las filas y el párrafo donde se muestran mensajes.
 * No devuelve nada (Promise<void>): trabaja directamente sobre la página.
 */
async function cargarRanking(
    cuerpo: HTMLTableSectionElement,
    mensaje: HTMLParagraphElement
): Promise<void> {
    try {
        // Pedido GET al servidor; "await" espera la respuesta sin trabar la página
        const respuesta = await fetch("/api/ranking");

        // 401 = no hay sesión iniciada: mandamos al login
        if (respuesta.status === 401) {
            window.location.href = "/login.html";
            return;
        }
        // Cualquier otro error del servidor (500, 404, etc.) se trata como falla
        if (!respuesta.ok) throw new Error("No se pudo cargar el ranking.");

        // Convertimos el JSON recibido en un arreglo de FilaRanking
        const ranking: FilaRanking[] = await respuesta.json();

        // Si nadie jugó todavía, avisamos y no dibujamos nada
        if (ranking.length === 0) {
            mensaje.textContent = "Todavía no hay partidas jugadas.";
            return;
        }

        // Crear una fila por cada jugador
        ranking.forEach((fila, indice) => {
            const filaTabla = document.createElement("tr");

            // Los textos de las 4 columnas: posición, nombre, puntaje y partidas
            const textos = [
                String(indice + 1),                              // posición (el índice arranca en 0)
                fila.nombre,
                "$" + fila.puntaje.toLocaleString("es-AR"),      // formato argentino: $1.000.000
                String(fila.partidas)
            ];

            // Una celda <td> por cada texto
            for (const texto of textos) {
                const celda = document.createElement("td");
                celda.textContent = texto;   // textContent: el texto nunca se interpreta como HTML
                filaTabla.append(celda);
            }
            cuerpo.append(filaTabla);
        });
    } catch (error) {
        // Si el servidor está apagado o hay un error de red, se cae acá
        mensaje.textContent = "No se pudo cargar el ranking. Revisá que el servidor esté corriendo.";
    }
}

// ============================================================
// BLOQUE 4: Botón para volver al juego y carga inicial
// ============================================================

// Solo arrancamos si los tres elementos existen en el HTML
if (cuerpoTabla !== null && mensajeRanking !== null && botonVolver !== null) {
    // Al hacer clic, volvemos a la página principal del juego
    botonVolver.addEventListener("click", () => {
        window.location.href = "/";
    });
    // Apenas carga la página, pedimos el ranking
    cargarRanking(cuerpoTabla, mensajeRanking);
}