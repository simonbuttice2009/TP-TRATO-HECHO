// ============================================================
// BLOQUE 1: Tipo de cada fila que manda /api/ranking
// ============================================================
interface FilaRanking {
    nombre: string;
    puntaje: number;
    partidas: number;
}

// ============================================================
// BLOQUE 2: Buscar los elementos de la página
// ============================================================
const cuerpoTabla = document.querySelector<HTMLTableSectionElement>("#tabla-ranking tbody");
const mensajeRanking = document.querySelector<HTMLParagraphElement>("#mensaje-ranking");
const botonVolver = document.querySelector<HTMLButtonElement>("#boton-volver");

// ============================================================
// BLOQUE 3: Pedir el ranking al servidor y dibujar la tabla
// ============================================================
async function cargarRanking(
    cuerpo: HTMLTableSectionElement,
    mensaje: HTMLParagraphElement
): Promise<void> {
    try {
        const respuesta = await fetch("/api/ranking");

        // 401 = no hay sesión iniciada: mandamos al login
        if (respuesta.status === 401) {
            window.location.href = "/login.html";
            return;
        }
        if (!respuesta.ok) throw new Error("No se pudo cargar el ranking.");

        const ranking: FilaRanking[] = await respuesta.json();

        if (ranking.length === 0) {
            mensaje.textContent = "Todavía no hay partidas jugadas.";
            return;
        }

        // Crear una fila por cada jugador
        ranking.forEach((fila, indice) => {
            const filaTabla = document.createElement("tr");
            const textos = [
                String(indice + 1),
                fila.nombre,
                "$" + fila.puntaje.toLocaleString("es-AR"),
                String(fila.partidas)
            ];
            for (const texto of textos) {
                const celda = document.createElement("td");
                celda.textContent = texto;   // textContent: el texto nunca se interpreta como HTML
                filaTabla.append(celda);
            }
            cuerpo.append(filaTabla);
        });
    } catch (error) {
        mensaje.textContent = "No se pudo cargar el ranking. Revisá que el servidor esté corriendo.";
    }
}

// ============================================================
// BLOQUE 4: Botón para volver al juego y carga inicial
// ============================================================
if (cuerpoTabla !== null && mensajeRanking !== null && botonVolver !== null) {
    botonVolver.addEventListener("click", () => {
        window.location.href = "/";
    });
    cargarRanking(cuerpoTabla, mensajeRanking);
}