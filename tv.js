// Conexión al canal nativo de comunicación
const canal = new BroadcastChannel('canal_turnero');

// Estado del historial, audio y contexto Web Audio API
let turnoActualHero = null;
const historialLlamados = []; // Máximo 4 elementos
let audioHabilitado = false;
let audioCtx = null;

document.addEventListener('DOMContentLoaded', () => {
  // Reloj digital en vivo
  actualizarReloj();
  setInterval(actualizarReloj, 1000);

  // Configuración del botón de desbloqueo de audio
  const btnAudio = document.getElementById('btn-audio');
  if (btnAudio) {
    btnAudio.addEventListener('click', () => {
      audioHabilitado = true;

      // Inicializar o reanudar el AudioContext tras la interacción del usuario
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) {
        audioCtx = new AudioContext();
      } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Habilitar la API de voz con un mensaje vacío
      if ('speechSynthesis' in window) {
        const testUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(testUtterance);
      }

      // Ocultar el botón flotante
      btnAudio.style.display = 'none';
    });
  }

  // Escuchar mensajes del canal con la acción TURNO_LLAMADO
  canal.onmessage = (evento) => {
    const data = evento.data;
    if (!data) return;

    if (data.accion === 'TURNO_LLAMADO') {
      procesarNuevoLlamado(data);
    }
  };
});

/**
 * Genera un acorde bimbal "Ding-Dong" suave y armónico de 800ms
 * con sintetizador sustractivo mediante Web Audio API.
 * Devuelve una Promesa que se resuelve cuando el sonido finaliza.
 */
function reproducirDingDong() {
  return new Promise((resolve) => {
    if (!audioHabilitado || !audioCtx) {
      resolve();
      return;
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const ahora = audioCtx.currentTime;
    const duracionNota = 0.4; // 400ms por nota ("Ding" + "Dong" = 800ms)

    // Configurar osciladores para el primer tono "Ding" (E5 = 659.25 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ahora);

    // Envolvente de volumen (Envelope) para el "Ding"
    gain1.gain.setValueAtTime(0, ahora);
    gain1.gain.linearRampToValueAtTime(0.25, ahora + 0.02); // Ataque suave
    gain1.gain.exponentialRampToValueAtTime(0.001, ahora + duracionNota); // Decaimiento

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    // Configurar osciladores para el segundo tono "Dong" (C5 = 523.25 Hz)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, ahora + 0.35);

    // Envolvente de volumen (Envelope) para el "Dong"
    gain2.gain.setValueAtTime(0, ahora + 0.35);
    gain2.gain.linearRampToValueAtTime(0.3, ahora + 0.37); // Ataque suave
    gain2.gain.exponentialRampToValueAtTime(0.001, ahora + 0.35 + duracionNota); // Decaimiento

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    // Reproducción secuencial
    osc1.start(ahora);
    osc1.stop(ahora + duracionNota);

    osc2.start(ahora + 0.35);
    osc2.stop(ahora + 0.35 + duracionNota);

    // Resolver la promesa exactamente a los 800ms
    setTimeout(() => {
      resolve();
    }, 800);
  });
}

/**
 * Vocaliza el llamado del turno usando SpeechSynthesisUtterance
 */
function vocalizarLlamado(numero, puesto) {
  if (!('speechSynthesis' in window) || !audioHabilitado) return;

  // Cancelar locuciones previas
  window.speechSynthesis.cancel();

  const mensajeText = `Turno ${numero}, dirigirse a ${puesto}`;
  const mensaje = new SpeechSynthesisUtterance(mensajeText);

  mensaje.lang = 'es-AR';
  mensaje.rate = 0.9;

  const voces = window.speechSynthesis.getVoices();
  const vozEspanol = voces.find(voz => voz.lang.includes('es-AR') || voz.lang.includes('es-ES') || voz.lang.includes('es'));
  if (vozEspanol) {
    mensaje.voice = vozEspanol;
  }

  window.speechSynthesis.speak(mensaje);
}

/**
 * Procesa el turno llamado: reproduce el Ding-Dong primero
 * y luego dispara la locución por voz.
 */
async function procesarNuevoLlamado(nuevoTurno) {
  // Trasladar el turno previo del Hero al historial
  if (turnoActualHero) {
    historialLlamados.unshift(turnoActualHero);
    if (historialLlamados.length > 4) {
      historialLlamados.pop();
    }
  }

  // Establecer el nuevo turno en la zona Hero
  turnoActualHero = nuevoTurno;

  // Renderizar componentes
  renderizarHero(nuevoTurno);
  renderizarHistorial();

  // Animación visual de destello/pulso
  dispararAnimacionHero();

  // 1. Reproducir el Ding-Dong y esperar 800ms a que finalice
  await reproducirDingDong();

  // 2. Disparar el sintetizador de voz
  vocalizarLlamado(nuevoTurno.numero, nuevoTurno.caja);
}

/**
 * Renderiza los datos del turno en la zona Hero
 */
function renderizarHero(turno) {
  const numeroEl = document.getElementById('tv-numero');
  const servicioEl = document.getElementById('tv-servicio');
  const destinoEl = document.getElementById('tv-destino');
  const badgeEl = document.getElementById('tv-badge');

  if (numeroEl) numeroEl.textContent = turno.numero;
  if (servicioEl) servicioEl.textContent = `${turno.servicio} (${turno.hora} hs)`;
  if (destinoEl) destinoEl.textContent = turno.caja;

  if (badgeEl) {
    badgeEl.textContent = turno.tipo || 'GENERAL';
    if (turno.tipo === 'Prioritario') {
      badgeEl.classList.add('badge-priority');
    } else {
      badgeEl.classList.remove('badge-priority');
    }
  }
}

/**
 * Renderiza la lista con los últimos turnos en la zona lateral
 */
function renderizarHistorial() {
  const historyListEl = document.getElementById('history-list');
  if (!historyListEl) return;

  historyListEl.innerHTML = '';

  if (historialLlamados.length === 0) {
    historyListEl.innerHTML = '<li class="history-empty">Sin historial de llamadas</li>';
    return;
  }

  historialLlamados.forEach((item) => {
    const li = document.createElement('li');
    li.className = `history-item ${item.tipo === 'Prioritario' ? 'priority' : ''}`;
    
    li.innerHTML = `
      <div class="history-left">
        <span class="history-numero">${item.numero}</span>
        <span class="history-servicio">${item.servicio}</span>
      </div>
      <span class="history-caja">${item.caja}</span>
    `;

    historyListEl.appendChild(li);
  });
}

/**
 * Aplica la clase 'animar-llamado' para producir el parpadeo/pulso
 */
function dispararAnimacionHero() {
  const heroCard = document.getElementById('hero-card');
  if (!heroCard) return;

  heroCard.classList.remove('animar-llamado');
  void heroCard.offsetWidth; // Reflow forzado
  heroCard.classList.add('animar-llamado');
}

/**
 * Reloj digital para la TV
 */
function actualizarReloj() {
  const clockEl = document.getElementById('tv-clock');
  if (clockEl) {
    const ahora = new Date();
    clockEl.textContent = ahora.toLocaleTimeString('es-AR');
  }
}