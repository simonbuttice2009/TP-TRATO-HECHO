// ============================================================
// BLOQUE 1: Importaciones
// ============================================================
import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import mysql, { type RowDataPacket, type ResultSetHeader } from "mysql2/promise";
import dotenv from "dotenv";
import path from "node:path";
import { exec } from "node:child_process";

// ============================================================
// BLOQUE 2: Datos que guardamos dentro de la sesión
// (le avisamos a TypeScript que la sesión tiene estos dos campos)
// ============================================================
declare module "express-session" {
  interface SessionData {
    idUsuario: number;
    nombre: string;
  }
}

// ============================================================
// BLOQUE 3: Configuración (.env, Express y sesiones)
// ============================================================
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const secretoSesion = process.env.SESSION_SECRET;
if (!secretoSesion) {
  throw new Error("Falta SESSION_SECRET en el archivo servidor/.env");
}

const app = express();
app.use(express.json());
app.use(session({
  secret: secretoSesion,
  resave: false,              // no vuelve a guardar la sesión si no cambió
  saveUninitialized: false,   // no crea sesión hasta que alguien inicia sesión
  cookie: { httpOnly: true, sameSite: "lax" }   // el JavaScript de la página no puede leer la cookie
}));

// ============================================================
// BLOQUE 4: Conexión a la base (pool)
// ============================================================
const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

// ============================================================
// BLOQUE 5: Middleware que exige haber iniciado sesión
// (lo usamos en las rutas que solo puede usar un jugador logueado)
// ============================================================
function requerirSesion(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (req.session.idUsuario === undefined) {
    res.status(401).json({ mensaje: "Tenés que iniciar sesión." });
    return;
  }
  next();
}

// ============================================================
// BLOQUE 6: Páginas y archivos del navegador
// ============================================================
const raiz = path.resolve(__dirname, "../..");
app.get("/", (_req, res) => {
  res.sendFile(path.join(raiz, "index.html"));
});
app.get("/login.html", (_req, res) => {
  res.sendFile(path.join(raiz, "login.html"));
});
app.get("/ranking.html", (_req, res) => {
  res.sendFile(path.join(raiz, "ranking.html"));
});
app.get("/estilos.css", (_req, res) => {
  res.sendFile(path.join(raiz, "estilos.css"));
});
app.use("/dist", express.static(path.join(raiz, "dist")));
// ============================================================
// BLOQUE 7: Registro de usuario nuevo
// ============================================================
app.post("/api/registro", async (req, res) => {
  const { nombre, contrasena } = req.body ?? {};
  const nombreLimpio = typeof nombre === "string" ? nombre.trim() : "";

  // Validación (bcrypt solo usa los primeros 72 caracteres, por eso el máximo)
  if (nombreLimpio.length < 3 || nombreLimpio.length > 30 ||
      typeof contrasena !== "string" ||
      contrasena.length < 4 || contrasena.length > 72) {
    res.status(400).json({
      mensaje: "El usuario debe tener de 3 a 30 caracteres y la contraseña de 4 a 72."
    });
    return;
  }

  try {
    // ¿Ya existe ese nombre?
    const [existentes] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM usuarios WHERE nombre = ?", [nombreLimpio]
    );
    if (existentes.length > 0) {
      res.status(400).json({ mensaje: "Ese nombre de usuario ya está en uso." });
      return;
    }

    // Guardar el usuario con la contraseña convertida en hash
    const hash = await bcrypt.hash(contrasena, 10);
    const [resultado] = await pool.execute<ResultSetHeader>(
      "INSERT INTO usuarios (nombre, contrasena) VALUES (?, ?)",
      [nombreLimpio, hash]
    );

    // Dejarlo con la sesión iniciada
    req.session.idUsuario = resultado.insertId;
    req.session.nombre = nombreLimpio;
    res.status(201).json({ mensaje: "Cuenta creada." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudo crear la cuenta." });
  }
});

// ============================================================
// BLOQUE 8: Inicio de sesión
// ============================================================
app.post("/api/login", async (req, res) => {
  const { nombre, contrasena } = req.body ?? {};
  if (typeof nombre !== "string" || typeof contrasena !== "string") {
    res.status(400).json({ mensaje: "Completá usuario y contraseña." });
    return;
  }

  try {
    const [filas] = await pool.execute<RowDataPacket[]>(
      "SELECT id, nombre, contrasena FROM usuarios WHERE nombre = ?",
      [nombre.trim()]
    );
    const usuario = filas[0];

    // bcrypt.compare compara la contraseña escrita con el hash guardado
    const correcta = usuario !== undefined &&
      await bcrypt.compare(contrasena, usuario.contrasena);

    // El mismo mensaje si falla el usuario o la contraseña
    if (!correcta) {
      res.status(401).json({ mensaje: "Usuario o contraseña incorrectos." });
      return;
    }

    req.session.idUsuario = usuario.id;
    req.session.nombre = usuario.nombre;
    res.json({ mensaje: "Sesión iniciada." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudo iniciar sesión." });
  }
});

// ============================================================
// BLOQUE 9: Cerrar sesión
// ============================================================
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");   // nombre de la cookie que usa express-session
    res.json({ mensaje: "Sesión cerrada." });
  });
});

