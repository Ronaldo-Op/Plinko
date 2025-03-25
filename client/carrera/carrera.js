// ==========================
// 🌐 Socket & Canvas
// ==========================
const socket = io("https://plinko-biur.onrender.com/carrera"); // sin /carrera si no usas namespace
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==========================
// 📦 Variables globales
// ==========================
let esAnfitrion = false;
let monedas = 0;
let apuesta = null;
let apuestaConfirmada = false;
let nombreJugador = getNombreDesdeURL();
const historialCarreras = [];

// 🖼️ Sprite del caballo
const caballoSprite = new Image();
caballoSprite.src = "img/horse.png";
// Puedes comprobarlo en consola
caballoSprite.onload = () => {
  console.log("Ancho total:", caballoSprite.width);
  console.log("Frame width:", caballoSprite.width / 8);
  mostrarCaballosEnReposo();
};

// 📐 Datos del sprite
const cols = 4;
const frameWidth = 128;
const frameHeight = 128;
const usableFrames = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // primera fila (galope lateral)
let frameCounter = 0;

const tempCanvas = document.createElement("canvas");
tempCanvas.width = frameWidth;
tempCanvas.height = frameHeight;
const tempCtx = tempCanvas.getContext("2d");

// 🐴 Datos de caballos
let caballos = [
  {
    nombre: "Caballo 1",
    x: 0,
    y: 50,
    frameIndex: 0,
    frameReposo: 0,
    color: "#e74c3c", // rojo intenso
  },
  {
    nombre: "Caballo 2",
    x: 0,
    y: 180,
    frameIndex: 0,
    frameReposo: 1,
    color: "#3498db", // azul brillante
  },
  {
    nombre: "Caballo 3",
    x: 0,
    y: 310,
    frameIndex: 0,
    frameReposo: 2,
    color: "#2ecc71", // verde pasto
  },
];

// ==========================
// 🧩 Elementos del DOM
// ==========================
const btnHistorial = document.getElementById("btnHistorial");
const modalHistorial = document.getElementById("modalHistorial");
const listaHistorial = document.getElementById("listaHistorial");

const modal = document.getElementById("modalPrediccion");
const btnPredecir = document.getElementById("btnPredecir");
const btnConfirmar = document.getElementById("btnConfirmarPrediccion");
const prediccionTexto = document.getElementById("prediccionTexto");
const botonesCaballo = document.querySelectorAll(".casilla-btn");

const btnIniciar = document.getElementById("btnRandom");
btnIniciar.disabled = true;

const verApuestasBtn = document.getElementById("verApuestasBtn");
const modalApuestas = document.getElementById("modalApuestas");
const cerrarApuestasBtn = document.getElementById("cerrarApuestasBtn");
const listaApuestas = document.getElementById("listaApuestas");

const monedasDisplay = document.getElementById("monedasDisplay");
const bancoDisplay = document.getElementById("bancoDisplay");

// ==========================
// 🧠 Funciones utilitarias
// ==========================
function mostrarMensaje(texto, duracion = 3000) {
  const mensaje = document.getElementById("mensajeEmergente");
  mensaje.textContent = texto;
  mensaje.classList.add("visible");
  setTimeout(() => mensaje.classList.remove("visible"), duracion);
}

function getNombreDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const nombre = params.get("nombre");
  return nombre && nombre.trim() !== "" ? nombre : null;
}

function actualizarDisplayMonedas() {
  monedasDisplay.textContent = `🪙 ${monedas}`;
}

function actualizarDisplayBanco(b) {
  bancoDisplay.textContent = `💰 ${b}`;
}

function cerrarHistorial() {
  modalHistorial.style.display = "none";
}

// ==========================
// 🚀 Registro
// ==========================
if (nombreJugador) {
  socket.emit("registrarJugador", nombreJugador);
} else {
  alert("⚠️ Nombre de jugador inválido.");
}

// ==========================
// 💬 Socket.io listeners
// ==========================
socket.on("monedasIniciales", ({ monedas: m, bancoMonedas: b }) => {
  monedas = m;
  actualizarDisplayMonedas();
  actualizarDisplayBanco(b);
});

socket.on("monedasActualizadas", ({ monedas: m, bancoMonedas: b }) => {
  monedas = m;
  actualizarDisplayMonedas();
  actualizarDisplayBanco(b);
});

socket.on("rolAsignado", (rol) => {
  esAnfitrion = rol === "anfitrion";
  btnIniciar.style.display = esAnfitrion ? "block" : "none";
  if (esAnfitrion) console.log("⭐ Eres anfitrión");
});

socket.on("apuestasActuales", (data) => {
  listaApuestas.innerHTML = "";
  Object.entries(data).forEach(([nombre, caballo]) => {
    const li = document.createElement("li");
    li.textContent = `🐴 ${nombre} apostó por ${caballos[caballo].nombre}`;
    listaApuestas.appendChild(li);
  });
});

socket.on("activarCarrera", () => {
  if (esAnfitrion) {
    iniciarCarrera();
  }
});

socket.on("resultadoFinal", ({ ganador, ganadores, recompensa }) => {
  mostrarMensaje(
    `🏁 Ganó ${ganador}. 🎉 Ganadores: ${ganadores.join(
      ", "
    )}. 💰 Recompensa: ${recompensa}`
  );

  historialCarreras.unshift({
    ganador,
    ganadores,
  });

  const li = document.createElement("li");
  li.textContent = `🏁 Ganó: ${ganador} | Ganadores: ${
    ganadores.length > 0 ? ganadores.join(", ") : "Nadie"
  }`;
  listaHistorial.prepend(li);

  // Reset local
  apuesta = null;
  apuestaConfirmada = false;
  prediccionTexto.textContent = "Sin apuesta.";
  btnPredecir.disabled = false;
  botonesCaballo.forEach((btn) => btn.classList.remove("seleccionada"));
});

