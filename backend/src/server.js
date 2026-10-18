const { prepareApp } = require("./app");

const port = Number(process.env.PORT) || 3000;
prepareApp().then((app) => {
  app.listen(port, () => console.log(`Reservas deportivas disponible en http://localhost:${port}`));
}).catch((error) => {
  console.error("No se pudo iniciar la aplicación.", error);
  process.exit(1);
});