const botonPrueba = document.querySelector<HTMLButtonElement>("#boton-prueba");
const mensajePrueba = document.querySelector<HTMLParagraphElement>("#mensaje-prueba");

if (botonPrueba !== null && mensajePrueba !== null) {
    botonPrueba.addEventListener("click", () => {
        mensajePrueba.textContent = "¡La conexión funciona!";
    });
}
type EstadoPartida = "eligiendo-caja" | "abriendo-cajas" | "oferta" | "terminada";

interface Caja {
    numero: number;
    premio: number;
    abierta: boolean;
}

interface Partida {
    cajas: Caja[];
    cajaJugador: number | null;
    estado: EstadoPartida;
    ronda: number;
    abiertasEnRonda: number;
    oferta: number;
    resultado: string;
}

const PREMIOS: number[] = [
    1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500,
    5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 500000, 1000000
];

// Cuántas cajas se abren en cada ronda antes de que llame el banquero (suman 18)
const CAJAS_POR_RONDA: number[] = [5, 4, 3, 2, 2, 1, 1];

function mezclar(lista: number[]): number[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

function crearPartida(): Partida {
    const premiosMezclados = mezclar(PREMIOS);
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

let partida: Partida = crearPartida();
function obtener<T extends HTMLElement>(selector: string): T {
    const elemento = document.querySelector<T>(selector);
    if (elemento === null) {
        throw new Error("No se encontró el elemento " + selector);
    }
    return elemento;
}

const tablero = obtener<HTMLDivElement>("#tablero");
const listaMenores = obtener<HTMLUListElement>("#premios-menores");
const listaMayores = obtener<HTMLUListElement>("#premios-mayores");
const mensajeJuego = obtener<HTMLParagraphElement>("#mensaje-juego");
const infoRonda = obtener<HTMLParagraphElement>("#info-ronda");
const panelBanquero = obtener<HTMLElement>("#banquero");
const ofertaMonto = obtener<HTMLParagraphElement>("#oferta-monto");
const panelResultado = obtener<HTMLElement>("#resultado");
const resultadoTexto = obtener<HTMLParagraphElement>("#resultado-texto");
const botonTrato = obtener<HTMLButtonElement>("#boton-trato");
const botonNoTrato = obtener<HTMLButtonElement>("#boton-no-trato");
const botonNuevaPartida = obtener<HTMLButtonElement>("#boton-nueva-partida");

function formatearDinero(valor: number): string {
    return "$" + valor.toLocaleString("es-AR");
}

function premiosEnJuego(): number[] {
    return partida.cajas
        .filter(caja => !caja.abierta)
        .map(caja => caja.premio);
}

function premiosEliminados(): number[] {
    return partida.cajas
        .filter(caja => caja.abierta)
        .map(caja => caja.premio);
}

function renderizarTablero(): void {
    tablero.replaceChildren();

    for (const caja of partida.cajas) {
        const { numero, premio, abierta } = caja;
        const esDelJugador = numero === partida.cajaJugador;

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "caja";
        if (esDelJugador) boton.classList.add("jugador");
        if (abierta) boton.classList.add("abierta");

        const etiqueta = document.createElement("span");
        etiqueta.textContent = String(numero);
        boton.append(etiqueta);

        if (abierta) {
            const detalle = document.createElement("small");
            detalle.textContent = formatearDinero(premio);
            boton.append(detalle);
        } else if (esDelJugador) {
            const detalle = document.createElement("small");
            detalle.textContent = "TU CAJA";
            boton.append(detalle);
        }

        const juegoActivo =
            partida.estado === "eligiendo-caja" || partida.estado === "abriendo-cajas";
        boton.disabled = !(juegoActivo && !abierta && !esDelJugador);

        boton.addEventListener("click", () => alHacerClicEnCaja(numero));
        tablero.append(boton);
    }
}

function renderizarPremios(): void {
    listaMenores.replaceChildren();
    listaMayores.replaceChildren();

    const eliminados = premiosEliminados();
    const ordenados = [...PREMIOS].sort((a, b) => a - b);
    const mitad = ordenados.length / 2;

    ordenados.forEach((premio, indice) => {
        const item = document.createElement("li");
        item.textContent = formatearDinero(premio);
        if (eliminados.includes(premio)) {
            item.classList.add("eliminado");
        }
        if (indice < mitad) {
            listaMenores.append(item);
        } else {
            listaMayores.append(item);
        }
    });
}

function actualizarMensajes(): void {
    if (partida.estado === "eligiendo-caja") {
        mensajeJuego.textContent = "Elegí tu caja. Es la que te quedás si no aceptás ningún trato.";
        infoRonda.textContent = "";
    } else if (partida.estado === "abriendo-cajas") {
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

function actualizarPaneles(): void {
    panelBanquero.hidden = partida.estado !== "oferta";
    ofertaMonto.textContent = formatearDinero(partida.oferta);
    panelResultado.hidden = partida.estado !== "terminada";
    resultadoTexto.textContent = partida.resultado;
}

function renderizarTodo(): void {
    renderizarTablero();
    renderizarPremios();
    actualizarMensajes();
    actualizarPaneles();
}
function obtenerCajaJugador(): Caja {
    const caja = partida.cajas.find(c => c.numero === partida.cajaJugador);
    if (caja === undefined) {
        throw new Error("El jugador todavía no eligió su caja.");
    }
    return caja;
}

function calcularOferta(): number {
    const disponibles = premiosEnJuego();
    const suma = disponibles.reduce((total, premio) => total + premio, 0);
    const promedio = suma / disponibles.length;
    const factor = 0.25 + partida.ronda * 0.1; // la oferta mejora ronda a ronda
    const oferta = promedio * factor;
    return oferta >= 1000 ? Math.round(oferta / 100) * 100 : Math.max(1, Math.round(oferta));
}

function alHacerClicEnCaja(numero: number): void {
    const caja = partida.cajas.find(c => c.numero === numero);
    if (caja === undefined) return;

    if (partida.estado === "eligiendo-caja") {
        partida.cajaJugador = numero;
        partida.estado = "abriendo-cajas";
    } else if (partida.estado === "abriendo-cajas") {
        if (caja.abierta || numero === partida.cajaJugador) return;
        caja.abierta = true;
        partida.abiertasEnRonda++;
        if (partida.abiertasEnRonda === CAJAS_POR_RONDA[partida.ronda]) {
            partida.estado = "oferta";
            partida.oferta = calcularOferta();
        }
    } else {
        return;
    }
    renderizarTodo();
}

function aceptarTrato(): void {
    const cajaPropia = obtenerCajaJugador();
    cajaPropia.abierta = true;
    partida.estado = "terminada";

    const oferta = formatearDinero(partida.oferta);
    const contenido = formatearDinero(cajaPropia.premio);
    if (cajaPropia.premio > partida.oferta) {
        partida.resultado = `Aceptaste ${oferta}. Tu caja tenía ${contenido}: esta vez ganó el banquero.`;
    } else {
        partida.resultado = `Aceptaste ${oferta}. Tu caja tenía ${contenido}: ¡le ganaste al banquero!`;
    }
    renderizarTodo();
}

function rechazarTrato(): void {
    partida.ronda++;
    partida.abiertasEnRonda = 0;

    if (partida.ronda >= CAJAS_POR_RONDA.length) {
        const cajaPropia = obtenerCajaJugador();
        cajaPropia.abierta = true;
        partida.estado = "terminada";
        partida.resultado =
            `Rechazaste todas las ofertas y abriste tu caja: ganaste ${formatearDinero(cajaPropia.premio)}.`;
    } else {
        partida.estado = "abriendo-cajas";
    }
    renderizarTodo();
}

botonTrato.addEventListener("click", aceptarTrato);
botonNoTrato.addEventListener("click", rechazarTrato);
botonNuevaPartida.addEventListener("click", () => {
    partida = crearPartida();
    renderizarTodo();
});

renderizarTodo();