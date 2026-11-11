// ============================================================
// BLOQUE 1: Prueba de conexión
// Código de prueba inicial para comprobar que el TypeScript carga en la página
// ============================================================
const botonPrueba = document.querySelector<HTMLButtonElement>("#boton-prueba");
const mensajePrueba = document.querySelector<HTMLParagraphElement>("#mensaje-prueba");

if (botonPrueba !== null && mensajePrueba !== null) {
    botonPrueba.addEventListener("click", () => {
        mensajePrueba.textContent = "¡La conexión funciona!";
    });
}

// ============================================================
// BLOQUE 2: Tipos de datos del juego
// ============================================================

// Los cuatro momentos posibles de una partida
type EstadoPartida = "eligiendo-caja" | "abriendo-cajas" | "oferta" | "terminada";

// Una caja del tablero
interface Caja {
    numero: number;    // número visible (1 a 20)
    premio: number;    // plata que tiene adentro
    abierta: boolean;  // si ya fue abierta
}

// Todo el estado de una partida en curso
interface Partida {
    cajas: Caja[];              // las 20 cajas
    cajaJugador: number | null; // número de la caja del jugador (null hasta que elige)
    estado: EstadoPartida;      // en qué momento está la partida
    ronda: number;              // ronda actual (empieza en 0)
    abiertasEnRonda: number;    // cuántas cajas se abrieron en la ronda actual
    oferta: number;             // última oferta del banquero
    resultado: string;          // texto final que se muestra al terminar
}

// ============================================================
// BLOQUE 3: Constantes del juego
// ============================================================

// Los 20 premios posibles, de $1 a $1.000.000
const PREMIOS: number[] = [
    1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500,
    5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 500000, 1000000
];

// Cuántas cajas se abren en cada ronda antes de que llame el banquero (suman 18)
const CAJAS_POR_RONDA: number[] = [5, 4, 3, 2, 2, 1, 1];

// ============================================================
// BLOQUE 4: Crear una partida nueva
// ============================================================

/**
 * Mezcla una lista de números con el algoritmo Fisher-Yates.
 * Recibe la lista original y devuelve una copia mezclada (no modifica la original).
 */
