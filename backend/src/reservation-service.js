const { readData, saveData, createId } = require("./store");

const HOUR = 60 * 60 * 1000;
const ACTIVE_STATUS = "Reservada";
const FINAL_STATUSES = ["Cancelada", "Completada", "Inasistencia"];

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}
function validateStart(start) {
  const timestamp = Date.parse(start);
  if (!Number.isFinite(timestamp)) fail("La fecha y hora no son válidas.");
  const diff = timestamp - Date.now();
  if (diff < 2 * HOUR) fail("La reserva debe solicitarse con al menos dos horas de anticipación.");
  if (diff > 7 * 24 * HOUR) fail("No puedes reservar con más de siete días de anticipación.");
  return new Date(timestamp).toISOString();
}
async function listScenarios() {
  const data = await readData();
  return data.scenarios;
}
async function listMine(userId) {
  const data = await readData();
  return data.reservations.filter((r) => r.userId === userId).sort((a, b) => a.start.localeCompare(b.start));
}
async function createReservation(userId, input) {
  // Las operaciones mutables se encadenan en este proceso para que las solicitudes
  // recibidas por esta instancia no validen simultáneamente la misma versión del archivo.
  return mutate(async (data) => {
    const scenario = data.scenarios.find((s) => s.id === input.scenarioId);
    if (!scenario || !scenario.active) fail("El escenario no existe o está inactivo.", 409);
    const start = validateStart(input.start);
    const end = new Date(Date.parse(start) + 60 * 60 * 1000).toISOString();
    const day = start.slice(0, 10);
    const dailyCount = data.reservations.filter((r) => r.userId === userId && r.start.slice(0, 10) === day && r.status === ACTIVE_STATUS).length;
    if (dailyCount >= 2) fail("Solo puedes mantener dos reservas activas por día.", 409);
    const startDate = new Date(start);
    const endDate = new Date(end);
    // Horario de demostración: todos los días, de 07:00 a 21:00 hora local del servidor.
    if (startDate.getHours() < 7 || endDate.getHours() > 21 || (endDate.getHours() === 21 && endDate.getMinutes() > 0)) {
      fail("La reserva debe estar dentro del horario de 07:00 a 21:00 del servidor.");
    }
    const conflict = data.reservations.some((r) => r.scenarioId === scenario.id && r.status === ACTIVE_STATUS && intervalsOverlap(start, end, r.start, r.end));
    if (conflict) fail("El escenario ya tiene una reserva que se superpone con ese horario.", 409);
    const blocked = data.blocks.some((b) => b.scenarioId === scenario.id && intervalsOverlap(start, end, b.start, b.end));
    if (blocked) fail("El escenario está bloqueado durante ese horario.", 409);
    const reservation = { id: createId("r"), userId, scenarioId: scenario.id, start, end, status: ACTIVE_STATUS, createdAt: new Date().toISOString(), cancellationReason: null };
    data.reservations.push(reservation);
    return reservation;
  });
}
let mutationQueue = Promise.resolve();
function mutate(work) {
  const operation = mutationQueue.then(async () => {
    const data = await readData();
    const result = await work(data);
    await saveData(data);
    return result;
  });
  mutationQueue = operation.catch(() => {});
  return operation;
}
async function cancelReservation(userId, reservationId, reason) {
  return mutate(async (data) => {
    const reservation = data.reservations.find((r) => r.id === reservationId);
    if (!reservation) fail("No se encontró la reserva.", 404);
    if (reservation.userId !== userId) fail("No tienes permiso para cancelar esta reserva.", 403);
    if (reservation.status !== ACTIVE_STATUS) fail("Solo se pueden cancelar reservas en estado Reservada.", 409);
    if (Date.parse(reservation.start) - Date.now() < 2 * HOUR) fail("La cancelación debe hacerse al menos dos horas antes del inicio.", 409);
    if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 300) fail("Indica un motivo de cancelación de entre 1 y 300 caracteres.");
    reservation.status = "Cancelada";
    reservation.cancellationReason = reason.trim();
    reservation.cancelledAt = new Date().toISOString();
    return reservation;
  });
}
async function listAllReservations() {
  const data = await readData();
  return data.reservations.slice().sort((a, b) => a.start.localeCompare(b.start));
}
async function setReservationStatus(reservationId, status) {
  return mutate(async (data) => {
    const reservation = data.reservations.find((r) => r.id === reservationId);
    if (!reservation) fail("No se encontró la reserva.", 404);
    if (reservation.status !== ACTIVE_STATUS) fail("Solo las reservas en estado Reservada pueden cambiar de estado.", 409);
    if (!FINAL_STATUSES.includes(status) || status === "Cancelada") fail("El estado solicitado no es válido para esta operación.");
    reservation.status = status;
    reservation.finishedAt = new Date().toISOString();
    return reservation;
  });
}
module.exports = { listScenarios, listMine, createReservation, cancelReservation, listAllReservations, setReservationStatus, intervalsOverlap };