/* =========================================================
   LABORATORIO VIRTUAL: NOTACIÓN CIENTÍFICA Y UNIDADES
   Toda la lógica física/matemática vive aquí.
   No se usan librerías externas: solo JavaScript puro.
   ========================================================= */

/* ---------------------------------------------------------
   0. UTILIDADES GENERALES
   --------------------------------------------------------- */

// Redondea un número a N cifras significativas decimales sin acumular errores visuales
function redondear(num, decimales = 6) {
  const factor = Math.pow(10, decimales);
  return Math.round(num * factor) / factor;
}

// Formatea un par {mantissa, exponente} como texto legible: a × 10^n
function formatoCientifico(mantissa, exponente) {
  return `${redondear(mantissa, 4)} × 10^${exponente}`;
}

/* ---------------------------------------------------------
   1. NÚCLEO MATEMÁTICO: NOTACIÓN CIENTÍFICA
   --------------------------------------------------------- */

// Convierte un número decimal a notación científica normalizada (1 ≤ |a| < 10)
function decimalAScientifica(numero) {
  if (numero === 0) return { mantissa: 0, exponente: 0 };

  const exponente = Math.floor(Math.log10(Math.abs(numero)));
  let mantissa = numero / Math.pow(10, exponente);
  let expFinal = exponente;

  // Corrige errores de redondeo del logaritmo (casos límite como 10, 100, 0.1...)
  if (Math.abs(mantissa) >= 10) {
    mantissa /= 10;
    expFinal += 1;
  } else if (Math.abs(mantissa) < 1) {
    mantissa *= 10;
    expFinal -= 1;
  }

  return { mantissa: redondear(mantissa, 6), exponente: expFinal };
}

// Convierte mantisa + exponente de vuelta a número decimal
function scientificaADecimal(mantissa, exponente) {
  return mantissa * Math.pow(10, exponente);
}

// Multiplica o divide dos números en notación científica y normaliza el resultado
function operarCientifica(mA, eA, mB, eB, operador) {
  let mantissaResult, expResult;

  if (operador === "mult") {
    mantissaResult = mA * mB;
    expResult = eA + eB;
  } else {
    if (mB === 0) return null; // división por cero no permitida
    mantissaResult = mA / mB;
    expResult = eA - eB;
  }

  // Normalización: si la mantisa resultante sale del rango [1,10), se reajusta
  const normalizado = decimalAScientifica(mantissaResult * Math.pow(10, expResult));
  return normalizado;
}

/* ---------------------------------------------------------
   2. NÚCLEO MATEMÁTICO: CONVERSIÓN DE UNIDADES
   Cada categoría define factores de conversión respecto
   a la unidad base del SI (m, kg, s, L).
   --------------------------------------------------------- */
const FACTORES_CONVERSION = {
  longitud: {
    base: "m",
    unidades: {
      "nm (nanómetro)": 1e-9,
      "μm (micrómetro)": 1e-6,
      "mm (milímetro)": 1e-3,
      "cm (centímetro)": 1e-2,
      "m (metro)": 1,
      "km (kilómetro)": 1e3,
      "in (pulgada)": 0.0254,
      "ft (pie)": 0.3048,
      "mi (milla)": 1609.344,
    },
  },
  masa: {
    base: "kg",
    unidades: {
      "mg (miligramo)": 1e-6,
      "g (gramo)": 1e-3,
      "kg (kilogramo)": 1,
      "ton (tonelada)": 1000,
      "lb (libra)": 0.45359237,
      "oz (onza)": 0.0283495231,
    },
  },
  tiempo: {
    base: "s",
    unidades: {
      "ms (milisegundo)": 1e-3,
      "s (segundo)": 1,
      "min (minuto)": 60,
      "h (hora)": 3600,
      "día": 86400,
    },
  },
  volumen: {
    base: "L",
    unidades: {
      "mL (mililitro)": 1e-3,
      "L (litro)": 1,
      "m³ (metro cúbico)": 1000,
      "gal (galón US)": 3.785411784,
    },
  },
};

// Convierte un valor entre dos unidades de la misma categoría usando factores respecto a la base
function convertirUnidad(valor, categoria, unidadOrigen, unidadDestino) {
  const factores = FACTORES_CONVERSION[categoria].unidades;
  const valorEnBase = valor * factores[unidadOrigen];
  return valorEnBase / factores[unidadDestino];
}

