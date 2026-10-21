// 1. Conectar al canal nativo de comunicación
const canal = new BroadcastChannel('canal_turnero');

// Clave para guardar el estado de las colas en localStorage
const STORAGE_KEY_OPERADOR = 'turnero_operador_estado';

// Arrays en memoria para almacenar las colas de espera
let colaPrioritaria = [];
let colaCaja = [];
let colaTarjetas = [];
let colaAsesoria = [];
let turnosAusentes = []; // Lista con objetos { turno, timeoutId }

// Estado local del turno actualmente en atención
let turnoActual = null;

// Tiempo de expiración para ausentes (5 minutos = 300.000 ms)
const TIEMPO_EXPIRACION_MS = 300000;

document.addEventListener('DOMContentLoaded', () => {
  // Cargar estado previo persistido si existe
  cargarEstadoPersistido();

  // Escuchar mensajes entrantes desde el canal (del tótem)
  canal.onmessage = (evento) => {
    const data = evento.data;
    if (!data) return;

    if (data.accion === 'NUEVO_TURNO' && data.turno) {
      clasificarTurno(data.turno);
      guardarEstado();
      actualizarTelemetria();
    }
  };

  // Asignar eventos a los botones
  const btnLlamar = document.getElementById('btn-llamar');
  const btnRellamar = document.getElementById('btn-rellamar');
  const btnAusente = document.getElementById('btn-ausente');

  if (btnLlamar) btnLlamar.addEventListener('click', llamarSiguienteTurno);
  if (btnRellamar) btnRellamar.addEventListener('click', rellamarTurnoActual);
  if (btnAusente) btnAusente.addEventListener('click', marcarTurnoAusente);
});

/**
 * Guarda el estado actual de las colas y ausentes en localStorage
 */
function guardarEstado() {
  const estado = {
    colaPrioritaria,
    colaCaja,
    colaTarjetas,
    colaAsesoria,
    // Se guardan los turnos ausentes omitiendo los timeoutId de los temporizadores
    turnosAusentes: turnosAusentes.map(item => item.turno),
    turnoActual
  };
  localStorage.setItem(STORAGE_KEY_OPERADOR, JSON.stringify(estado));
}

/**
 * Recupea el estado previo desde localStorage al iniciar/recargar
 */
function cargarEstadoPersistido() {
  const guardado = localStorage.getItem(STORAGE_KEY_OPERADOR);
  if (!guardado) return;

  try {
    const estado = JSON.parse(guardado);
    colaPrioritaria = estado.colaPrioritaria || [];
    colaCaja = estado.colaCaja || [];
    colaTarjetas = estado.colaTarjetas || [];
    colaAsesoria = estado.colaAsesoria || [];
    turnoActual = estado.turnoActual || null;

    // Restaurar los turnos ausentes recreando los temporizadores de expiración
    if (estado.turnosAusentes && Array.isArray(estado.turnosAusentes)) {
      turnosAusentes = estado.turnosAusentes.map(turno => {
        const timeoutId = setTimeout(() => {
          expirarTurnoAusente(turno.numero);
        }, TIEMPO_EXPIRACION_MS);

        return { turno, timeoutId };
      });
    }

    // Actualizar las vistas con los datos restaurados
    actualizarTelemetria();
    renderizarTurnoActual(turnoActual);
    renderizarListaAusentes();
    habilitarBotonesAccion(Boolean(turnoActual));

  } catch (e) {
    console.error('Error al recuperar estado de localStorage:', e);
  }
}

/**
 * Clasifica el turno recibido según su prefijo o servicio
 */
function clasificarTurno(turno) {
  switch (turno.prefijo) {
    case 'P':
      colaPrioritaria.push(turno);
      break;
    case 'C':
      colaCaja.push(turno);
      break;
    case 'T':
      colaTarjetas.push(turno);
      break;
    case 'A':
      colaAsesoria.push(turno);
      break;
    default:
      console.warn('Prefijo de turno desconocido:', turno.prefijo);
      break;
  }
}

/**
 * Refresca la cantidad de turnos en espera en las 4 tarjetas de telemetría
 */
function actualizarTelemetria() {
  const countPrioritaria = document.getElementById('count-prioritaria');
  const countCaja = document.getElementById('count-caja');
  const countTarjetas = document.getElementById('count-tarjetas');
  const countAsesoria = document.getElementById('count-asesoria');

  if (countPrioritaria) countPrioritaria.textContent = colaPrioritaria.length;
  if (countCaja) countCaja.textContent = colaCaja.length;
  if (countTarjetas) countTarjetas.textContent = colaTarjetas.length;
  if (countAsesoria) countAsesoria.textContent = colaAsesoria.length;
}

/**
 * Atiende el siguiente turno aplicando las reglas de negocio del banco
 */