function mezclar(lista: number[]): number[] {
    const copia = [...lista];
    // Recorremos de atrás para adelante intercambiando cada posición con una al azar
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

/**
 * Arma una partida lista para empezar: reparte los premios mezclados en 20 cajas cerradas.
 * No recibe nada y devuelve el objeto Partida con el estado inicial.
 */
function crearPartida(): Partida {
    const premiosMezclados = mezclar(PREMIOS);
    // A cada premio mezclado le asignamos un número de caja (indice + 1) y la dejamos cerrada
    const cajas: Caja[] = premiosMezclados.map((premio, indice) => ({
        numero: indice + 1,
        premio,
        abierta: false
    }));
    return {
        cajas,
        cajaJugador: null,
        estado: "eligiendo-caja",
        ronda: 0,
        abiertasEnRonda: 0,
        oferta: 0,
        resultado: ""
    };
}

// Variable global con la partida actual; se reemplaza al empezar una nueva
let partida: Partida = crearPartida();

// ============================================================
// BLOQUE 5: Buscar los elementos de la página
// ============================================================

/**
 * Busca un elemento del HTML por su selector y lo devuelve.
 * Si no existe, lanza un error con el nombre del selector, así sabemos enseguida qué falta.
 * Es genérica (<T>) para devolver el tipo de elemento exacto que se pide.
 */
function obtener<T extends HTMLElement>(selector: string): T {
    const elemento = document.querySelector<T>(selector);
    if (elemento === null) {
        throw new Error("No se encontró el elemento " + selector);
    }
    return elemento;
}

const tablero = obtener<HTMLDivElement>("#tablero");                      // contenedor de las 20 cajas
const listaMenores = obtener<HTMLUListElement>("#premios-menores");       // columna de premios chicos
const listaMayores = obtener<HTMLUListElement>("#premios-mayores");       // columna de premios grandes
const mensajeJuego = obtener<HTMLParagraphElement>("#mensaje-juego");     // instrucción para el jugador
const infoRonda = obtener<HTMLParagraphElement>("#info-ronda");           // "Ronda X de Y"
const panelBanquero = obtener<HTMLElement>("#banquero");                  // panel de la oferta
const ofertaMonto = obtener<HTMLParagraphElement>("#oferta-monto");       // monto ofrecido
const panelResultado = obtener<HTMLElement>("#resultado");                // panel de fin de partida
const resultadoTexto = obtener<HTMLParagraphElement>("#resultado-texto"); // texto del resultado
const botonTrato = obtener<HTMLButtonElement>("#boton-trato");
const botonNoTrato = obtener<HTMLButtonElement>("#boton-no-trato");
const botonNuevaPartida = obtener<HTMLButtonElement>("#boton-nueva-partida");

// ============================================================
// BLOQUE 6: Elementos de la barra de usuario y tipo de respuesta de /api/sesion
// ============================================================
const nombreUsuario = obtener<HTMLElement>("#nombre-usuario");
const botonRanking = obtener<HTMLButtonElement>("#boton-ranking");
const botonCerrarSesion = obtener<HTMLButtonElement>("#boton-cerrar-sesion");

// Forma de la respuesta del servidor al consultar la sesión
interface RespuestaSesion {
    logueado: boolean;  // true si hay un usuario con sesión iniciada
    nombre?: string;    // el "?" indica que puede no venir (si no hay sesión)
}

// ============================================================
// BLOQUE 7: Funciones auxiliares
// ============================================================

/** Convierte un número en texto con formato de dinero argentino: 1000000 → "$1.000.000" */
function formatearDinero(valor: number): string {
    return "$" + valor.toLocaleString("es-AR");
}

/** Devuelve los premios de las cajas que siguen cerradas (los que todavía pueden tocarle al jugador) */
function premiosEnJuego(): number[] {
    return partida.cajas
        .filter(caja => !caja.abierta)
        .map(caja => caja.premio);
}

/** Devuelve los premios de las cajas ya abiertas (los que quedaron descartados) */
function premiosEliminados(): number[] {
    return partida.cajas
        .filter(caja => caja.abierta)
        .map(caja => caja.premio);
}

// ============================================================
// BLOQUE 8: Dibujar la pantalla (renderizado)
// ============================================================

/**
 * Dibuja las 20 cajas en el tablero según el estado actual.
 * Borra todo y lo vuelve a crear cada vez que se llama.
 */
function renderizarTablero(): void {
    tablero.replaceChildren();   // vacía el tablero

    for (const caja of partida.cajas) {
        const { numero, premio, abierta } = caja;
        const esDelJugador = numero === partida.cajaJugador;

        // Botón de la caja con sus clases de CSS según su situación
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "caja";
        if (esDelJugador) boton.classList.add("jugador");
        if (abierta) boton.classList.add("abierta");

        // Número de la caja
        const etiqueta = document.createElement("span");
        etiqueta.textContent = String(numero);
        boton.append(etiqueta);

        // Si está abierta muestra su premio; si es la del jugador muestra "TU CAJA"
        if (abierta) {
            const detalle = document.createElement("small");
            detalle.textContent = formatearDinero(premio);
            boton.append(detalle);
        } else if (esDelJugador) {
            const detalle = document.createElement("small");
            detalle.textContent = "TU CAJA";
            boton.append(detalle);
        }

        // La caja solo se puede tocar si el juego está activo, no está abierta y no es la del jugador
        const juegoActivo =
            partida.estado === "eligiendo-caja" || partida.estado === "abriendo-cajas";
        boton.disabled = !(juegoActivo && !abierta && !esDelJugador);

        boton.addEventListener("click", () => alHacerClicEnCaja(numero));
        tablero.append(boton);
    }
}

/**
 * Dibuja las dos columnas de premios (menores y mayores).
 * Los premios ya abiertos se tachan con la clase "eliminado".
 */
function renderizarPremios(): void {
    listaMenores.replaceChildren();
    listaMayores.replaceChildren();

    const eliminados = premiosEliminados();
    const ordenados = [...PREMIOS].sort((a, b) => a - b);  // de menor a mayor
    const mitad = ordenados.length / 2;                    // punto de corte entre las dos columnas

    ordenados.forEach((premio, indice) => {
        const item = document.createElement("li");
        item.textContent = formatearDinero(premio);
        if (eliminados.includes(premio)) {
            item.classList.add("eliminado");
        }
        // La primera mitad va a la columna de menores y la segunda a la de mayores
        if (indice < mitad) {
            listaMenores.append(item);
        } else {
            listaMayores.append(item);
        }
    });
}

/** Actualiza los textos de instrucciones y de ronda según el estado de la partida */
function actualizarMensajes(): void {
    if (partida.estado === "eligiendo-caja") {
        mensajeJuego.textContent = "Elegí tu caja. Es la que te quedás si no aceptás ningún trato.";
        infoRonda.textContent = "";
    } else if (partida.estado === "abriendo-cajas") {
        // Cuántas cajas faltan abrir en esta ronda
        const faltan = CAJAS_POR_RONDA[partida.ronda] - partida.abiertasEnRonda;
        mensajeJuego.textContent =
            `Tu caja es la número ${partida.cajaJugador}. Abrí ${faltan} ${faltan === 1 ? "caja más" : "cajas más"}.`;
        infoRonda.textContent = `Ronda ${partida.ronda + 1} de ${CAJAS_POR_RONDA.length}`;
    } else if (partida.estado === "oferta") {
        mensajeJuego.textContent = "¡Llama el banquero! ¿Trato o no trato?";
        infoRonda.textContent = `Ronda ${partida.ronda + 1} de ${CAJAS_POR_RONDA.length}`;
    } else {
        mensajeJuego.textContent = "Fin de la partida.";
        infoRonda.textContent = "";
    }
}

/** Muestra u oculta el panel del banquero y el de resultado según el estado */
function actualizarPaneles(): void {
    panelBanquero.hidden = partida.estado !== "oferta";       // visible solo cuando hay oferta
    ofertaMonto.textContent = formatearDinero(partida.oferta);
    panelResultado.hidden = partida.estado !== "terminada";   // visible solo al terminar
    resultadoTexto.textContent = partida.resultado;
}

/** Redibuja toda la pantalla. Se llama después de cada cambio en la partida */
function renderizarTodo(): void {
    renderizarTablero();
    renderizarPremios();
    actualizarMensajes();
    actualizarPaneles();
}

// ============================================================
// BLOQUE 9: Lógica del juego
// ============================================================

/**
 * Devuelve la caja que eligió el jugador.
 * Lanza un error si todavía no eligió ninguna (no debería pasar en el flujo normal).
 */
function obtenerCajaJugador(): Caja {
    const caja = partida.cajas.find(c => c.numero === partida.cajaJugador);
    if (caja === undefined) {
        throw new Error("El jugador todavía no eligió su caja.");
    }
    return caja;
}

/**
 * Calcula la oferta del banquero: el promedio de los premios que siguen en juego
 * multiplicado por un factor que sube en cada ronda.
 * Devuelve el monto redondeado (a centenas si es de $1.000 o más, nunca menos de $1).
 */
function calcularOferta(): number {
    const disponibles = premiosEnJuego();
    const suma = disponibles.reduce((total, premio) => total + premio, 0);
    const promedio = suma / disponibles.length;
    const factor = 0.25 + partida.ronda * 0.1; // la oferta mejora ronda a ronda
    const oferta = promedio * factor;
    return oferta >= 1000 ? Math.round(oferta / 100) * 100 : Math.max(1, Math.round(oferta));
}

/**
 * Se ejecuta cuando el jugador hace clic en una caja. Según el estado:
 * - eligiendo-caja: la caja pasa a ser la del jugador.
 * - abriendo-cajas: se abre la caja; si se completó la ronda, llama el banquero.
 * - otros estados: no hace nada.
 */
function alHacerClicEnCaja(numero: number): void {
    const caja = partida.cajas.find(c => c.numero === numero);
    if (caja === undefined) return;

    if (partida.estado === "eligiendo-caja") {
        partida.cajaJugador = numero;
        partida.estado = "abriendo-cajas";
    } else if (partida.estado === "abriendo-cajas") {
        // Seguridad extra: no se puede abrir una caja ya abierta ni la propia
        if (caja.abierta || numero === partida.cajaJugador) return;
        caja.abierta = true;
        partida.abiertasEnRonda++;
        // Si ya se abrieron todas las cajas de la ronda, el banquero hace su oferta
        if (partida.abiertasEnRonda === CAJAS_POR_RONDA[partida.ronda]) {
            partida.estado = "oferta";
            partida.oferta = calcularOferta();
        }
    } else {
        return;
    }
    renderizarTodo();   // se redibuja la pantalla con el nuevo estado
}

// ============================================================
// BLOQUE 10: Verificar que haya una sesión iniciada
// Si no la hay, manda al login. Si la hay, muestra el nombre.
// ============================================================

/**
 * Consulta al servidor si hay un usuario logueado.
 * Si lo hay, muestra su nombre en la barra; si no, redirige a la página de login.
 */
async function verificarSesion(): Promise<void> {
    try {
        const respuesta = await fetch("/api/sesion");
        const datos: RespuestaSesion = await respuesta.json();

        if (datos.logueado) {
            nombreUsuario.textContent = datos.nombre ?? "";   // "??" usa "" si el nombre no vino
        } else {
            window.location.href = "/login.html";
        }
    } catch (error) {
        // Servidor apagado o sin conexión
        mensajeJuego.textContent = "No se pudo conectar con el servidor. ¿Está corriendo node build/index.js?";
    }
}

// ============================================================
// BLOQUE 11: Mandar el puntaje de la partida terminada al servidor
// ============================================================

/**
 * Envía el puntaje final (la plata ganada) al servidor por POST para que lo guarde en la base de datos.
 * Si falla, lo deja en la consola y avisa al jugador en el texto del resultado.
 */
async function guardarPuntaje(puntaje: number): Promise<void> {
    try {
        const respuesta = await fetch("/api/puntaje", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puntaje })
        });
        if (!respuesta.ok) throw new Error("El servidor rechazó el puntaje.");
    } catch (error) {
        console.error("No se pudo guardar el puntaje:", error);
        resultadoTexto.textContent += " (No se pudo guardar tu puntaje.)";
    }
}