/* ---------------------------------------------------------
   3. ESTADO DE LA TABLA DE DATOS (historial de la sesión)
   --------------------------------------------------------- */
let contadorFilas = 0;

function agregarFilaTabla(herramienta, entrada, resultado, notacion) {
  contadorFilas++;
  const tbody = document.getElementById("dataTableBody");

  // Elimina el mensaje de "tabla vacía" si existe
  const filaVacia = tbody.querySelector(".empty-row");
  if (filaVacia) filaVacia.remove();

  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${contadorFilas}</td>
    <td>${herramienta}</td>
    <td>${entrada}</td>
    <td>${resultado}</td>
    <td>${notacion}</td>
  `;
  tbody.appendChild(fila);
}

function limpiarTabla() {
  const tbody = document.getElementById("dataTableBody");
  tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Aún no hay datos. Realiza una conversión para comenzar.</td></tr>`;
  contadorFilas = 0;
}

/* ---------------------------------------------------------
   4. MANEJO DE PESTAÑAS (TABS)
   --------------------------------------------------------- */
function inicializarTabs() {
  const botones = document.querySelectorAll(".tab-btn");
  botones.forEach((boton) => {
    boton.addEventListener("click", () => {
      // Desactiva todos los botones y paneles
      document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));

      // Activa el botón y panel seleccionados
      boton.classList.add("active");
      boton.setAttribute("aria-selected", "true");
      document.getElementById(boton.dataset.tab).classList.add("active");
    });
  });
}

/* ---------------------------------------------------------
   5. PANEL 1: DECIMAL <-> NOTACIÓN CIENTÍFICA
   --------------------------------------------------------- */
function inicializarPanelDecimal() {
  const inputDecimal = document.getElementById("inputDecimal");
  const slider = document.getElementById("sliderDecimalExp");
  const btnToScientific = document.getElementById("btnToScientific");
  const resultBox = document.getElementById("resultToScientific");

  // El slider es un control rápido: genera 10^n de ejemplo en el campo decimal
  slider.addEventListener("input", () => {
    const exp = parseInt(slider.value, 10);
    inputDecimal.value = Math.pow(10, exp);
  });

  btnToScientific.addEventListener("click", () => {
    const numero = parseFloat(inputDecimal.value);
    if (isNaN(numero)) {
      resultBox.innerHTML = `<span class="result-placeholder">Ingresa un número válido.</span>`;
      return;
    }

    const { mantissa, exponente } = decimalAScientifica(numero);
    const notacionTexto = formatoCientifico(mantissa, exponente);

    resultBox.innerHTML = `
      <span class="result-value">${numero} = ${notacionTexto}</span>
      <span class="result-steps">Paso 1: se ubica el punto decimal después de la primera cifra significativa.<br>
      Paso 2: el número de lugares que se movió el punto es el exponente (n = ${exponente}).</span>
    `;

    agregarFilaTabla("Decimal → Científica", numero, redondear(numero, 6), notacionTexto);
  });

  // Botón de notación científica -> decimal
  const inputMantissa = document.getElementById("inputMantissa");
  const inputExponent = document.getElementById("inputExponent");
  const btnToDecimal = document.getElementById("btnToDecimal");
  const resultDecimalBox = document.getElementById("resultToDecimal");

  btnToDecimal.addEventListener("click", () => {
    const m = parseFloat(inputMantissa.value);
    const e = parseInt(inputExponent.value, 10);
    if (isNaN(m) || isNaN(e)) {
      resultDecimalBox.innerHTML = `<span class="result-placeholder">Ingresa valores válidos.</span>`;
      return;
    }

    const decimal = scientificaADecimal(m, e);
    const notacionTexto = formatoCientifico(m, e);

    resultDecimalBox.innerHTML = `
      <span class="result-value">${notacionTexto} = ${redondear(decimal, 8)}</span>
      <span class="result-steps">Se multiplicó la mantisa por 10 elevado al exponente indicado.</span>
    `;

    agregarFilaTabla("Científica → Decimal", notacionTexto, redondear(decimal, 8), notacionTexto);
  });
}

/* ---------------------------------------------------------
   6. PANEL 2: OPERACIONES CON NOTACIÓN CIENTÍFICA
   --------------------------------------------------------- */
