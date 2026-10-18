const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const dataDirectory = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDirectory, "data.json");
let writeQueue = Promise.resolve();

function nowPlusHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
async function initializeStore() {
  await fs.mkdir(dataDirectory, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    const users = [
      { id: "u-admin", name: "Administración Demo", email: "admin@demo.edu", passwordHash: bcrypt.hashSync("Admin123!", 10), role: "admin", active: true },
      { id: "u-student", name: "Estudiante Demo", email: "estudiante@demo.edu", passwordHash: bcrypt.hashSync("Estudiante123!", 10), role: "usuario", active: true },
      { id: "u-staff", name: "Personal Deportivo Demo", email: "deportivo@demo.edu", passwordHash: bcrypt.hashSync("Deportivo123!", 10), role: "personal", active: true }
    ];
    const data = {
      users,
      scenarios: [
        { id: "e-001", name: "Cancha múltiple A", sport: "Baloncesto", capacity: 20, location: "Bloque deportivo", active: true },
        { id: "e-002", name: "Cancha de fútbol 5", sport: "Fútbol", capacity: 12, location: "Zona exterior norte", active: true },
        { id: "e-003", name: "Cancha de voleibol", sport: "Voleibol", capacity: 14, location: "Coliseo", active: true },
        { id: "e-004", name: "Cancha en mantenimiento", sport: "Tenis", capacity: 4, location: "Zona exterior sur", active: false }
      ],
      reservations: [],
      blocks: []
    };
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");
  }
}
async function readData() {
  await initializeStore();
  return JSON.parse(await fs.readFile(dataFile, "utf8"));
}
function saveData(data) {
  // Serializa escrituras dentro de este proceso y reemplaza el archivo de forma atómica.
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(dataDirectory, { recursive: true });
    const tempFile = `${dataFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tempFile, dataFile);
  });
  return writeQueue;
}
function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
module.exports = { initializeStore, readData, saveData, createId, nowPlusHours };