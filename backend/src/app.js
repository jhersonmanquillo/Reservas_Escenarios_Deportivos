const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const path = require("node:path");
const { readData, initializeStore } = require("./store");
const service = require("./reservation-service");

const app = express();
app.use(helmet({ contentSecurityPolicy: false })); // CSP desactivada solo para simplificar la demostración local.
app.use(express.json({ limit: "20kb" }));
app.use(session({
  name: "reservas.sid",
  secret: process.env.SESSION_SECRET || "solo-desarrollo-cambiar-en-produccion",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 2 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Debes iniciar sesión." });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: "Debes iniciar sesión." });
    if (!roles.includes(req.session.user.role)) return res.status(403).json({ error: "No tienes permiso para realizar esta operación." });
    next();
  };
}
function handleError(error, res) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 500 ? "Ocurrió un error interno. Intenta nuevamente." : error.message });
}
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string") return res.status(400).json({ error: "Escribe el correo y la contraseña." });
    const data = await readData();
    const user = data.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.active);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: "Credenciales incorrectas." });
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ user: req.session.user });
  } catch (error) { handleError(error, res); }
});
app.post("/api/auth/logout", (req, res) => req.session.destroy(() => res.json({ message: "Sesión cerrada." })));
app.get("/api/auth/me", (req, res) => res.json({ user: req.session.user || null }));
app.get("/api/scenarios", async (req, res) => {
  try { res.json({ scenarios: await service.listScenarios() }); }
  catch (error) { handleError(error, res); }
});
app.get("/api/reservations/mine", requireAuth, async (req, res) => {
  try { res.json({ reservations: await service.listMine(req.session.user.id) }); }
  catch (error) { handleError(error, res); }
});
app.post("/api/reservations", requireAuth, async (req, res) => {
  try {
    const reservation = await service.createReservation(req.session.user.id, req.body || {});
    res.status(201).json({ reservation });
  } catch (error) { handleError(error, res); }
});
app.post("/api/reservations/:id/cancel", requireAuth, async (req, res) => {
  try {
    const reservation = await service.cancelReservation(req.session.user.id, req.params.id, req.body && req.body.reason);
    res.json({ reservation });
  } catch (error) { handleError(error, res); }
});
app.get("/api/staff/reservations", requireRole("personal", "admin"), async (req, res) => {
  try { res.json({ reservations: await service.listAllReservations() }); }
  catch (error) { handleError(error, res); }
});
app.patch("/api/staff/reservations/:id/status", requireRole("personal", "admin"), async (req, res) => {
  try {
    const reservation = await service.setReservationStatus(req.params.id, req.body && req.body.status);
    res.json({ reservation });
  } catch (error) { handleError(error, res); }
});
app.use("/api", (req, res) => res.status(404).json({ error: "Ruta de API no encontrada." }));
app.use((error, req, res, next) => handleError(error, res));

async function prepareApp() { await initializeStore(); return app; }
module.exports = { app, prepareApp };