function inicializarPanelOperaciones() {
  const btnOperar = document.getElementById("btnOperar");
  const resultBox = document.getElementById("resultOperacion");

  btnOperar.addEventListener("click", () => {
    const mA = parseFloat(document.getElementById("opA_mantissa").value);
    const eA = parseInt(document.getElementById("opA_exp").value, 10);
    const mB = parseFloat(document.getElementById("opB_mantissa").value);
    const eB = parseInt(document.getElementById("opB_exp").value, 10);
    const operador = document.getElementById("opOperator").value;

    if ([mA, eA, mB, eB].some((v) => isNaN(v))) {
      resultBox.innerHTML = `<span class="result-placeholder">Verifica que todos los campos tengan números válidos.</span>`;
      return;
    }

    const resultado = operarCientifica(mA, eA, mB, eB, operador);
    if (resultado === null) {
      resultBox.innerHTML = `<span class="result-placeholder">No es posible dividir entre cero.</span>`;
      return;
    }

    const simboloOp = operador === "mult" ? "×" : "÷";
    const entradaTexto = `${formatoCientifico(mA, eA)} ${simboloOp} ${formatoCientifico(mB, eB)}`;
    const notacionTexto = formatoCientifico(resultado.mantissa, resultado.exponente);

    resultBox.innerHTML = `
      <span class="result-value">${entradaTexto} = ${notacionTexto}</span>
      <span class="result-steps">
        ${operador === "mult" ? "Se multiplicaron las mantisas y se sumaron los exponentes" : "Se dividieron las mantisas y se restaron los exponentes"},
        normalizando después el resultado para que la mantisa quede entre 1 y 10.
      </span>
    `;

    agregarFilaTabla("Operación científica", entradaTexto, notacionTexto, notacionTexto);
  });
}

/* ---------------------------------------------------------
   7. PANEL 3: CONVERSOR DE UNIDADES
   --------------------------------------------------------- */
function poblarSelectsUnidades() {
  const categoriaSelect = document.getElementById("unitCategory");
  const fromSelect = document.getElementById("unitFrom");
  const toSelect = document.getElementById("unitTo");

  function renderOpciones() {
    const categoria = categoriaSelect.value;
    const unidades = Object.keys(FACTORES_CONVERSION[categoria].unidades);

    fromSelect.innerHTML = unidades.map((u) => `<option value="${u}">${u}</option>`).join("");
    toSelect.innerHTML = unidades.map((u) => `<option value="${u}">${u}</option>`).join("");

    // Por defecto, selecciona dos unidades distintas para que el resultado no sea trivial
    if (unidades.length > 1) toSelect.value = unidades[unidades.length - 1];
  }

  categoriaSelect.addEventListener("change", renderOpciones);
  renderOpciones(); // inicializa al cargar la página
}

function inicializarPanelUnidades() {
  poblarSelectsUnidades();

  const btnConvertir = document.getElementById("btnConvertirUnidad");
  const resultBox = document.getElementById("resultUnidad");

  btnConvertir.addEventListener("click", () => {
    const categoria = document.getElementById("unitCategory").value;
    const valor = parseFloat(document.getElementById("unitValue").value);
    const origen = document.getElementById("unitFrom").value;
    const destino = document.getElementById("unitTo").value;

    if (isNaN(valor)) {
      resultBox.innerHTML = `<span class="result-placeholder">Ingresa un valor numérico válido.</span>`;
      return;
    }

    const resultado = convertirUnidad(valor, categoria, origen, destino);
    const { mantissa, exponente } = decimalAScientifica(resultado);
    const notacionTexto = formatoCientifico(mantissa, exponente);
    const entradaTexto = `${valor} ${origen} → ${destino}`;

    resultBox.innerHTML = `
      <span class="result-value">${valor} ${origen} = ${redondear(resultado, 6)} ${destino}</span>
      <span class="result-steps">En notación científica: ${notacionTexto}</span>
    `;

    agregarFilaTabla("Conversión de unidades", entradaTexto, redondear(resultado, 6), notacionTexto);
  });
}

/* ---------------------------------------------------------
   8. BOTÓN PARA LIMPIAR LA TABLA DE DATOS
   --------------------------------------------------------- */
function inicializarBotonLimpiar() {
  document.getElementById("btnLimpiarTabla").addEventListener("click", limpiarTabla);
}

/* ---------------------------------------------------------
   9. PUNTO DE ENTRADA: se ejecuta cuando el DOM está listo
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  inicializarTabs();
  inicializarPanelDecimal();
  inicializarPanelOperaciones();
  inicializarPanelUnidades();
  inicializarBotonLimpiar();
  limpiarTabla(); // muestra el mensaje inicial de "tabla vacía"
});
