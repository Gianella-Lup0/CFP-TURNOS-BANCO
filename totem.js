// Canal de comunicación entre pantallas (Tótem, Operador, TV)
const canal = new BroadcastChannel('canal_turnero');

// Clave para almacenamiento en localStorage
const STORAGE_KEY_CONTADORES = 'turnero_totem_contadores';

// Contadores globales en memoria
let contadores = {
  prioritario: 0,
  caja: 0,
  tarjetas: 0,
  creditos: 0
};

document.addEventListener('DOMContentLoaded', () => {
  // Cargar contadores guardados previamente si existen
  cargarContadoresPersistidos();

  // Iniciar reloj digital del cabezal
  actualizarReloj();
  setInterval(actualizarReloj, 1000);

  // Asignar eventos de clic a los botones
  const botonesServicio = document.querySelectorAll('.service-btn');
  botonesServicio.forEach((boton) => {
    boton.addEventListener('click', manejarSeleccionServicio);
  });
});

/**
 * Carga contadores desde localStorage
 */
function cargarContadoresPersistidos() {
  const guardado = localStorage.getItem(STORAGE_KEY_CONTADORES);
  if (guardado) {
    try {
      contadores = JSON.parse(guardado);
    } catch (e) {
      console.error('Error al recuperar contadores:', e);
    }
  }
}

/**
 * Guarda el estado actual en localStorage
 */
function guardarContadores() {
  localStorage.setItem(STORAGE_KEY_CONTADORES, JSON.stringify(contadores));
}

/**
 * Manejador principal para la selección de servicio
 */
function manejarSeleccionServicio(evento) {
  const boton = evento.currentTarget;
  const tipoServicio = boton.dataset.servicio;

  let prefijo = '';
  let tipo = 'General';
  let servicio = '';
  let numeroConsecutivo = 0;
  let tiempoPorTurno = 3;
  let acumuladosPrevios = 0;

  switch (tipoServicio) {
    case 'priority':
      acumuladosPrevios = contadores.prioritario;
      contadores.prioritario++;
      numeroConsecutivo = contadores.prioritario;
      prefijo = 'P';
      tipo = 'Prioritario';
      servicio = 'Atención Prioritaria';
      tiempoPorTurno = 3;
      break;

    case 'cashier':
      acumuladosPrevios = contadores.caja;
      contadores.caja++;
      numeroConsecutivo = contadores.caja;
      prefijo = 'C';
      servicio = 'Operaciones por Caja';
      tiempoPorTurno = 3;
      break;

    case 'cards':
      acumuladosPrevios = contadores.tarjetas;
      contadores.tarjetas++;
      numeroConsecutivo = contadores.tarjetas;
      prefijo = 'T';
      servicio = 'Tarjetas y Cuentas';
      tiempoPorTurno = 5;
      break;

    case 'advisory':
      acumuladosPrevios = contadores.creditos;
      contadores.creditos++;
      numeroConsecutivo = contadores.creditos;
      prefijo = 'A';
      servicio = 'Asesoría y Créditos';
      tiempoPorTurno = 8;
      break;

    default:
      return;
  }

  // Persistir inmediatamente el incremento
  guardarContadores();

  // Calcular tiempo de espera
  const tiempoEsperaEstimado = acumuladosPrevios * tiempoPorTurno;

  const numeroFormateado = `${prefijo}-${formatearNumero(numeroConsecutivo)}`;
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-AR');
  const hora = ahora.toLocaleTimeString('es-AR');

  const datosTurno = {
    numero: numeroFormateado,
    tipo: tipo,
    servicio: servicio,
    prefijo: prefijo,
    fecha: fecha,
    hora: hora,
    tiempoEspera: tiempoEsperaEstimado
  };

  // Emitir turno
  emitirTurno(datosTurno);
}

/**
 * Emite el turno localmente y lo envía por BroadcastChannel
 */
function emitirTurno(turno) {
  renderizarTicket(turno);

  canal.postMessage({
    accion: 'NUEVO_TURNO',
    turno: turno
  });
}

/**
 * Actualiza el ticket e inicia la animación de salida
 */
function renderizarTicket(turno) {
  const ticketElemento = document.getElementById('ticket-impreso');
  const numeroElemento = document.getElementById('ticket-numero');
  const servicioElemento = document.getElementById('ticket-servicio');
  const badgeElemento = document.getElementById('ticket-badge');
  const fechaHoraElemento = document.getElementById('ticket-fechahora');
  const esperaElemento = document.getElementById('ticket-espera');

  if (numeroElemento) numeroElemento.textContent = turno.numero;
  if (servicioElemento) servicioElemento.textContent = turno.servicio;

  if (badgeElemento) {
    badgeElemento.textContent = turno.tipo;
    if (turno.tipo === 'Prioritario') {
      badgeElemento.classList.add('badge-priority');
    } else {
      badgeElemento.classList.remove('badge-priority');
    }
  }

  if (fechaHoraElemento) {
    fechaHoraElemento.textContent = `${turno.fecha} - ${turno.hora}`;
  }

  if (esperaElemento) {
    esperaElemento.textContent = turno.tiempoEspera > 0 
      ? `Tiempo de espera est.: ~${turno.tiempoEspera} min` 
      : 'Atención estimada: Inmediata';
  }

  // Reiniciar animación CSS de impresión
  ticketElemento.classList.remove('animating-print');
  void ticketElemento.offsetWidth; // Forzar reflow en el DOM
  ticketElemento.classList.add('animating-print');
}

/**
 * Formatea a dos dígitos (ej. 1 -> "01")
 */
function formatearNumero(numero) {
  return numero < 10 ? `0${numero}` : `${numero}`;
}

/**
 * Actualiza el reloj digital en vivo
 */
function actualizarReloj() {
  const relojElemento = document.getElementById('totem-clock');
  if (relojElemento) {
    const ahora = new Date();
    relojElemento.textContent = ahora.toLocaleTimeString('es-AR');
  }
}