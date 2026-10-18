const express = require('express');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const expressSession = require('express-session');
const SQLiteStore = require('connect-sqlite3')(expressSession);
const db = require('./db');
const { AppError, createReservation, cancelReservation, recordOutcome } = require('./reservation-service');
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
const sessionSecret = process.env.SESSION_SECRET || 'development-only-secret-change-this-before-running';
app.use(expressSession({ name:'reservas.sid', secret:sessionSecret, resave:false, saveUninitialized:false, store:new SQLiteStore({db:'sessions.sqlite',dir:path.resolve(process.cwd(),'backend/data')}), cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000} }));
app.use(express.static(path.resolve(process.cwd(), 'frontend')));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  const current = db.prepare('SELECT id,name,email,role,active FROM users WHERE id=?').get(req.session.user.id);
  if (!current || !current.active) return req.session.destroy(() => res.status(401).json({ error: 'La cuenta está inactiva.' }));
  req.user = current;
  next();
}
function requireRole(...roles) { return (req,res,next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'No tienes permisos para realizar esta operación.' }); }
function validText(value, label, max=120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new AppError(400, `${label} es obligatorio y debe tener máximo ${max} caracteres.`);
  return value.trim();
}
function audit(actor, action, entity, id, detail='') {
  db.prepare('INSERT INTO audit_log(actor_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?)').run(actor,action,entity,id,String(detail).slice(0,500));
}

app.get('/api/health', (_req,res) => res.json({ status: 'ok' }));
app.post('/api/auth/login', (req,res,next) => {
  try {
    const email = validText(req.body.email, 'Correo', 254).toLowerCase();
    const password = validText(req.body.password, 'Contraseña', 200);
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user || !user.active || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Credenciales incorrectas o cuenta inactiva.' });
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.user = { id: user.id };
      req.session.save(saveErr => {
        if (saveErr) return next(saveErr);
        res.json({ user: { id:user.id, name:user.name, email:user.email, role:user.role } });
      });
    });
  } catch(e) { next(e); }
});
app.post('/api/auth/logout', (req,res) => req.session.destroy(err => {
  res.clearCookie('reservas.sid', { httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV === 'production' });
  if (err) return res.status(500).json({ error: 'No fue posible cerrar la sesión.' });
  res.json({ message: 'Sesión cerrada.' });
}));
app.get('/api/auth/me', requireAuth, (req,res) => res.json({ user:req.user }));

