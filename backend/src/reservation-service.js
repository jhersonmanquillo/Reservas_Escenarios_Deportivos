const db = require('./db');
const ACTIVE = 'Reservada';
const FINAL = new Set(['Cancelada', 'Completada', 'Inasistencia']);

class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function parseDateTime(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new AppError(400, `${field} debe tener formato AAAA-MM-DDTHH:mm.`);
  const date = new Date(value);
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) {
    throw new AppError(400, `${field} no es una fecha válida.`);
  }
  return date;
}
function overlaps(aStart, aEnd, bStart, bEnd) { return aStart < bEnd && bStart < aEnd; }
function createReservation({ userId, scenarioId, startsAt }) {
  if (!Number.isInteger(Number(scenarioId)) || Number(scenarioId) <= 0) throw new AppError(400, 'Escenario inválido.');
  const start = parseDateTime(startsAt, 'La fecha de inicio');
  validateReservationTime(start);
  if (start.getMinutes() !== 0 || start.getSeconds() !== 0 || start.getMilliseconds() !== 0) throw new AppError(400, 'Las reservas deben iniciar en una franja exacta de hora.');
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const startIso = startsAt;
  const endIso = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}T${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
  const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(Number(scenarioId));
  if (!scenario || !scenario.active) throw new AppError(400, 'El escenario no existe o está inactivo.');
  const user = db.prepare('SELECT id, active FROM users WHERE id = ?').get(userId);
  if (!user || !user.active) throw new AppError(403, 'La cuenta no está activa.');
  const weekday = start.getDay();
  const hours = db.prepare('SELECT * FROM opening_hours WHERE scenario_id = ? AND weekday = ?').get(scenario.id, weekday);
  const startClock = startsAt.slice(11,16), endClock = endIso.slice(11,16);
  if (!hours || startClock < hours.open_time || endClock > hours.close_time) throw new AppError(400, 'El escenario no está habilitado durante ese horario.');

  const create = db.transaction(() => {
    const dailyCount = db.prepare(`SELECT COUNT(*) AS total FROM reservations WHERE user_id=? AND date(starts_at)=date(?) AND status='Reservada'`).get(userId, startsAt).total;
    if (dailyCount >= 2) throw new AppError(409, 'Solo puedes mantener dos reservas activas por día.');
    const conflict = db.prepare(`SELECT id FROM reservations WHERE scenario_id=? AND status='Reservada' AND starts_at < ? AND ends_at > ?`).get(scenario.id, endIso, startIso);
    if (conflict) throw new AppError(409, 'El escenario ya tiene una reserva en esa franja.');
    const block = db.prepare('SELECT id FROM blocks WHERE scenario_id=? AND starts_at < ? AND ends_at > ?').get(scenario.id, endIso, startIso);
    if (block) throw new AppError(409, 'La franja está bloqueada por mantenimiento o evento.');
    const result = db.prepare('INSERT INTO reservations(user_id,scenario_id,starts_at,ends_at) VALUES(?,?,?,?)').run(userId, scenario.id, startIso, endIso);
    db.prepare('INSERT INTO audit_log(actor_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?)').run(userId,'crear','reserva',result.lastInsertRowid,`Escenario ${scenario.id}; ${startIso}`);
    return db.prepare('SELECT * FROM reservations WHERE id=?').get(result.lastInsertRowid);
  });
  return create.immediate();
}


function validateReservationTime(start, now = new Date()) {
  const diff = start.getTime() - now.getTime();

  if (diff < 2 * 60 * 60 * 1000) {
    throw new AppError(
      400,
      'La reserva debe solicitarse con al menos dos horas de anticipación.'
    );
  }

  if (diff > 7 * 24 * 60 * 60 * 1000) {
    throw new AppError(
      400,
      'No se permiten reservas con más de siete días de anticipación.'
    );
  }

  return true;
}





function cancelReservation({ reservationId, userId, role, reason }) {
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) throw new AppError(400, 'Indica un motivo de cancelación de entre 3 y 500 caracteres.');
  const run = db.transaction(() => {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id=?').get(Number(reservationId));
    if (!reservation) throw new AppError(404, 'Reserva no encontrada.');
    if (role !== 'admin' && reservation.user_id !== userId) throw new AppError(403, 'No tienes permiso para cancelar esta reserva.');
    if (reservation.status !== ACTIVE) throw new AppError(409, 'Solo se pueden cancelar reservas que estén Reservadas.');
    if (new Date(reservation.starts_at).getTime() - Date.now() < 2 * 60 * 60 * 1000) throw new AppError(400, 'La cancelación debe realizarse al menos dos horas antes del inicio.');
    db.prepare("UPDATE reservations SET status='Cancelada', cancellation_reason=? WHERE id=? AND status='Reservada'").run(reason.trim(), reservation.id);
    db.prepare('INSERT INTO audit_log(actor_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?)').run(userId,'cancelar','reserva',reservation.id,reason.trim());
    return db.prepare('SELECT * FROM reservations WHERE id=?').get(reservation.id);
  });
  return run.immediate();
}
function recordOutcome({ reservationId, actorId, status, note }) {
  if (!['Completada','Inasistencia'].includes(status)) throw new AppError(400, 'El resultado debe ser Completada o Inasistencia.');
  const run = db.transaction(() => {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id=?').get(Number(reservationId));
    if (!reservation) throw new AppError(404, 'Reserva no encontrada.');
    if (reservation.status !== ACTIVE) throw new AppError(409, 'El estado final de una reserva no puede modificarse por el flujo normal.');
    db.prepare('UPDATE reservations SET status=?, outcome_note=?, outcome_by=? WHERE id=? AND status=?').run(status, String(note || '').slice(0,500), actorId, reservation.id, ACTIVE);
    db.prepare('INSERT INTO audit_log(actor_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?)').run(actorId,'registrar resultado','reserva',reservation.id,status);
    return db.prepare('SELECT * FROM reservations WHERE id=?').get(reservation.id);
  });
  return run.immediate();
}
module.exports = {
  AppError,
  createReservation,
  cancelReservation,
  recordOutcome,
  overlaps,
  parseDateTime,
  validateReservationTime,
  FINAL
};
