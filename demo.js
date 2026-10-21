document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btn-start-demo');
  if (btnStart) {
    btnStart.addEventListener('click', iniciarSimulacion);
  }
});

/**
 * Guión automático de simulación de 7 pasos
 */
async function iniciarSimulacion() {
  const btnStart = document.getElementById('btn-start-demo');
  if (btnStart) {
    btnStart.disabled = true;
    btnStart.style.opacity = '0.5';
  }

  // Obtener las referencias a los documentos de cada iframe
  const iframeTotem = document.getElementById('frame-totem');
  const iframeOperador = document.getElementById('frame-operador');
  const iframeTv = document.getElementById('frame-tv');

  const docTotem = obtenerDocIframe(iframeTotem);
  const docOperador = obtenerDocIframe(iframeOperador);
  const docTv = obtenerDocIframe(iframeTv);

  if (!docTotem || !docOperador || !docTv) {
    actualizarNarrador("⚠️ Error de seguridad: Si estás abriendo el HTML haciendo doble clic (file://), usá un servidor local (ej. Live Server en VS Code) para permitir el acceso a los iframes.");
    if (btnStart) {
      btnStart.disabled = false;
      btnStart.style.opacity = '1';
    }
    return;
  }

  // Intentar habilitar el audio de la TV automáticamente si existe el botón
  const btnAudioTv = docTv.querySelector('#btn-audio');
  if (btnAudioTv) {
    btnAudioTv.click();
  }

  try {
    // Paso 1: Cliente 1 saca turno de Caja
    actualizarNarrador("Paso 1: Un cliente llega al Tótem y solicita 'Operaciones por Caja'.");
    activarGlow('wrapper-totem');
    await esperar(1000);
    hacerClic(docTotem, '.btn-cashier, [data-servicio="cashier"]');
    await esperar(2500);
    desactivarGlows();

    // Paso 2: Cliente 2 saca turno Prioritario
    actualizarNarrador("Paso 2: Un cliente solicita 'Atención Prioritaria'.");
    activarGlow('wrapper-totem');
    await esperar(1000);
    hacerClic(docTotem, '.btn-priority, [data-servicio="priority"]');
    await esperar(2500);
    desactivarGlows();

    // Paso 3: Cliente 3 saca turno de Tarjetas
    actualizarNarrador("Paso 3: Un tercer cliente solicita 'Tarjetas y Cuentas'.");
    activarGlow('wrapper-totem');
    await esperar(1000);
    hacerClic(docTotem, '.btn-cards, [data-servicio="cards"]');
    await esperar(2500);
    desactivarGlows();

    // Paso 4: Operador en Caja 1 llama (Prioridad absoluta -> Atiende Prioritario P-01)
    actualizarNarrador("Paso 4: Puesto 'Box 2' llama siguiente. El sistema asigna 'Atención Prioritaria' (Regla de prioridad).");
    activarGlow('wrapper-operador');
    seleccionarOpcion(docOperador, '#select-caja', 'Box 2');
    await esperar(1000);
    hacerClic(docOperador, '#btn-llamar');
    activarGlow('wrapper-tv');
    await esperar(3500);
    desactivarGlows();

    // Paso 5: Operador en Box 1 llama (Afinidad Tarjetas -> Atiende T-01)
    actualizarNarrador("Paso 5: El operador del 'Box 1' presiona 'Llamar'. El sistema le asigna 'Tarjetas y Cuentas' por afinidad.");
    activarGlow('wrapper-operador');
    seleccionarOpcion(docOperador, '#select-caja', 'Box 1');
    await esperar(1000);
    hacerClic(docOperador, '#btn-llamar');
    activarGlow('wrapper-tv');
    await esperar(3500);
    desactivarGlows();

    // Paso 6: Operador en Caja 1 llama (Atiende Caja C-01)
    actualizarNarrador("Paso 6: 'Caja 1' llama siguiente y se le asigna el turno de 'Operaciones por Caja' pendiente.");
    activarGlow('wrapper-operador');
    seleccionarOpcion(docOperador, '#select-caja', 'Caja 1');
    await esperar(1000);
    hacerClic(docOperador, '#btn-llamar');
    activarGlow('wrapper-tv');
    await esperar(3500);
    desactivarGlows();

    // Paso 7: Cierre
    actualizarNarrador("Paso 7: Simulación finalizada con éxito. Todas las colas fueron atendidas correctamente.");
  } catch (error) {
    console.error("Error durante la simulación:", error);
    actualizarNarrador("Ocurrió un inconveniente al ejecutar la simulación.");
  } finally {
    if (btnStart) {
      btnStart.disabled = false;
      btnStart.style.opacity = '1';
    }
  }
}

/* === Funciones Auxiliares === */

function obtenerDocIframe(iframe) {
  try {
    return iframe.contentDocument || iframe.contentWindow.document;
  } catch (e) {
    return null;
  }
}

function actualizarNarrador(texto) {
  const el = document.getElementById('narrator-text');
  if (el) el.textContent = texto;
}

function activarGlow(idWrapper) {
  desactivarGlows();
  const wrapper = document.getElementById(idWrapper);
  if (wrapper) wrapper.classList.add('active-glow');
}

function desactivarGlows() {
  document.querySelectorAll('.frame-wrapper').forEach(w => w.classList.remove('active-glow'));
}

function hacerClic(doc, selector) {
  if (!doc) return;
  const el = doc.querySelector(selector);
  if (el) {
    el.click();
  } else {
    console.warn("No se encontró el elemento con selector:", selector);
  }
}

function seleccionarOpcion(doc, selector, valor) {
  if (!doc) return;
  const select = doc.querySelector(selector);
  if (select) {
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  }
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}