// ============================================================
// BLOQUE 12: Aceptar o rechazar la oferta del banquero
// ============================================================

/**
 * El jugador acepta el trato: se queda con la oferta y la partida termina.
 * Se revela su caja para ver si ganó el banquero o el jugador, y se guarda la oferta como puntaje.
 */
function aceptarTrato(): void {
    const cajaPropia = obtenerCajaJugador();
    cajaPropia.abierta = true;
    partida.estado = "terminada";

    const oferta = formatearDinero(partida.oferta);
    const contenido = formatearDinero(cajaPropia.premio);
    // Si la caja valía más que la oferta, el jugador perdió contra el banquero
    if (cajaPropia.premio > partida.oferta) {
        partida.resultado = `Aceptaste ${oferta}. Tu caja tenía ${contenido}: esta vez ganó el banquero.`;
    } else {
        partida.resultado = `Aceptaste ${oferta}. Tu caja tenía ${contenido}: ¡le ganaste al banquero!`;
    }
    renderizarTodo();
    guardarPuntaje(partida.oferta);   // el puntaje es lo que aceptó
}

/**
 * El jugador rechaza la oferta: pasa a la ronda siguiente.
 * Si era la última ronda, se abre su caja y gana lo que tenga adentro.
 */
function rechazarTrato(): void {
    partida.ronda++;
    partida.abiertasEnRonda = 0;

    if (partida.ronda >= CAJAS_POR_RONDA.length) {
        // No quedan más rondas: se abre la caja propia y termina la partida
        const cajaPropia = obtenerCajaJugador();
        cajaPropia.abierta = true;
        partida.estado = "terminada";
        partida.resultado =
            `Rechazaste todas las ofertas y abriste tu caja: ganaste ${formatearDinero(cajaPropia.premio)}.`;
        guardarPuntaje(cajaPropia.premio);   // el puntaje es el premio de su caja
    } else {
        // Todavía quedan rondas: sigue abriendo cajas
        partida.estado = "abriendo-cajas";
    }
    renderizarTodo();
}

// ============================================================
// BLOQUE 13: Eventos de los botones y arranque del juego
// ============================================================

// Botones del banquero
botonTrato.addEventListener("click", aceptarTrato);
botonNoTrato.addEventListener("click", rechazarTrato);

// Nueva partida: se crea un estado limpio y se redibuja todo
botonNuevaPartida.addEventListener("click", () => {
    partida = crearPartida();
    renderizarTodo();
});

// Botones de la barra de usuario
botonRanking.addEventListener("click", () => {
    window.location.href = "/ranking.html";
});

// Cerrar sesión: avisa al servidor y vuelve al login
botonCerrarSesion.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login.html";
});

// Al cargar la página: se verifica la sesión y se dibuja el estado inicial
verificarSesion();
renderizarTodo();