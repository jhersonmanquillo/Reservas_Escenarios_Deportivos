const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { prepareApp } = require("../src/app");
const { readData, saveData } = require("../src/store");
const service = require("../src/reservation-service");

const dataFile = path.join(__dirname, "..", "data", "data.json");
async function resetReservations() {
  const data = await readData();
  data.reservations = [];
  data.blocks = [];
  await saveData(data);
}
function futureStart(hours = 3) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return date.toISOString();
}
test("CP-01: permite crear una reserva válida", async () => {
  await resetReservations();
  const reservation = await service.createReservation("u-student", { scenarioId: "e-001", start: futureStart(4) });
  assert.equal(reservation.status, "Reservada");
  assert.ok(reservation.id);
});
test("CP-03: rechaza escenarios inactivos", async () => {
  await resetReservations();
  await assert.rejects(service.createReservation("u-student", { scenarioId: "e-004", start: futureStart(4) }), /inactivo/);
});
test("CP-04: rechaza reservas con menos de dos horas de anticipación", async () => {
  await resetReservations();
  await assert.rejects(service.createReservation("u-student", { scenarioId: "e-001", start: futureStart(1) }), /dos horas/);
});
test("CP-05: rechaza reservas con más de siete días de anticipación", async () => {
  await resetReservations();
  await assert.rejects(service.createReservation("u-student", { scenarioId: "e-001", start: futureStart(24 * 8) }), /siete días/);
});
test("CP-06: impide reservar el mismo escenario a la misma hora", async () => {
  await resetReservations();
  const start = futureStart(4);
  await service.createReservation("u-student", { scenarioId: "e-001", start });
  await assert.rejects(service.createReservation("u-admin", { scenarioId: "e-001", start }), /superpone/);
});
test("CP-07: limita a dos reservas activas por usuario y día", async () => {
  await resetReservations();
  const base = new Date(futureStart(30));
  base.setHours(10, 0, 0, 0);
  // Escoge un día futuro para evitar el límite de anticipación mínima.
  const day = new Date(Date.now() + 48 * 60 * 60 * 1000);
  day.setHours(9, 0, 0, 0);
  const starts = [9, 11, 13].map((hour) => { const d = new Date(day); d.setHours(hour, 0, 0, 0); return d.toISOString(); });
  await service.createReservation("u-student", { scenarioId: "e-001", start: starts[0] });
  await service.createReservation("u-student", { scenarioId: "e-002", start: starts[1] });
  await assert.rejects(service.createReservation("u-student", { scenarioId: "e-003", start: starts[2] }), /dos reservas/);
});
test("CP-08: cancela y registra el motivo", async () => {
  await resetReservations();
  const r = await service.createReservation("u-student", { scenarioId: "e-001", start: futureStart(5) });
  const cancelled = await service.cancelReservation("u-student", r.id, "Cambio de horario");
  assert.equal(cancelled.status, "Cancelada");
  assert.equal(cancelled.cancellationReason, "Cambio de horario");
});
test("CP-09: rechaza un motivo de cancelación vacío", async () => {
  await resetReservations();
  const r = await service.createReservation("u-student", { scenarioId: "e-001", start: futureStart(5) });
  await assert.rejects(service.cancelReservation("u-student", r.id, "  "), /motivo/);
});
test("CP-10: el estado final no se puede cambiar por el flujo normal", async () => {
  await resetReservations();
  const r = await service.createReservation("u-student", { scenarioId: "e-001", start: futureStart(5) });
  await service.setReservationStatus(r.id, "Completada");
  await assert.rejects(service.setReservationStatus(r.id, "Inasistencia"), /estado Reservada/);
});
test("CP-11: los datos siguen almacenados después de volver a leer el archivo", async () => {
  await resetReservations();
  const r = await service.createReservation("u-student", { scenarioId: "e-001", start: futureStart(5) });
  const data = await readData();
  assert.ok(data.reservations.some((item) => item.id === r.id));
});
test("CP-12: dos solicitudes simultáneas no confirman el mismo horario", async () => {
  await resetReservations();
  const start = futureStart(5);
  const results = await Promise.allSettled([
    service.createReservation("u-student", { scenarioId: "e-001", start }),
    service.createReservation("u-admin", { scenarioId: "e-001", start })
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
});
test("CP-13: calcula correctamente la superposición de intervalos", () => {
  assert.equal(service.intervalsOverlap("2030-01-01T10:00:00Z", "2030-01-01T11:00:00Z", "2030-01-01T10:30:00Z", "2030-01-01T11:30:00Z"), true);
  assert.equal(service.intervalsOverlap("2030-01-01T10:00:00Z", "2030-01-01T11:00:00Z", "2030-01-01T11:00:00Z", "2030-01-01T12:00:00Z"), false);
});