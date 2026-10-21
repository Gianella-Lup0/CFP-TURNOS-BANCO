// Conexión al canal nativo de comunicación
const canal = new BroadcastChannel('canal_turnero');

// Estado local del usuario
let miTurnoCodigo = null;
let turnosPorDelante = 0;

document.addEventListener('DOMContentLoaded', () => {
  // Reloj digital móvil
  actualizarReloj();
  setInterval(actualizarReloj, 1000);

  // 1. Leer el parámetro 'turno' de la URL usando URLSearchParams
  const urlParams = new URLSearchParams(window.location.search);
  miTurnoCodigo = urlParams.get('turno') ? urlParams.get('turno').toUpperCase() : null;

  const displayNumero = document.getElementById('user-turn-number');
  const displayServicio = document.getElementById('user-turn-service');

  if (miTurnoCodigo) {
    if (displayNumero) displayNumero.textContent = miTurnoCodigo;
    if (displayServicio) displayServicio.textContent = determinarServicioPorPrefijo(miTurnoCodigo);
  } else {
    if (displayNumero) displayNumero.textContent = 'S/T';
    if (displayServicio) displayServicio.textContent = 'Acceda mediante su código QR o enlace enviado';
  }

  // 2. Escuchar los mensajes del canal de comunicación
  canal.onmessage = (evento) => {
    const data = evento.data;
    if (!data || !miTurnoCodigo) return;

    // Cuando la TV o el Operador llaman un turno
    if (data.accion === 'TURNO_LLAMADO') {
      if (data.numero === miTurnoCodigo) {
        notificarTurnoLlamado(data.caja);
      } else {
        actualizarContadorLlamados();
      }
    }
  };
});

/**
 * Determina el nombre del servicio según la letra inicial del turno
 */
function determinarServicioPorPrefijo(codigo) {
  const prefijo = codigo.charAt(0);
  switch (prefijo) {
    case 'P': return 'Atención Prioritaria';
    case 'C': return 'Operaciones por Caja';
    case 'T': return 'Tarjetas y Cuentas';
    case 'A': return 'Asesoría y Créditos';
    default: return 'Atención General';
  }
}

/**
 * Notifica al cliente en pantalla y activa la vibración cuando es convocado
 */
function notificarTurnoLlamado(puesto) {
  const cardElemento = document.getElementById('mobile-card');
  const badgeElemento = document.getElementById('status-badge');
  const counterContainer = document.getElementById('waiting-counter-container');
  const messageElemento = document.getElementById('status-message');
  const destinationBox = document.getElementById('destination-box');
  const destinationPuesto = document.getElementById('destination-puesto');

  // Cambiar clases e iluminación de fondo a verde brillante
  if (cardElemento) cardElemento.className = 'mobile-card status-called';
  if (badgeElemento) badgeElemento.textContent = '¡ES SU TURNO!';
  
  if (counterContainer) counterContainer.style.display = 'none';
  if (messageElemento) messageElemento.textContent = '¡Atención! Ha sido convocado.';

  if (destinationBox) destinationBox.style.display = 'flex';
  if (destinationPuesto) destinationPuesto.textContent = puesto;

  // Activar patrón de vibración en el dispositivo móvil (si está soportado)
  if ('vibrate' in navigator) {
    // Patrón de vibración: 500ms vibra, 200ms pausa, 500ms vibra, 200ms pausa, 800ms vibra
    navigator.vibrate([500, 200, 500, 200, 800]);
  }
}

/**
 * Decrementa el contador de turnos restantes cuando se llama a un turno ajeno
 */
function actualizarContadorLlamados() {
  const counterElement = document.getElementById('turns-ahead-count');
  if (!counterElement) return;

  let valorActual = parseInt(counterElement.textContent, 10);
  if (isNaN(valorActual)) {
    valorActual = 1; // Valor inicial por defecto si no se había calculado
  } else if (valorActual > 0) {
    valorActual--;
  }

  counterElement.textContent = valorActual;
}

/**
 * Reloj digital móvil
 */
function actualizarReloj() {
  const clockEl = document.getElementById('cliente-clock');
  if (clockEl) {
    const ahora = new Date();
    clockEl.textContent = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
}