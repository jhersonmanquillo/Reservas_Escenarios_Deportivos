const test = require('node:test');
const assert = require('node:assert/strict');
const { overlaps, parseDateTime, AppError, FINAL } = require('../src/reservation-service');

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
