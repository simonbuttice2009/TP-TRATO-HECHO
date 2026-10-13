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
console.log(partida);