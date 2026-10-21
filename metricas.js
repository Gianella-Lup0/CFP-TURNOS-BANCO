// Conexión al canal nativo de comunicación
const canal = new BroadcastChannel('canal_turnero');

// Estructura de registro en memoria
let totalEmitidos = 0;
const registroEmitidos = new Map(); // Guardará { numero: timestampEmision }

const datosServicios = {
  P: { nombre: 'Atención Prioritaria', atendidos: 0, tiemposEspera: [] },
  C: { nombre: 'Operaciones por Caja', atendidos: 0, tiemposEspera: [] },
  T: { nombre: 'Tarjetas y Cuentas', atendidos: 0, tiemposEspera: [] },
  A: { nombre: 'Asesoría y Créditos', atendidos: 0, tiemposEspera: [] }
};

document.addEventListener('DOMContentLoaded', () => {
  actualizarReloj();
  setInterval(actualizarReloj, 1000);

  // Escuchar eventos en el canal
  canal.onmessage = (evento) => {
    const data = evento.data;
    if (!data) return;

    // 1. Cuando el Tótem imprime un nuevo turno
    if (data.accion === 'NUEVO_TURNO' && data.turno) {
      totalEmitidos++;
      // Guardar la marca de tiempo exacta de emisión
      registroEmitidos.set(data.turno.numero, Date.now());
      actualizarKPIsGenerales();
    }

    // 2. Cuando el Operador o la TV llaman un turno
    if (data.accion === 'TURNO_LLAMADO' && data.numero) {
      procesarTurnoLlamado(data.numero);
    }
  };
});

/**
 * Procesa el llamado de un turno calculando el tiempo transcurrido desde su emisión
 */
function procesarTurnoLlamado(numeroTurno) {
  const prefijo = numeroTurno.charAt(0);
  if (!datosServicios[prefijo]) return;

  // Evitar duplicar estadísticas si es un re-llamado
  const tiempoEmision = registroEmitidos.get(numeroTurno);
  
  if (tiempoEmision) {
    const tiempoEsperaMs = Date.now() - tiempoEmision;
    const tiempoEsperaMinutos = tiempoEsperaMs / 60000;

    datosServicios[prefijo].atendidos++;
    datosServicios[prefijo].tiemposEspera.push(tiempoEsperaMinutos);

    // Eliminar de emitidos pendientes
    registroEmitidos.delete(numeroTurno);

    // Refrescar paneles
    actualizarKPIsGenerales();
    actualizarGraficaCSS();
    actualizarTablaDetalle();
  }
}

/**
 * Actualiza los contadores globales
 */
function actualizarKPIsGenerales() {
  const elEmitidos = document.getElementById('kpi-emitidos');
  const elAtendidos = document.getElementById('kpi-atendidos');
  const elPromedio = document.getElementById('kpi-promedio');

  let totalAtendidos = 0;
  let todosLosTiempos = [];

  Object.values(datosServicios).forEach(s => {
    totalAtendidos += s.atendidos;
    todosLosTiempos = todosLosTiempos.concat(s.tiemposEspera);
  });

  const promedioGlobal = todosLosTiempos.length > 0
    ? (todosLosTiempos.reduce((a, b) => a + b, 0) / todosLosTiempos.length).toFixed(1)
    : '0.0';

  if (elEmitidos) elEmitidos.textContent = totalEmitidos;
  if (elAtendidos) elAtendidos.textContent = totalAtendidos;
  if (elPromedio) elPromedio.textContent = `${promedioGlobal} min`;
}

/**
 * Actualiza dinámicamente las alturas (%) de la gráfica de barras en CSS puro
 */
function actualizarGraficaCSS() {
  const atP = datosServicios.P.atendidos;
  const atC = datosServicios.C.atendidos;
  const atT = datosServicios.T.atendidos;
  const atA = datosServicios.A.atendidos;

  const maxAtendidos = Math.max(atP, atC, atT, atA, 1); // Evitar división por cero

  // Actualizar valores en texto
  document.getElementById('val-priority').textContent = atP;
  document.getElementById('val-cashier').textContent = atC;
  document.getElementById('val-cards').textContent = atT;
  document.getElementById('val-advisory').textContent = atA;

  // Calcular porcentaje relativo de altura para cada barra
  document.getElementById('bar-priority').style.height = `${(atP / maxAtendidos) * 100}%`;
  document.getElementById('bar-cashier').style.height = `${(atC / maxAtendidos) * 100}%`;
  document.getElementById('bar-cards').style.height = `${(atT / maxAtendidos) * 100}%`;
  document.getElementById('bar-advisory').style.height = `${(atA / maxAtendidos) * 100}%`;
}

/**
 * Actualiza los valores de la tabla de desglose
 */
function actualizarTablaDetalle() {
  const mapaIDs = { P: 'priority', C: 'cashier', T: 'cards', A: 'advisory' };

  Object.keys(datosServicios).forEach(prefijo => {
    const data = datosServicios[prefijo];
    const key = mapaIDs[prefijo];

    const elCount = document.getElementById(`tbl-count-${key}`);
    const elAvg = document.getElementById(`tbl-avg-${key}`);

    const promedio = data.tiemposEspera.length > 0
      ? (data.tiemposEspera.reduce((a, b) => a + b, 0) / data.tiemposEspera.length).toFixed(1)
      : '0.0';

    if (elCount) elCount.textContent = data.atendidos;
    if (elAvg) elAvg.textContent = `${promedio} min`;
  });
}

/**
 * Reloj en vivo
 */
function actualizarReloj() {
  const clockEl = document.getElementById('metricas-clock');
  if (clockEl) {
    const ahora = new Date();
    clockEl.textContent = ahora.toLocaleTimeString('es-AR');
  }
}