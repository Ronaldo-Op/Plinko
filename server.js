const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("client"));
let jugadores = {};       // { socket.id: nombre }
let predicciones = {};    // { socket.id: casilla }
let anfitrionId = null;
let estadoJuego = [];
let objetosVisuales = []; // NUEVO: guardar los objetos visuales
let bancoMonedas = 0;  // 💰 Total acumulado de la ronda


io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado:", socket.id);
  // Recibir nombre
  socket.on("registrarJugador", (nombre) => {
    // Si el jugador ya existe, solo actualiza su socketId (NO reiniciar monedas)
    if (!jugadores[nombre]) {
      jugadores[nombre] = { socketId: socket.id, monedas: 50 }; // 👈 jugador nuevo
      console.log(`🆕 Nuevo jugador: ${nombre}`);
    } else {
      jugadores[nombre].socketId = socket.id; // 👈 solo actualiza socketId
      console.log(`🔄 Reconectado: ${nombre}`);
    }
  
    // Ahora puedes acceder correctamente a sus monedas
    socket.emit("monedasIniciales", {
      monedas: jugadores[nombre].monedas,
      bancoMonedas
    });
  
    // Asignar rol
    if (!anfitrionId) {
      anfitrionId = socket.id;
      socket.emit("rolAsignado", "anfitrion");
    } else {
      socket.emit("rolAsignado", "cliente");
      socket.emit("sincronizar", estadoJuego);
      socket.emit("objetosVisuales", objetosVisuales);
    }
  
    console.log(`👤 ${nombre} tiene ${jugadores[nombre].monedas} monedas.`);
    console.log("Estado actual de jugadores:", jugadores);

  });
  

  socket.on("verificarSala", () => {
    socket.emit("salaExiste", anfitrionId !== null);
  });
  

   // Recibir predicción
   socket.on("prediccionHecha", ({ nombre, casilla }) => {
    if (jugadores[nombre].monedas > 0) {
        jugadores[nombre].monedas -= 1;
        bancoMonedas += 1;
      }
      predicciones[nombre] = casilla;
      
      socket.emit("monedasActualizadas", {
        monedas: jugadores[nombre].monedas,
        bancoMonedas
      });
    enviarBancoActualizado(); // 👈 Nuevo
    console.log(`${nombre} predijo la casilla ${casilla}`);
    console.log("🔍 Predicciones actuales:", predicciones);

    // Verificar si todos han hecho predicción
    const todosListos = Object.keys(jugadores).length > 0 &&
                        Object.keys(predicciones).length === Object.keys(jugadores).length;

    if (todosListos && anfitrionId) {
      io.to(anfitrionId).emit("activarPlay");
      console.log("🟢 Todos listos. Activando botón 'Play'");
    }
  });

  socket.on("actualizarEstado", (nuevoEstado) => {
    if (socket.id === anfitrionId) {
      estadoJuego = nuevoEstado;
      socket.broadcast.emit("sincronizar", estadoJuego);
    }
  });

  socket.on("broadcastObjetos", (lista) => {
    objetosVisuales = lista; // ✅ GUARDAR para nuevos clientes
    socket.broadcast.emit("objetosVisuales", lista);
  });

  socket.on("bolitaFinalizo", ({ casilla }) => {
    console.log("✅ La bolita cayó en la casilla:", casilla);
  
    const ganadores = [];
  
    for (let nombre in predicciones) {
        if (Number(predicciones[nombre]) === casilla && jugadores[nombre]) {
          ganadores.push({ nombre });
          jugadores[nombre].monedas += bancoMonedas;
        }
      }
  
    // 💰 Repartir el banco
    let recompensa = 0;
    if (ganadores.length > 0) {
        recompensa = Math.floor(bancoMonedas / ganadores.length);
        bancoMonedas -= recompensa * ganadores.length; // 💰 Reducir solo lo repartido
        enviarBancoActualizado(); // 👈 Nuevo
      }
  
    // Enviar resultado y recompensa
    io.emit("resultadoRonda", {
      casilla,
      ganadores: ganadores.map(g => g.nombre),
      recompensa
    });

    // Actualiza monedas a todos
    for (let nombre in jugadores) {
        const sId = jugadores[nombre].socketId;
        const s = io.sockets.sockets.get(sId);
        if (s) {
          s.emit("monedasActualizadas", {
            monedas: jugadores[nombre].monedas,
            bancoMonedas
          });
        }
      }
  });
  


  socket.on("disconnect", () => {
    console.log(`❌ Jugador desconectado: ${socket.id}`);
    // Buscar nombre del jugador asociado
    const nombre = Object.keys(jugadores).find(n => jugadores[n].socketId === socket.id);

  if (nombre) {
    delete jugadores[nombre];
    delete predicciones[nombre]; // cambia a usar nombre también
    if (socket.id === anfitrionId) {
      anfitrionId = null;

      const clientesRestantes = Object.values(jugadores)
        .filter(j => j.socketId !== socket.id);
  
      if (clientesRestantes.length > 0) {
        anfitrionId = clientesRestantes[0];
        io.to(anfitrionId).emit("rolAsignado", "anfitrion");
        console.log("🔄 Nuevo anfitrión:", anfitrionId);
      } else {
        estadoJuego = [];
        objetosVisuales = [];
      }
    }
}
  });
});

function enviarBancoActualizado() {
    io.emit("bancoActualizado", bancoMonedas);
  }
  

server.listen(3000, () => {
  console.log("🚀 Servidor corriendo en http://localhost:3000");
});
