module.exports = function (io) {
  let jugadores = {}; // { nombre: { socketId, monedas } }
  let anfitrion = { nombre: null, socketId: null };
  let apuestas = {}; // { nombre: caballoIndex }
  let bancoMonedas = 0;
  let caballos = ["Caballo 1", "Caballo 2", "Caballo 3"];

  io.on("connection", (socket) => {
    console.log("[Carrera] 🧩 Cliente conectado:", socket.id);

    socket.on("registrarJugador", (nombre) => {
      if (!jugadores[nombre]) {
        jugadores[nombre] = { socketId: socket.id, monedas: 50 };
        console.log(`[Carrera] 🆕 Nuevo jugador: ${nombre}`);
      } else {
        jugadores[nombre].socketId = socket.id;
        console.log(`[Carrera] 🔄 Reconectado: ${nombre}`);
      }

      socket.emit("monedasIniciales", {
        monedas: jugadores[nombre].monedas,
        bancoMonedas,
      });

      if (!anfitrion.nombre || anfitrion.nombre === nombre) {
        anfitrion = { nombre, socketId: socket.id };
        socket.emit("rolAsignado", "anfitrion");
        console.log(`[Carrera] ⭐ ${nombre} asignado como anfitrión`);
      } else {
        socket.emit("rolAsignado", "cliente");
      }
    });

    socket.on("apuestaHecha", ({ nombre, caballo }) => {
      if (jugadores[nombre] && jugadores[nombre].monedas > 0) {
        jugadores[nombre].monedas -= 1;
        bancoMonedas += 1;
        apuestas[nombre] = caballo;

        socket.emit("monedasActualizadas", {
          monedas: jugadores[nombre].monedas,
          bancoMonedas,
        });

        enviarBancoActualizado();
        io.emit("apuestasActuales", apuestas);
        console.log(`[Carrera] 💰 ${nombre} apostó al ${caballos[caballo]}`);

        // Verificar si todos apostaron
        const jugadoresActivos = Object.entries(jugadores).filter(
          ([_, data]) => data.socketId !== null
        );

        const todosListos =
          jugadoresActivos.length > 0 &&
          jugadoresActivos.every(([nombre]) => apuestas[nombre] !== undefined);

        if (todosListos && anfitrion.socketId) {
          io.to(anfitrion.socketId).emit("activarCarrera");
          console.log(
            "[Carrera] 🟢 Todos listos. Se puede iniciar la carrera."
          );
        }
      }
    });

    socket.on("resultadoCarrera", ({ ganadorIndex }) => {
      console.log(`[Carrera] 🏁 Ganó el ${caballos[ganadorIndex]}`);

      const ganadores = [];

      for (let nombre in apuestas) {
        if (apuestas[nombre] === ganadorIndex && jugadores[nombre]) {
          ganadores.push(nombre);
        }
      }

      let recompensa = 0;
      if (ganadores.length > 0) {
        recompensa = Math.floor(bancoMonedas / ganadores.length);
        bancoMonedas -= recompensa * ganadores.length;
        enviarBancoActualizado();
      }

      // Repartir monedas
      ganadores.forEach((nombre) => {
        jugadores[nombre].monedas += recompensa;
      });

      // Actualizar a todos
      for (let nombre in jugadores) {
        const sId = jugadores[nombre].socketId;
        const s = io.sockets.get(sId);
        if (s) {
          s.emit("monedasActualizadas", {
            monedas: jugadores[nombre].monedas,
            bancoMonedas,
          });
        }
      }

      io.emit("resultadoFinal", {
        ganador: caballos[ganadorIndex],
        ganadores,
        recompensa,
      });

      apuestas = {}; // Limpiar para la siguiente ronda
    });

    socket.on("disconnect", () => {
      const nombre = Object.keys(jugadores).find(
        (n) => jugadores[n].socketId === socket.id
      );

      if (nombre) {
        jugadores[nombre].socketId = null;
        delete apuestas[nombre];

        if (nombre === anfitrion.nombre) {
          anfitrion.socketId = null;
          console.log("[Carrera] ⚠️ Anfitrión desconectado");

          setTimeout(() => {
            if (anfitrion.socketId === null) {
              const siguiente = Object.entries(jugadores).find(
                ([_, data]) => data.socketId !== null
              );

              if (siguiente) {
                anfitrion = {
                  nombre: siguiente[0],
                  socketId: siguiente[1].socketId,
                };
                io.to(anfitrion.socketId).emit("rolAsignado", "anfitrion");
              } else {
                anfitrion = { nombre: null, socketId: null };
                apuestas = {};
                jugadores = {};
              }
            }
          }, 10000);
        }
      }
    });

    function enviarBancoActualizado() {
      io.emit("bancoActualizado", bancoMonedas);
    }
  });
};
