require('dotenv').config();
const app = require('./app');
const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  console.error('En producción, SESSION_SECRET debe tener al menos 32 caracteres.');
  process.exit(1);
}
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.listen(port, () => console.log(`Reservas Deportivas disponible en http://localhost:${port}`));
