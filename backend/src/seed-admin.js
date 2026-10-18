require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const name = process.env.ADMIN_NAME || 'Administrador';
const email = process.env.ADMIN_EMAIL || 'admin@reservas.local';
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 12) {
  console.error('Configura ADMIN_PASSWORD en .env con al menos 12 caracteres.');
  process.exit(1);
}
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log(`Ya existe una cuenta con correo ${email}. No se modificó.`);
} else {
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(name, email, hash, 'admin');
  console.log(`Administrador creado: ${email}. Cambia la contraseña después del primer acceso.`);
}
db.close();