app.get('/api/scenarios', requireAuth, (req,res) => {
  const rows = db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM reservations r WHERE r.scenario_id=s.id AND r.status='Reservada') active_reservations FROM scenarios s ${req.user.role==='admin' ? '' : 'WHERE s.active=1'} ORDER BY s.name`).all();
  res.json(rows);
});
app.post('/api/scenarios', requireAuth, requireRole('admin'), (req,res,next) => {
  try {
    const name=validText(req.body.name,'Nombre',100), sport=validText(req.body.sport_type,'Tipo de deporte',80), location=validText(req.body.location,'Ubicación',160);
    const capacity=Number(req.body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) throw new AppError(400,'La capacidad debe ser un entero entre 1 y 10000.');
    const result=db.prepare('INSERT INTO scenarios(name,sport_type,capacity,location) VALUES(?,?,?,?)').run(name,sport,capacity,location);
    audit(req.user.id,'crear','escenario',result.lastInsertRowid,name);
    res.status(201).json(db.prepare('SELECT * FROM scenarios WHERE id=?').get(result.lastInsertRowid));
  } catch(e) { if (String(e.code||'').startsWith('SQLITE_CONSTRAINT_UNIQUE')) return res.status(409).json({error:'Ya existe un escenario con ese nombre.'}); next(e); }
});
app.patch('/api/scenarios/:id', requireAuth, requireRole('admin'), (req,res,next) => {
  try {
    const id=Number(req.params.id), current=db.prepare('SELECT * FROM scenarios WHERE id=?').get(id);
    if (!current) throw new AppError(404,'Escenario no encontrado.');
    const name=req.body.name===undefined?current.name:validText(req.body.name,'Nombre',100);
    const sport=req.body.sport_type===undefined?current.sport_type:validText(req.body.sport_type,'Tipo de deporte',80);
    const location=req.body.location===undefined?current.location:validText(req.body.location,'Ubicación',160);
    const capacity=req.body.capacity===undefined?current.capacity:Number(req.body.capacity);
    const active=req.body.active===undefined?current.active:(req.body.active===true || req.body.active===1 ? 1 : req.body.active===false || req.body.active===0 ? 0 : NaN);
    if (!Number.isInteger(capacity)||capacity<1||capacity>10000||!Number.isInteger(active)) throw new AppError(400,'Capacidad o estado inválido.');
    db.prepare('UPDATE scenarios SET name=?,sport_type=?,location=?,capacity=?,active=? WHERE id=?').run(name,sport,location,capacity,active,id);
    audit(req.user.id,'actualizar','escenario',id,`activo=${active}`);
    res.json(db.prepare('SELECT * FROM scenarios WHERE id=?').get(id));
  } catch(e) { next(e); }
});
app.put('/api/scenarios/:id/hours', requireAuth, requireRole('admin'), (req,res,next) => {
  try {
    const id=Number(req.params.id), scenario=db.prepare('SELECT id FROM scenarios WHERE id=?').get(id);
    if(!scenario) throw new AppError(404,'Escenario no encontrado.');
    if(!Array.isArray(req.body.hours) || req.body.hours.length>7) throw new AppError(400,'Envía un arreglo de horarios (máximo 7 días).');
    const seen=new Set();
    for(const h of req.body.hours){ if(!Number.isInteger(h.weekday)||h.weekday<0||h.weekday>6||seen.has(h.weekday)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(h.open_time)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(h.close_time)||h.open_time>=h.close_time) throw new AppError(400,'Horario inválido o día repetido.'); seen.add(h.weekday); }
    const save=db.transaction(()=>{db.prepare('DELETE FROM opening_hours WHERE scenario_id=?').run(id);const stmt=db.prepare('INSERT INTO opening_hours(scenario_id,weekday,open_time,close_time) VALUES(?,?,?,?)'); for(const h of req.body.hours) stmt.run(id,h.weekday,h.open_time,h.close_time); audit(req.user.id,'configurar horarios','escenario',id);});
    save.immediate(); res.json(db.prepare('SELECT weekday,open_time,close_time FROM opening_hours WHERE scenario_id=? ORDER BY weekday').all(id));
  }catch(e){next(e);}
});
app.get('/api/scenarios/:id/availability', requireAuth, (req,res,next) => {
  try {
    const id=Number(req.params.id), date=validText(req.query.date,'Fecha',10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T00:00:00`))) throw new AppError(400,'Fecha inválida; usa AAAA-MM-DD.');
    const scenario=db.prepare('SELECT * FROM scenarios WHERE id=? AND active=1').get(id); if(!scenario) throw new AppError(404,'Escenario no disponible.');
    const weekday=new Date(`${date}T12:00:00`).getDay();
    const hours=db.prepare('SELECT * FROM opening_hours WHERE scenario_id=? AND weekday=?').get(id,weekday);
    if(!hours) return res.json({date,scenario_id:id,slots:[]});
    const slots=[]; let cursor=hours.open_time;
    while(cursor<hours.close_time){const [hh,mm]=cursor.split(':').map(Number);const nextMinutes=hh*60+mm+60;if(nextMinutes>24*60)break;const end=`${String(Math.floor(nextMinutes/60)%24).padStart(2,'0')}:${String(nextMinutes%60).padStart(2,'0')}`;if(end>hours.close_time)break;
      const starts=`${date}T${cursor}`, ends=`${date}T${end}`;
      const reservation=db.prepare("SELECT id FROM reservations WHERE scenario_id=? AND status='Reservada' AND starts_at < ? AND ends_at > ?").get(id,ends,starts);
      const block=db.prepare('SELECT id FROM blocks WHERE scenario_id=? AND starts_at < ? AND ends_at > ?').get(id,ends,starts);
      slots.push({starts_at:starts,ends_at:ends,available:!reservation&&!block});cursor=end;
    }
    res.json({date,scenario_id:id,slots});
  }catch(e){next(e);}
});
app.post('/api/blocks', requireAuth, requireRole('admin'), (req,res,next) => {
  try {
    const scenarioId=Number(req.body.scenario_id), starts=validText(req.body.starts_at,'Inicio',16), ends=validText(req.body.ends_at,'Fin',16), reason=validText(req.body.reason,'Motivo',300);
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(starts)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(ends)||starts>=ends) throw new AppError(400,'Intervalo de bloqueo inválido.');
    if(!db.prepare('SELECT id FROM scenarios WHERE id=? AND active=1').get(scenarioId)) throw new AppError(400,'Escenario inválido o inactivo.');
    const conflict=db.prepare("SELECT id FROM reservations WHERE scenario_id=? AND status='Reservada' AND starts_at < ? AND ends_at > ?").get(scenarioId,ends,starts);
    if(conflict) throw new AppError(409,'No se puede bloquear una franja que ya tiene una reserva activa.');
    const result=db.prepare('INSERT INTO blocks(scenario_id,starts_at,ends_at,reason,created_by) VALUES(?,?,?,?,?)').run(scenarioId,starts,ends,reason,req.user.id);
    audit(req.user.id,'crear bloqueo','bloqueo',result.lastInsertRowid,reason);res.status(201).json(db.prepare('SELECT * FROM blocks WHERE id=?').get(result.lastInsertRowid));
  }catch(e){next(e);}
});
app.get('/api/blocks', requireAuth, requireRole('admin','deportivo'), (_req,res)=>res.json(db.prepare('SELECT b.*,s.name scenario_name FROM blocks b JOIN scenarios s ON s.id=b.scenario_id ORDER BY starts_at').all()));
app.get('/api/reservations', requireAuth, (req,res) => {
  const filters=[], params=[];
  if(req.user.role==='usuario'){filters.push('r.user_id=?');params.push(req.user.id);}
  if(req.query.date){if(!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) return res.status(400).json({error:'Fecha inválida.'});filters.push('date(r.starts_at)=date(?)');params.push(req.query.date);}
  if(req.query.status){filters.push('r.status=?');params.push(req.query.status);}
  const where=filters.length?`WHERE ${filters.join(' AND ')}`:'';
  res.json(db.prepare(`SELECT r.*,s.name scenario_name,u.name user_name FROM reservations r JOIN scenarios s ON s.id=r.scenario_id JOIN users u ON u.id=r.user_id ${where} ORDER BY r.starts_at DESC LIMIT 1000`).all(...params));
});
app.post('/api/reservations', requireAuth, requireRole('usuario','admin'), (req,res,next)=>{try{const reservation=createReservation({userId:req.user.id,scenarioId:req.body.scenario_id,startsAt:req.body.starts_at});res.status(201).json(reservation);}catch(e){next(e);}});
app.post('/api/reservations/:id/cancel', requireAuth, (req,res,next)=>{try{res.json(cancelReservation({reservationId:req.params.id,userId:req.user.id,role:req.user.role,reason:req.body.reason}));}catch(e){next(e);}});
app.post('/api/reservations/:id/outcome', requireAuth, requireRole('admin','deportivo'), (req,res,next)=>{try{res.json(recordOutcome({reservationId:req.params.id,actorId:req.user.id,status:req.body.status,note:req.body.note}));}catch(e){next(e);}});
app.post('/api/users', requireAuth, requireRole('admin'), (req,res,next)=>{
  try{const name=validText(req.body.name,'Nombre',100),email=validText(req.body.email,'Correo',254).toLowerCase(),password=validText(req.body.password,'Contraseña',200),role=req.body.role;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AppError(400,'Correo inválido.');if(password.length<12)throw new AppError(400,'La contraseña debe tener al menos 12 caracteres.');if(!['admin','usuario','deportivo'].includes(role))throw new AppError(400,'Rol inválido.');
    const result=db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(name,email,bcrypt.hashSync(password,12),role);audit(req.user.id,'crear','usuario',result.lastInsertRowid,email);res.status(201).json(db.prepare('SELECT id,name,email,role,active,created_at FROM users WHERE id=?').get(result.lastInsertRowid));
  }catch(e){if(String(e.code||'').startsWith('SQLITE_CONSTRAINT_UNIQUE'))return res.status(409).json({error:'Ya existe una cuenta con ese correo.'});next(e);}
});
app.get('/api/users', requireAuth, requireRole('admin'), (_req,res)=>res.json(db.prepare('SELECT id,name,email,role,active,created_at FROM users ORDER BY name').all()));
app.patch('/api/users/:id', requireAuth, requireRole('admin'), (req,res,next)=>{try{const id=Number(req.params.id),u=db.prepare('SELECT * FROM users WHERE id=?').get(id);if(!u)throw new AppError(404,'Usuario no encontrado.');const role=req.body.role===undefined?u.role:req.body.role;if(!['admin','usuario','deportivo'].includes(role))throw new AppError(400,'Rol inválido.');const active=req.body.active===undefined?u.active:(req.body.active===true?1:req.body.active===false?0:NaN);if(!Number.isInteger(active))throw new AppError(400,'Estado inválido.');if(id===req.user.id&&active===0)throw new AppError(400,'No puedes desactivar tu propia cuenta.');db.prepare('UPDATE users SET role=?,active=? WHERE id=?').run(role,active,id);audit(req.user.id,'actualizar','usuario',id,`role=${role};active=${active}`);res.json(db.prepare('SELECT id,name,email,role,active FROM users WHERE id=?').get(id));}catch(e){next(e);}});
app.get('/api/reports/summary', requireAuth, requireRole('admin','deportivo'), (req,res,next)=>{try{const from=req.query.from||'2000-01-01',to=req.query.to||'2999-12-31';if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)throw new AppError(400,'Rango de fechas inválido.');const rows=db.prepare(`SELECT s.id scenario_id,s.name scenario_name,COUNT(r.id) total_reservations,SUM(CASE WHEN r.status='Reservada' THEN 1 ELSE 0 END) active,SUM(CASE WHEN r.status='Cancelada' THEN 1 ELSE 0 END) cancelled,SUM(CASE WHEN r.status='Completada' THEN 1 ELSE 0 END) completed,SUM(CASE WHEN r.status='Inasistencia' THEN 1 ELSE 0 END) no_shows FROM scenarios s LEFT JOIN reservations r ON r.scenario_id=s.id AND date(r.starts_at) BETWEEN date(?) AND date(?) GROUP BY s.id,s.name ORDER BY s.name`).all(from,to);res.json({from,to,scenarios:rows});}catch(e){next(e);}});
app.get('/api/audit', requireAuth, requireRole('admin'), (_req,res)=>res.json(db.prepare('SELECT a.*,u.name actor_name FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 500').all()));

app.use('/api', (_req,res)=>res.status(404).json({error:'Ruta de API no encontrada.'}));
app.use((err,_req,res,_next)=>{
  if(err instanceof AppError) return res.status(err.status).json({error:err.message});
  if(String(err.code||'').startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({error:'La operación genera un conflicto con los datos existentes.'});
  console.error(err);
  res.status(500).json({error:'Ocurrió un error interno. Intenta nuevamente.'});
});
module.exports = app;
