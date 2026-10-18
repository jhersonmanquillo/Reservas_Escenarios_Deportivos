const test = require('node:test');
const assert = require('node:assert/strict');
const {
  overlaps,
  parseDateTime,
  AppError,
  FINAL,
  validateReservationTime
} = require('../src/reservation-service');

test('detecta intervalos que se superponen', () => {
  assert.equal(overlaps(10, 20, 15, 25), true);
  assert.equal(overlaps(10, 20, 20, 30), false);
  assert.equal(overlaps(10, 20, 1, 10), false);
});

test('parsea fecha y hora con formato requerido', () => {
  const date = parseDateTime('2026-12-01T10:00', 'Inicio');
  assert.equal(date.getFullYear(), 2026);
  assert.throws(() => parseDateTime('01/12/2026 10:00', 'Inicio'), AppError);
  assert.throws(() => parseDateTime('2026-02-31T10:00', 'Inicio'), AppError);
});

test('identifica estados finales del ciclo de vida', () => {
  assert.equal(FINAL.has('Cancelada'), true);
  assert.equal(FINAL.has('Completada'), true);
  assert.equal(FINAL.has('Inasistencia'), true);
  assert.equal(FINAL.has('Reservada'), false);
});


test('rechaza reservas en el pasado', () => {
  const now = new Date(2026, 9, 18, 10, 0, 0, 0);
  const start = new Date(2026, 9, 18, 9, 0, 0, 0);

  assert.throws(
    () => validateReservationTime(start, now),
    (error) => error instanceof AppError && error.status === 400
  );
});

test('rechaza reservas con menos de dos horas de anticipación', () => {
  const now = new Date(2026, 9, 18, 10, 0, 0, 0);
  const start = new Date(2026, 9, 18, 11, 59, 0, 0);

  assert.throws(
    () => validateReservationTime(start, now),
    (error) => error instanceof AppError && error.status === 400
  );
});

test('acepta reservas con exactamente dos horas de anticipación', () => {
  const now = new Date(2026, 9, 18, 10, 0, 0, 0);
  const start = new Date(2026, 9, 18, 12, 0, 0, 0);

  assert.equal(validateReservationTime(start, now), true);
});

test('acepta reservas con exactamente siete días de anticipación', () => {
  const now = new Date(2026, 9, 18, 10, 0, 0, 0);
  const start = new Date(2026, 9, 25, 10, 0, 0, 0);

  assert.equal(validateReservationTime(start, now), true);
});

test('rechaza reservas con más de siete días de anticipación', () => {
  const now = new Date(2026, 9, 18, 10, 0, 0, 0);
  const start = new Date(2026, 9, 25, 10, 1, 0, 0);

  assert.throws(
    () => validateReservationTime(start, now),
    (error) => error instanceof AppError && error.status === 400
  );
});
