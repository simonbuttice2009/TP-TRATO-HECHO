Trato Hecho
Juego web de negociación y estrategia inspirado en el programa de TV. El jugador elige una caja, abre las demás y decide si acepta o rechaza las ofertas del banquero.

Requisitos
Node.js (versión LTS)
Git
Un navegador web
Instalación y ejecución
git clone URL_DEL_REPOSITORIO
cd trato-hecho
npm install
npx tsc

Después abrí index.html en el navegador. Con npx tsc --watch se compila solo al guardar.

Funciones principales
crearPartida: genera las 20 cajas con los premios mezclados.
calcularOferta: calcula la oferta del banquero según los premios que quedan.
alHacerClicEnCaja: elige la caja del jugador y abre las demás.
aceptarTrato y rechazarTrato: resuelven la decisión del jugador.
renderizarTodo: actualiza el tablero, los premios y los mensajes.
Integrantes
Catalina Cuccaro, Simon Buttice, Dante Toffalo, Mirko Villaverde y Bruno Saucedo.