// ==========================
// 🎮 Eventos UI
// ==========================
btnPredecir.addEventListener("click", () => {
  if (apuestaConfirmada) return;
  modal.style.display = "block";
});

botonesCaballo.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (apuestaConfirmada) return;
    botonesCaballo.forEach((b) => b.classList.remove("seleccionada"));
    btn.classList.add("seleccionada");
    apuesta = parseInt(btn.dataset.casilla);
  });
});

btnConfirmar.addEventListener("click", () => {
  if (apuesta === null || apuestaConfirmada) return;
  if (monedas <= 0) return mostrarMensaje("No tienes suficientes monedas.");

  monedas -= 1;
  actualizarDisplayMonedas();

  apuestaConfirmada = true;
  modal.style.display = "none";
  btnPredecir.disabled = true;
  prediccionTexto.textContent = `Apuesta al ${caballos[apuesta].nombre}`;
  socket.emit("apuestaHecha", {
    nombre: nombreJugador,
    caballo: apuesta,
  });
});

btnHistorial.addEventListener("click", () => {
  modalHistorial.style.display = "block";
});

verApuestasBtn.addEventListener("click", () => {
  modalApuestas.style.display = "block";
});

cerrarApuestasBtn.addEventListener("click", () => {
  modalApuestas.style.display = "none";
});

btnIniciar.addEventListener("click", () => {
  if (esAnfitrion) iniciarCarrera();
});

// ==========================
// 🎬 Animación de carrera
// ==========================
function dibujarCarrera() {
  // Fondo de pista
  ctx.fillStyle = "#c2b280";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const carrilAlto = 120;
  caballos.forEach((caballo, i) => {
    const yTop = i * carrilAlto;

    // Carril
    ctx.fillStyle = i % 2 === 0 ? "#d6c799" : "#c9bc8b";
    ctx.fillRect(0, yTop, canvas.width, carrilAlto);

    // Línea divisoria
    if (i < caballos.length - 1) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(0, yTop + carrilAlto);
      ctx.lineTo(canvas.width, yTop + carrilAlto);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Línea de meta
  ctx.strokeStyle = "#e74c3c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(canvas.width - 20, 0);
  ctx.lineTo(canvas.width - 20, canvas.height);
  ctx.stroke();

  // Dibujar caballos animados
  caballos.forEach((caballo, i) => {
    // Animar frame cada 6 ciclos para mejor fluidez
    if (frameCounter % 6 === 0) {
      caballo.frameIndex = (caballo.frameIndex + 1) % usableFrames.length;
    }

    const frame = usableFrames[caballo.frameIndex];
    const sx = (frame % cols) * frameWidth;
    const sy = Math.floor(frame / cols) * frameHeight;

    // 🎨 Aplicar filtro de color individual
    // 🖼️ Dibujar frame en canvas temporal
    tempCtx.clearRect(0, 0, frameWidth, frameHeight);
    tempCtx.drawImage(
      caballoSprite,
      sx,
      sy,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight
    );

    // 🎨 Obtener píxeles y recolorear
    const imageData = tempCtx.getImageData(0, 0, frameWidth, frameHeight);
    const data = imageData.data;

    const color = hexToRGB(caballo.color); // 💡 usamos función abajo

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];

      // Si no es transparente
      if (alpha > 0) {
        const avg = (r + g + b) / 3;
        data[i] = (color.r * avg) / 255;
        data[i + 1] = (color.g * avg) / 255;
        data[i + 2] = (color.b * avg) / 255;
      }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // 📌 Dibujar en canvas principal
    ctx.drawImage(tempCanvas, caballo.x, caballo.y);
  });
  frameCounter++;
}

function mostrarCaballosEnReposo() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fondo + carriles
  dibujarCarrera();

  caballos.forEach((caballo) => {
    const frame = caballo.frameReposo;
    const sx = (frame % cols) * frameWidth;
    const sy = Math.floor(frame / cols) * frameHeight;

    // Teñido con canvas temporal (si estás usando recoloración)
    tempCtx.clearRect(0, 0, frameWidth, frameHeight);
    tempCtx.drawImage(
      caballoSprite,
      sx,
      sy,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight
    );

    const imageData = tempCtx.getImageData(0, 0, frameWidth, frameHeight);
    const data = imageData.data;
    const color = hexToRGB(caballo.color);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2],
        a = data[i + 3];
      if (a > 0) {
        const avg = (r + g + b) / 3;
        data[i] = (color.r * avg) / 255;
        data[i + 1] = (color.g * avg) / 255;
        data[i + 2] = (color.b * avg) / 255;
      }
    }

    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, caballo.x, caballo.y);

    // Nombre del caballo
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.fillText(caballo.nombre, caballo.x + 10, caballo.y - 5);
  });
}

function hexToRGB(hex) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function iniciarCarrera() {
  caballos.forEach((c) => {
    c.x = 0;
    c.frameIndex = 0;
  });

  let ganadorIndex = null;

  function animar() {
    caballos.forEach((c, i) => {
      const velocidad = Math.random() * 2 + 1;
      c.x += velocidad;

      // Detectar ganador
      if (c.x + frameWidth >= canvas.width - 20 && ganadorIndex === null) {
        ganadorIndex = i;
      }
    });

    dibujarCarrera();

    if (ganadorIndex !== null) {
      const nombreGanador = caballos[ganadorIndex].nombre;
      socket.emit("resultadoCarrera", { ganadorIndex });
    } else {
      requestAnimationFrame(animar);
    }
  }

  animar();
}

// ==========================
// ▶️ Iniciar dibujo base
// ==========================
dibujarCarrera();