function llamarSiguienteTurno() {
  const selectCaja = document.getElementById('select-caja');
  const puestoSeleccionado = selectCaja ? selectCaja.value : 'Caja 1';

  let siguienteTurno = null;

  // Regla 1 (Prioridad absoluta)
  if (colaPrioritaria.length > 0) {
    siguienteTurno = colaPrioritaria.shift();
  } else {
    // Regla 2 (Afinidad de puesto)
    if (puestoSeleccionado === 'Caja 1' || puestoSeleccionado === 'Caja 2') {
      siguienteTurno = obtenerTurnoDeCola(colaCaja) 
                    || obtenerTurnoDeCola(colaTarjetas) 
                    || obtenerTurnoDeCola(colaAsesoria);

    } else if (puestoSeleccionado === 'Box 1') {
      siguienteTurno = obtenerTurnoDeCola(colaTarjetas) 
                    || obtenerTurnoDeCola(colaCaja) 
                    || obtenerTurnoDeCola(colaAsesoria);

    } else if (puestoSeleccionado === 'Box 2') {
      siguienteTurno = obtenerTurnoDeCola(colaAsesoria) 
                    || obtenerTurnoDeCola(colaCaja) 
                    || obtenerTurnoDeCola(colaTarjetas);
    }
  }

  if (!siguienteTurno) {
    alert('No hay clientes en espera en ninguna de las colas.');
    return;
  }

  const horaLlamado = new Date().toLocaleTimeString().substring(0, 5);

  turnoActual = {
    ...siguienteTurno,
    caja: puestoSeleccionado,
    horaLlamado: horaLlamado
  };

  // Notificar al BroadcastChannel y guardar estado
  publicarLlamado(turnoActual);
  guardarEstado();

  // Actualizar UI
  renderizarTurnoActual(turnoActual);
  actualizarTelemetria();
  habilitarBotonesAccion(true);
}

/**
 * Re-llama al turno actualmente activo re-enviando el evento a la TV
 */
function rellamarTurnoActual() {
  if (!turnoActual) return;
  publicarLlamado(turnoActual);
}

/**
 * Mueve el turno actual al array de ausentes y le asigna un temporizador
 */
function marcarTurnoAusente() {
  if (!turnoActual) return;

  const turnoParaAusente = { ...turnoActual };

  const timeoutId = setTimeout(() => {
    expirarTurnoAusente(turnoParaAusente.numero);
  }, TIEMPO_EXPIRACION_MS);

  turnosAusentes.push({
    turno: turnoParaAusente,
    timeoutId: timeoutId
  });

  turnoActual = null;
  
  guardarEstado();
  renderizarTurnoActual(null);
  habilitarBotonesAccion(false);
  renderizarListaAusentes();
}

/**
 * Restaura un turno ausente reenviándolo al inicio de su cola correspondiente
 */
function restaurarTurnoAusente(numeroTurno) {
  const indice = turnosAusentes.findIndex(item => item.turno.numero === numeroTurno);
  if (indice === -1) return;

  const { turno, timeoutId } = turnosAusentes[indice];

  clearTimeout(timeoutId);
  turnosAusentes.splice(indice, 1);

  switch (turno.prefijo) {
    case 'P': colaPrioritaria.unshift(turno); break;
    case 'C': colaCaja.unshift(turno); break;
    case 'T': colaTarjetas.unshift(turno); break;
    case 'A': colaAsesoria.unshift(turno); break;
  }

  guardarEstado();
  actualizarTelemetria();
  renderizarListaAusentes();
}

/**
 * Expira automáticamente un turno ausente
 */
function expirarTurnoAusente(numeroTurno) {
  turnosAusentes = turnosAusentes.filter(item => item.turno.numero !== numeroTurno);
  guardarEstado();
  renderizarListaAusentes();
}

/**
 * Publica el evento TURNO_LLAMADO en el BroadcastChannel
 */
function publicarLlamado(turno) {
  canal.postMessage({
    accion: 'TURNO_LLAMADO',
    numero: turno.numero,
    tipo: turno.tipo,
    servicio: turno.servicio,
    caja: turno.caja,
    hora: turno.horaLlamado
  });
}

/**
 * Obtener el primer elemento de una cola
 */
function obtenerTurnoDeCola(cola) {
  return cola.length > 0 ? cola.shift() : null;
}

/**
 * Renderiza el cuadro de turno en atención
 */
function renderizarTurnoActual(turno) {
  const displayNumero = document.getElementById('display-turno-actual');
  const displayServicio = document.getElementById('display-servicio-actual');
  const displayPuesto = document.getElementById('display-puesto-actual');

  if (turno) {
    if (displayNumero) displayNumero.textContent = turno.numero;
    if (displayServicio) displayServicio.textContent = `${turno.servicio} (${turno.horaLlamado} hs)`;
    if (displayPuesto) displayPuesto.textContent = `Puesto: ${turno.caja}`;
  } else {
    if (displayNumero) displayNumero.textContent = '--';
    if (displayServicio) displayServicio.textContent = 'Sin turno asignado';
    if (displayPuesto) displayPuesto.textContent = 'Puesto: -';
  }
}

/**
 * Habilita o deshabilita los botones de re-llamar y marcar ausente
 */
function habilitarBotonesAccion(habilitado) {
  const btnRellamar = document.getElementById('btn-rellamar');
  const btnAusente = document.getElementById('btn-ausente');

  if (btnRellamar) btnRellamar.disabled = !habilitado;
  if (btnAusente) btnAusente.disabled = !habilitado;
}

/**
 * Renderiza la lista de turnos ausentes con botón de restauración
 */
function renderizarListaAusentes() {
  const listaEl = document.getElementById('lista-ausentes');
  if (!listaEl) return;

  listaEl.innerHTML = '';

  if (turnosAusentes.length === 0) {
    listaEl.innerHTML = '<li class="absent-empty">No hay turnos ausentes registrados</li>';
    return;
  }

  turnosAusentes.forEach(({ turno }) => {
    const li = document.createElement('li');
    li.className = 'absent-item';
    li.innerHTML = `
      <div class="absent-info">
        <strong>${turno.numero}</strong> - ${turno.servicio}
      </div>
      <button type="button" class="btn-restore" onclick="restaurarTurnoAusente('${turno.numero}')">
        ↩ Restaurar a cola
      </button>
    `;
    listaEl.appendChild(li);
  });
}