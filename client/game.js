function mostrarMensaje(texto, duracion = 3000) {
    const mensaje = document.getElementById("mensajeEmergente");
    mensaje.textContent = texto;
    mensaje.classList.add("visible");
  
    setTimeout(() => {
      mensaje.classList.remove("visible");
    }, duracion);
  }  

const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let monedas = 0;
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
  function actualizarDisplayMonedas() {
    document.getElementById("monedasDisplay").textContent = `🪙 ${monedas}`;
  }
  
  function actualizarDisplayBanco(b) {
    document.getElementById("bancoDisplay").textContent = `💰 ${b}`;
  }
  


  function getNombreDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    const nombre = params.get("nombre");
    return nombre && nombre.trim() !== "" ? nombre : null;
  }

nombreJugador = getNombreDesdeURL();

if (nombreJugador) {
    socket.emit("registrarJugador", nombreJugador);
  } else {
    alert("⚠️ Nombre de jugador inválido.");
  }

// Variables globales
let esAnfitrion = false;
let bolitas = [];
let objetosEstaticos = [];
let objetosVisuales = []; // Solo para dibujo en clientes
let engine = null;
let world = null;

let prediccion = null;
let prediccionConfirmada = false;

const modal = document.getElementById("modalPrediccion");
const btnPredecir = document.getElementById("btnPredecir");
const btnConfirmar = document.getElementById("btnConfirmarPrediccion");
const prediccionTexto = document.getElementById("prediccionTexto");
const botonesCasilla = document.querySelectorAll(".casilla-btn");

// Abrir modal
btnPredecir.addEventListener("click", () => {
  if (prediccionConfirmada) return; // Ya confirmó
  modal.style.display = "block";
});

// Elegir una casilla
botonesCasilla.forEach(btn => {
  btn.addEventListener("click", () => {
    if (prediccionConfirmada) return;

    botonesCasilla.forEach(b => b.classList.remove("seleccionada"));
    btn.classList.add("seleccionada");
    prediccion = parseInt(btn.dataset.casilla);
  });
});

// Confirmar elección
btnConfirmar.addEventListener("click", () => {
  if (prediccion === null || prediccionConfirmada) return;
  if (monedas <= 0) {
    mostrarMensaje("No tienes suficientes monedas para predecir.");
    return;
  }

  monedas -= 1;              // 💸 Restar moneda
  actualizarMonedas();       // 🪙 Mostrar nuevas monedas

  prediccionConfirmada = true;
  modal.style.display = "none";
  btnPredecir.disabled = true;
  prediccionTexto.textContent = `Tu apuesta ${prediccion}`;
  socket.emit("prediccionHecha", {
    nombre: nombreJugador,
    casilla: Number(prediccion)
  });
  
});



// Socket.io: recibir objetos visuales
socket.on("objetosVisuales", (data) => {
  objetosVisuales = data;
});

// Al recibir el rol
socket.on("rolAsignado", (rol) => {
    esAnfitrion = rol === "anfitrion";
    console.log("🎮 Rol asignado:", rol);
    if (!esAnfitrion) {
        document.getElementById("btnRandom").style.display = "none";
      }      
  
    if (esAnfitrion && !engine) {
      inicializarFisicasYObjetos(); // vuelve a activar el motor
    }
  });
  