// ============================================================
// BLOQUE 10: ¿Hay alguien logueado? (el juego lo consulta al abrirse)
// ============================================================
app.get("/api/sesion", (req, res) => {
  if (req.session.idUsuario === undefined) {
    res.json({ logueado: false });
    return;
  }
  res.json({ logueado: true, nombre: req.session.nombre });
});
// ============================================================
// BLOQUE 11: Guardar el puntaje de una partida terminada
// ============================================================
app.post("/api/puntaje", requerirSesion, async (req, res) => {
  const { puntaje } = req.body ?? {};

  // Debe ser un entero entre 0 y 1.000.000 (el premio máximo del juego)
  if (!Number.isInteger(puntaje) || puntaje < 0 || puntaje > 1000000) {
    res.status(400).json({ mensaje: "Puntaje inválido." });
    return;
  }

  try {
    // Si el jugador todavía no tiene fila en puntuacion, la crea.
    // Si ya la tiene (por el UNIQUE de id_usuario), la actualiza:
    //  - suma 1 a las partidas jugadas
    //  - guarda el mayor entre su mejor puntaje y el nuevo (GREATEST)
    //  - actualiza la fecha
    await pool.execute(
      `INSERT INTO puntuacion (id_usuario, puntaje, cant_partidas)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE
         cant_partidas = cant_partidas + 1,
         puntaje = GREATEST(puntaje, ?),
         fecha = NOW()`,
      [req.session.idUsuario, puntaje, puntaje]
    );
    res.status(201).json({ mensaje: "Puntaje guardado." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudo guardar el puntaje." });
  }
});

// ============================================================
// BLOQUE 12: Ranking de los 10 mejores
//  - JOIN: une cada puntuación con el nombre del usuario
//  - ORDER BY: mayor puntaje primero; si empatan, el que jugó menos partidas
//  - LIMIT 10: solo los primeros 10
// ============================================================
app.get("/api/ranking", requerirSesion, async (_req, res) => {
  try {
    const [filas] = await pool.execute<RowDataPacket[]>(`
      SELECT u.nombre, p.puntaje, p.cant_partidas AS partidas
      FROM puntuacion p JOIN usuarios u ON u.id = p.id_usuario
      WHERE p.cant_partidas > 0
      ORDER BY p.puntaje DESC, p.cant_partidas ASC
      LIMIT 10
    `);
    res.json(filas.map(fila => ({
      nombre: fila.nombre,
      puntaje: Number(fila.puntaje),
      partidas: Number(fila.partidas)
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudo leer el ranking." });
  }
});
// ============================================================
// BLOQUE 13: Comprobar la base e iniciar el servidor
// ============================================================
async function iniciar(): Promise<void> {
  try {
    await pool.query("SELECT 1");
    app.listen(3000, "127.0.0.1", () => {
      console.log("Trato Hecho disponible en http://127.0.0.1:3000");
      exec("start http://127.0.0.1:3000");   // abre el navegador (solo Windows)
    });
  } catch (error) {
    console.error("No se pudo conectar con MariaDB.", error);
    await pool.end();
    process.exitCode = 1;
  }
}
void iniciar();