const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 📁 Servir archivos estáticos desde /client
app.use(express.static(path.join(__dirname, "client")));

// 🌐 Rutas de acceso a los juegos
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

app.get("/plinko", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "plinko", "inicioPlinko.html"));
});

app.get("/carrera", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "carrera", "inicioCarrera.html"));
});

// 🎮 Namespaces de Socket.io para cada minijuego
const plinkoNamespace = io.of("/plinko");
const carreraNamespace = io.of("/carrera");

// 🧩 Cargar lógica modular de cada minijuego
require("./minijuegos/plinko")(plinkoNamespace);
require("./minijuegos/carrera")(carreraNamespace);

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎯 Servidor corriendo en http://localhost:${PORT}`);
});