// Crear objetos estáticos y visuales (solo anfitrión)
function inicializarFisicasYObjetos() {
  // Crear motor de físicas
  engine = Matter.Engine.create();
  world = engine.world;
  world.gravity.y = 0.3;
  Matter.Runner.run(Matter.Runner.create(), engine);

  // Crear y guardar objetos físicos y visuales
  const suelo = Matter.Bodies.rectangle(200, canvas.height - 5, 400, 20, { isStatic: true });
  objetosEstaticos.push(suelo);
  objetosVisuales.push({ tipo: "rect", x: 200, y: canvas.height - 5, w: 400, h: 20 });

  const leftWall = Matter.Bodies.rectangle(-10, canvas.height / 2, 20, canvas.height, { isStatic: true });
  const rightWall = Matter.Bodies.rectangle(410, canvas.height / 2, 20, canvas.height, { isStatic: true });
  objetosEstaticos.push(leftWall, rightWall);
  objetosVisuales.push({ tipo: "rect", x: -10, y: canvas.height / 2, w: 20, h: canvas.height });
  objetosVisuales.push({ tipo: "rect", x: 410, y: canvas.height / 2, w: 20, h: canvas.height });

  const pinRadius = 5;
  const filasDePines = 9;
  const margenLateral = 24;
  const pinSpacingX = 44;
  const pinSpacingY = 50;
  
  for (let row = 0; row < filasDePines; row++) {
    const y = 100 + row * pinSpacingY;
  
    const cantidad = row % 2 === 0 ? 9 : 8;
    const totalAncho = (cantidad - 1) * pinSpacingX;
  
    // NUEVO: aseguramos que totalAncho no exceda ancho útil
    const maxAnchoUtil = canvas.width - 2 * margenLateral;
    if (totalAncho > maxAnchoUtil) {
      console.warn("⚠️ Demasiados pines para el margen especificado");
    }
  
    const inicioX = (canvas.width - totalAncho) / 2; // centrado total
  
    for (let i = 0; i < cantidad; i++) {
      const x = inicioX + i * pinSpacingX;
  
      const pin = Matter.Bodies.circle(x, y, pinRadius, { isStatic: true });
      objetosEstaticos.push(pin);
      objetosVisuales.push({ tipo: "circulo", x, y, r: pinRadius });
    }
  }

  const numCasillas = 6;
    const casillaAltura = 100;
    const casillaAncho = canvas.width / numCasillas;
    const bordeGrosor = 10;

    for (let i = 1; i < numCasillas; i++) {
    const x = i * casillaAncho;

    const divisor = Matter.Bodies.rectangle(
        x,
        canvas.height - casillaAltura / 2,
        bordeGrosor,
        casillaAltura,
        { isStatic: true }
    );

    objetosEstaticos.push(divisor);
    objetosVisuales.push({
        tipo: "rect",
        x: x,
        y: canvas.height - casillaAltura / 2,
        w: bordeGrosor,
        h: casillaAltura
    });
    }

  // Agregar objetos al mundo físico
  Matter.World.add(world, objetosEstaticos);

  // Enviar objetos visuales a los clientes
  socket.emit("broadcastObjetos", objetosVisuales);
}

// Crear bolitas (anfitrión)
canvas.addEventListener("click", (e) => {
  if (!esAnfitrion) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const body = Matter.Bodies.circle(x, y, 10, {
    restitution: 1,
    friction: 0.001,
    frictionAir: 0.002,
    density: 0.001
  });

  Matter.World.add(world, body);
  bolitas.push(body);
});

function generarBolitaAleatoria() {
    if (!esAnfitrion || !world) return;
  
    const startX = canvas.width / 2;
    const startY = 50;
  
    const bolita = Matter.Bodies.circle(startX, startY, 10, {
      isStatic: true,
      restitution: 1,
      friction: 0.001,
      frictionAir: 0.002,
      density: 0.001
    });
    bolita.detectada = false;
  
    Matter.World.add(world, bolita);
    bolitas.push(bolita);
  
    // Movimiento aleatorio en X
    let direccion = Math.random() < 0.5 ? -1 : 1;
    const velocidadX = 3 + Math.random() * 2; // 3 a 5 px por frame
    const tiempoMovimiento = Math.random() * 2000;
  
    let tiempoTranscurrido = 0;
  
    function mover() {
      const nuevaX = bolita.position.x + direccion * velocidadX;
  
      // 🔄 Invertir dirección si toca los bordes del canvas
      if (nuevaX <= 10 || nuevaX >= canvas.width - 10) {
        direccion *= -1;
      }
  
      // Mover la bolita horizontalmente
      Matter.Body.setPosition(bolita, { x: bolita.position.x + direccion * velocidadX, y: bolita.position.y });
  
      tiempoTranscurrido += 16;
  
      if (tiempoTranscurrido >= tiempoMovimiento) {
        // Activar caída con gravedad
        Matter.Body.setStatic(bolita, false);
      } else {
        setTimeout(mover, 16);
      }
    }
  
    mover();
  }

  socket.on("activarPlay", () => {
    if (esAnfitrion) {
      btn.disabled = false;
    }
  });  

  const monedasDisplay = document.getElementById("monedasDisplay");
    function actualizarMonedas() {
    monedasDisplay.textContent = `🪙 ${monedas}`;
    }
    actualizarMonedas();
  const btn = document.getElementById("btnRandom");
    btn.disabled = true; // desactivado por defecto

    btn.addEventListener("click", () => {
    if (!esAnfitrion) return;

    // Generar la bolita aleatoria (como anfitrión)
    generarBolitaAleatoria();

    // Desactivar el botón nuevamente hasta siguiente ronda (si se desea)
    btn.disabled = true;
    });

    const bancoDisplay = document.getElementById("bancoDisplay");

    socket.on("bancoActualizado", (nuevoValor) => {
    bancoDisplay.textContent = `💰 ${nuevoValor}`;
    });



// Recibir estado del anfitrión
socket.on("sincronizar", (estado) => {
  if (!esAnfitrion) {
    bolitas = estado;
  }
});

socket.on("resultadoRonda", ({ casilla, ganadores, recompensa }) => {
  let mensaje = `La bolita cayó en la casilla ${casilla}. `;

  if (ganadores.length > 0) {
    mensaje += `🎉 Ganador(es): ${ganadores.join(", ")}.`;
    if (ganadores.includes(nombreJugador)) {
      monedas += recompensa;
      actualizarMonedas();
      mensaje += ` ¡Ganaste ${recompensa} monedas!`;
    }
  } else {
    mensaje += `😢 Nadie acertó.`;
  }

  mostrarMensaje(mensaje);

  // Reiniciar predicción local
  prediccion = null;
  prediccionConfirmada = false;
  prediccionTexto.textContent = "Sin apuesta.";
  btnPredecir.disabled = false;
  document.querySelectorAll(".casilla-btn").forEach(btn => {
    btn.classList.remove("seleccionada");
  });
});


// Bucle de dibujo
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 🎮 Anfitrión dibuja objetos estáticos
  if (esAnfitrion) {
    for (let obj of objetosEstaticos) {
      if (obj.circleRadius) {
        ctx.beginPath();
        ctx.arc(obj.position.x, obj.position.y, obj.circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#555";
        ctx.fill();
        ctx.closePath();
      } else {
        const { x, y } = obj.position;
        const w = obj.bounds.max.x - obj.bounds.min.x;
        const h = obj.bounds.max.y - obj.bounds.min.y;
        ctx.fillStyle = "#aaa";
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
      }
    }

    // Enviar posiciones de bolitas a los clientes
    const estadoSincronizado = bolitas.map(b => ({
      x: b.position.x,
      y: b.position.y
    }));
    socket.emit("actualizarEstado", estadoSincronizado);
  }

  // 👥 Clientes dibujan los objetos visuales (sin físicas)
  if (!esAnfitrion) {
    for (let obj of objetosVisuales) {
      if (obj.tipo === "rect") {
        ctx.fillStyle = "#aaa";
        ctx.fillRect(obj.x - obj.w / 2, obj.y - obj.h / 2, obj.w, obj.h);
      } else if (obj.tipo === "circulo") {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
        ctx.fillStyle = "#555";
        ctx.fill();
        ctx.closePath();
      }
    }
  }

      // Dibujar casillas inferiores
      const casillaAltura = 100;
      const casillaAncho = canvas.width / 6;
  
      for (let i = 0; i < 6; i++) {
      const x = i * casillaAncho;
      ctx.fillStyle = "#dddddd";
      ctx.fillRect(x, canvas.height - casillaAltura, casillaAncho, casillaAltura);
  
      // Línea divisoria
      ctx.strokeStyle = "#999";
      ctx.beginPath();
      ctx.moveTo(x, canvas.height - casillaAltura);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
  
      // Número de casilla
      ctx.fillStyle = "#333";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}`, x + casillaAncho / 2, canvas.height - 10);
      }

  // Dibujar bolitas
  for (let b of bolitas) {
    const x = esAnfitrion ? b.position.x : b.x;
    const y = esAnfitrion ? b.position.y : b.y;

    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#e74c3c";
    ctx.fill();
    ctx.closePath();
  }

  if (esAnfitrion) {
    for (let i = 0; i < bolitas.length; i++) {
      const b = bolitas[i];

      if (b.isStatic) continue;
  
      // Si la bolita ya está suficientemente baja
      if (!b.detectada && b.position.y >= canvas.height - 100) {
        const casillaAncho = canvas.width / 6;
        const casilla = Math.floor(b.position.x / casillaAncho) + 1;
  
        b.detectada = true; // evitar detectar más de una vez
        bolitaActiva = null;
        console.log("🎯 Bolita cayó en la casilla", casilla);
  
        // Enviar al servidor para validar predicciones
        socket.emit("bolitaFinalizo", { casilla });
      }
    }
  }
  

  requestAnimationFrame(draw);
}
draw();
