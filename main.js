// ==========================================
// SISTEMA DE LOGIN Y SEGURIDAD
// ==========================================

const PASSWORD_CORRECTA = "accionistas$";
let isPasswordVisible = false;

// Verificar si ya hay sesión activa al cargar la página
window.addEventListener("DOMContentLoaded", function () {
  const sesionActiva = sessionStorage.getItem("dashboardAutenticado");
  if (sesionActiva === "true") {
    mostrarDashboard();
  }

  // Permitir Enter para login
  document
    .getElementById("passwordInput")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        verificarPassword();
      }
    });
});

function verificarPassword() {
  const input = document.getElementById("passwordInput");
  const errorMsg = document.getElementById("errorMessage");
  const password = input.value;

  if (password === PASSWORD_CORRECTA) {
    // Login exitoso
    sessionStorage.setItem("dashboardAutenticado", "true");
    errorMsg.classList.remove("show");
    input.classList.remove("error");

    // Animación de éxito
    input.style.borderColor = "#10b981";
    setTimeout(() => {
      mostrarDashboard();
    }, 300);
  } else {
    // Login fallido
    errorMsg.classList.add("show");
    input.classList.add("error");
    input.value = "";
    input.focus();

    // Remover error después de 3 segundos
    setTimeout(() => {
      errorMsg.classList.remove("show");
      input.classList.remove("error");
    }, 3000);
  }
}

function mostrarDashboard() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboardApp").style.display = "block";
  // Inicializar el dashboard
  inicializarFechas();
  cargarDatos();
}

function cerrarSesion() {
  if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
    sessionStorage.removeItem("dashboardAutenticado");
    document.getElementById("dashboardApp").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("passwordInput").value = "";

    // Cerrar menú si está abierto
    const menuPanel = document.querySelector(".menu-panel");
    const menuOverlay = document.querySelector(".menu-overlay");
    const menuHamburger = document.querySelector(".menu-hamburger");
    menuPanel.classList.remove("active");
    menuOverlay.classList.remove("active");
    menuHamburger.classList.remove("active");
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById("passwordInput");
  const icon = document.getElementById("toggleIcon");
  const text = document.getElementById("toggleText");

  isPasswordVisible = !isPasswordVisible;

  if (isPasswordVisible) {
    input.type = "text";
    icon.textContent = "🙈";
    text.textContent = "Ocultar contraseña";
  } else {
    input.type = "password";
    icon.textContent = "👁️";
    text.textContent = "Mostrar contraseña";
  }
}

// ==========================================
// VARIABLES GLOBALES DEL DASHBOARD
// ==========================================

let ventasData = [];
let clientesData = [];
let anfitrionesData = [];
let clientesMap = {};
let anfitrionesMap = {};
let todasLasTransacciones = [];
let filtroTransaccionActual = "todas";

// ==========================================
// FUNCIONES DEL DASHBOARD
// ==========================================

function inicializarFechas() {
  const hoy = new Date();
  // Establecer SOLO la fecha de hoy en ambos campos
  document.getElementById("fechaHasta").valueAsDate = hoy;
  document.getElementById("fechaDesde").valueAsDate = hoy;
  }

function cambiarPeriodoRapido() {
  const periodo = document.getElementById("filterPeriodo").value;
  if (!periodo) return;

  const hoy = new Date();
  const fechaHasta = document.getElementById("fechaHasta");
  const fechaDesde = document.getElementById("fechaDesde");

  fechaHasta.valueAsDate = hoy;

  switch (periodo) {
    case "hoy":
      fechaDesde.valueAsDate = hoy;
      break;
    case "7dias":
      const hace7 = new Date();
      hace7.setDate(hace7.getDate() - 7);
      fechaDesde.valueAsDate = hace7;
      break;
    case "30dias":
      const hace30 = new Date();
      hace30.setDate(hace30.getDate() - 30);
      fechaDesde.valueAsDate = hace30;
      break;
    case "mes":
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fechaDesde.valueAsDate = inicioMes;
      break;
    case "year":
      const inicioAno = new Date(hoy.getFullYear(), 0, 1);
      fechaDesde.valueAsDate = inicioAno;
      break;
    case "all":
      fechaDesde.value = "";
      fechaHasta.value = "";
      break;
  }

  aplicarFiltros();
}

async function cargarDatos() {
  try {
    document.getElementById("loading").style.display = "block";
    document.getElementById("content").style.display = "none";

    console.log("🔄 Cargando datos desde Airtable...");

    const [ventas, clientes, anfitriones] = await Promise.all([
      fetchFromProxy("tblC7aADITb6A6iYP"), // Ventas (Registro de Ventas)
      fetchFromProxy("tblfRI4vdXspaNNlD"), // Clientes
      fetchFromProxy("tblrtLcB3dUASCfnL"), // Anfitriones (tabla correcta)
    ]);

    ventasData = ventas;
    clientesData = clientes;
    anfitrionesData = anfitriones;

    clientesMap = {};
    clientesData.forEach((c) => {
      clientesMap[c.id] = c.fields;
    });

    anfitrionesMap = {};
    anfitrionesData.forEach((a) => {
      anfitrionesMap[a.id] = a.fields;
    });

    console.log("✅ Ventas cargadas:", ventasData.length);
    console.log("✅ Clientes cargados:", clientesData.length);
    console.log("✅ Anfitriones cargados:", anfitrionesData.length);

    // Debug: Ver algunos anfitriones
    if (anfitrionesData.length > 0) {
      console.log("📋 Ejemplo de anfitrión:", anfitrionesData[0]);
      console.log("📋 Campos:", Object.keys(anfitrionesData[0].fields));
    }

    cargarAnfitrionesEnFiltro();
    aplicarFiltros();

    document.getElementById("loading").style.display = "none";
    document.getElementById("content").style.display = "block";

    const now = new Date();
    document.getElementById(
      "lastUpdate"
    ).textContent = `Última actualización: ${now.toLocaleTimeString("es-CL")}`;
    document.getElementById(
      "refreshTime"
    ).textContent = `Actualizado: ${now.toLocaleString("es-CL")}`;
  } catch (error) {
    console.error("❌ Error al cargar datos:", error);
    document.getElementById("loading").innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <p>Error al cargar datos: ${error.message}</p>
        <button onclick="cargarDatos()" style="margin-top: 20px; padding: 10px 20px; background: white; border: none; border-radius: 10px; cursor: pointer;">Reintentar</button>
      </div>
    `;
  }
}

async function fetchFromProxy(tableId) {
  try {
    const response = await fetch(
      `/api/airtable?action=getRecords&tableId=${tableId}`
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error(`❌ Error fetching ${tableId}:`, error);
    throw error;
  }
}

function cargarAnfitrionesEnFiltro() {
  const select = document.getElementById("filterAnfitrion");
  select.innerHTML = '<option value="">Todos los anfitriones</option>';

  console.log("📋 Cargando anfitriones en filtro...");
  console.log("Total anfitriones:", anfitrionesData.length);

  anfitrionesData.forEach((anfitrion, index) => {
    const option = document.createElement("option");
    option.value = anfitrion.id;

    // El campo en Airtable se llama "Anfitrión" según la imagen
    let nombre =
      anfitrion.fields["Anfitrión"] ||
      anfitrion.fields.Nombre ||
      anfitrion.fields.Name;

    // Si es array, tomar el primer elemento
    if (Array.isArray(nombre)) {
      nombre = nombre[0];
    }

    // Convertir a string y limpiar
    nombre = String(nombre || "").trim();

    // Si no hay nombre, usar un identificador
    if (!nombre || nombre === "") {
      nombre = `Anfitrión ${index + 1}`;
      console.warn(`⚠️ Anfitrión sin nombre:`, anfitrion.fields);
    }

    option.textContent = nombre;
    select.appendChild(option);

    if (index < 5) {
      console.log(`✅ Anfitrión ${index + 1}: ${nombre} (ID: ${anfitrion.id})`);
    }
  });

  console.log("✅ Total anfitriones cargados:", anfitrionesData.length);
}

function aplicarFiltros() {
  const fechaDesde = document.getElementById("fechaDesde").value;
  const fechaHasta = document.getElementById("fechaHasta").value;
  const anfitrionId = document.getElementById("filterAnfitrion").value;

  let ventasFiltradas = [...ventasData];

  if (fechaDesde || fechaHasta) {
    ventasFiltradas = ventasFiltradas.filter((venta) => {
      const fechaVenta = venta.fields["Fecha de compra"];
      if (!fechaVenta) return false;

      const fecha = new Date(fechaVenta);

      if (fechaDesde && fechaHasta) {
        return (
          fecha >= new Date(fechaDesde) &&
          fecha <= new Date(fechaHasta + "T23:59:59")
        );
      } else if (fechaDesde) {
        return fecha >= new Date(fechaDesde);
      } else if (fechaHasta) {
        return fecha <= new Date(fechaHasta + "T23:59:59");
      }
      return true;
    });
  }

  if (anfitrionId) {
    ventasFiltradas = ventasFiltradas.filter((venta) => {
      const anfitriones = venta.fields["Anfitrión"] || [];
      return anfitriones.includes(anfitrionId);
    });
  }

  console.log(
    `🔍 Ventas filtradas: ${ventasFiltradas.length} de ${ventasData.length}`
  );
  calcularEstadisticas(ventasFiltradas);
}

function calcularEstadisticas(ventas) {
  const ventasReales = ventas.filter(
    (v) => !v.fields["Devolución"] || v.fields["Devolución"].length === 0
  );
  const devoluciones = ventas.filter(
    (v) => v.fields["Devolución"] && v.fields["Devolución"].length > 0
  );

  const totalVentas = ventasReales.reduce((sum, v) => {
    const total =
      v.fields["Total Neto Numerico"] || v.fields["Total de venta"] || 0;
    return sum + total;
  }, 0);

  const numVentas = ventasReales.length;
  const promedioVenta = numVentas > 0 ? totalVentas / numVentas : 0;
  const tasaDevolucion =
    ventas.length > 0 ? (devoluciones.length / ventas.length) * 100 : 0;

  // Calcular clientes únicos
  const clientesUnicos = new Set();
  ventas.forEach((v) => {
    const clienteIds = v.fields["Cliente"] || [];
    clienteIds.forEach((id) => clientesUnicos.add(id));
  });

  // Calcular productos vendidos
  let totalProductos = 0;
  ventasReales.forEach((venta) => {
    Object.keys(venta.fields).forEach((campo) => {
      if (campo.startsWith("Cantidad real de ventas")) {
        totalProductos += parseInt(venta.fields[campo]) || 0;
      }
    });
  });

  // Actualizar KPIs principales
  document.getElementById("kpiTotalVentas").textContent = `$${Math.round(
    totalVentas
  ).toLocaleString("es-CL")}`;
  document.getElementById("kpiPromedioVenta").textContent = `$${Math.round(
    promedioVenta
  ).toLocaleString("es-CL")}`;
  document.getElementById("kpiNumVentas").textContent = ventas.length;
  document.getElementById(
    "kpiTasaDevolucion"
  ).textContent = `${tasaDevolucion.toFixed(1)}%`;

  // Actualizar KPIs secundarios
  document.getElementById("kpiTotalClientes").textContent = clientesUnicos.size;
  document.getElementById("kpiProductosVendidos").textContent = totalProductos;
  document.getElementById("kpiTicketPromedio").textContent = `$${Math.round(
    promedioVenta
  ).toLocaleString("es-CL")}`;

  // Actualizar dashboard
  mostrarGraficoVentasDias(ventasReales);
  mostrarTopAnfitriones(ventasReales);
  mostrarProductosDestacados(ventasReales);
  mostrarActividadReciente(ventas);
  mostrarTopProductos(ventasReales);
  mostrarGraficoProductos(ventasReales);
  mostrarTopClientes(ventasReales);
  mostrarClasificacionClientes(ventasReales);

  todasLasTransacciones = ventas.slice(0, 50);
  filtrarTransacciones(filtroTransaccionActual);
}

function mostrarTopAnfitriones(ventas) {
  const anfitrionesStats = {};

  ventas.forEach((venta) => {
    const anfitrionesIds = venta.fields["Anfitrión"] || [];
    const total =
      venta.fields["Total Neto Numerico"] ||
      venta.fields["Total de venta"] ||
      0;

    anfitrionesIds.forEach((id) => {
      if (!anfitrionesStats[id]) {
        anfitrionesStats[id] = { total: 0, cantidad: 0, id: id };
      }
      anfitrionesStats[id].total += total;
      anfitrionesStats[id].cantidad += 1;
    });
  });

  const ranking = Object.values(anfitrionesStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const container = document.getElementById("rankingAnfitriones");
  if (ranking.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay datos</p></div>';
    return;
  }

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  container.innerHTML = ranking
    .map((anf, index) => {
      const anfitrionData = anfitrionesMap[anf.id];

      // Intentar diferentes campos posibles para el nombre
      let nombre =
        anfitrionData?.Nombre ||
        anfitrionData?.Name ||
        anfitrionData?.["Anfitrión"] ||
        anfitrionData?.["Nombre completo"] ||
        "Anfitrión";
        if (Array.isArray(nombre)) {
        nombre = nombre[0];
      }

      return `
      <div class="ranking-item" onclick="abrirPerfilAnfitrion('${anf.id}')">
      <div class="ranking-name">
          <span class="ranking-medal">${medals[index]}</span>
          <span>${nombre}</span>
        </div>
        <div class="ranking-value">$${Math.round(anf.total).toLocaleString(
             "es-CL"
        )}</div>
      </div>
    `;
    })
    .join("");
}

function mostrarTopProductos(ventas) {
  const productosCount = {};

  ventas.forEach((venta) => {
    Object.keys(venta.fields).forEach((campo) => {
      if (campo.startsWith("Cantidad real de ventas")) {
        const cantidad = parseInt(venta.fields[campo]) || 0;

        if (cantidad > 0) {
          const nombreProducto = campo
            .replace("Cantidad real de ventas ", "")
            .trim();
          productosCount[nombreProducto] =
            (productosCount[nombreProducto] || 0) + cantidad;
        }
      }
    });
  });

  const ranking = Object.entries(productosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const container = document.getElementById("topProductos");
  if (ranking.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay productos registrados</p></div>';
    return;
  }

  const maxCantidad = ranking[0][1];
  container.innerHTML = ranking
    .map(([producto, cantidad]) => {
      const porcentaje = (cantidad / maxCantidad) * 100;
      return `
      <div class="product-bar">
        <div class="product-name">
          <span>${producto}</span>
          <span style="color: #10b981;">${cantidad} unid.</span>
        </div>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${porcentaje}%"></div>
        </div>
      </div>
    `;
    })
    .join("");
}

function mostrarGraficoProductos(ventas) {
  const productosCount = {};
  const productosPorFecha = {};

  ventas.forEach((venta) => {
    const fechaVenta = venta.fields["Fecha de compra"];

    Object.keys(venta.fields).forEach((campo) => {
      if (campo.startsWith("Cantidad real de ventas")) {
        const cantidad = parseInt(venta.fields[campo]) || 0;

        if (cantidad > 0) {
          const nombreProducto = campo
            .replace("Cantidad real de ventas ", "")
            .trim();
          productosCount[nombreProducto] =
            (productosCount[nombreProducto] || 0) + cantidad;

          if (fechaVenta) {
            if (!productosPorFecha[nombreProducto]) {
              productosPorFecha[nombreProducto] = [];
            }
            productosPorFecha[nombreProducto].push(new Date(fechaVenta));
          }
        }
      }
    });
  });

  const productosArray = Object.entries(productosCount).sort(
    (a, b) => b[1] - a[1]
  );

  if (productosArray.length === 0) {
    document.getElementById("graficoProductos").innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay datos</p></div>';
    document.getElementById("notaInteligente").innerHTML = "";
    return;
  }

  const productoMasVendido = productosArray[0];
  const productoMenosVendido = productosArray[productosArray.length - 1];

  let frecuenciaTexto = "";
  if (
    productosPorFecha[productoMasVendido[0]] &&
    productosPorFecha[productoMasVendido[0]].length > 1
  ) {
    const fechas = productosPorFecha[productoMasVendido[0]].sort(
      (a, b) => a - b
    );
    let sumaIntervalos = 0;
    for (let i = 1; i < fechas.length; i++) {
      const dias = (fechas[i] - fechas[i - 1]) / (1000 * 60 * 60 * 24);
      sumaIntervalos += dias;
    }
    const promedioDias = Math.round(sumaIntervalos / (fechas.length - 1));

    if (promedioDias < 1) {
      frecuenciaTexto = "varias veces al día";
    } else if (promedioDias === 1) {
      frecuenciaTexto = "diariamente";
    } else if (promedioDias <= 3) {
      frecuenciaTexto = `cada ${promedioDias} días`;
    } else if (promedioDias <= 7) {
      frecuenciaTexto = "semanalmente";
    } else if (promedioDias <= 14) {
      frecuenciaTexto = "cada 2 semanas";
    } else {
      frecuenciaTexto = `cada ${Math.round(promedioDias / 7)} semanas`;
    }
  } else {
    frecuenciaTexto = "ocasionalmente";
  }

  const fechaDesde = document.getElementById("fechaDesde").value;
  const fechaHasta = document.getElementById("fechaHasta").value;
  let periodoTexto = "";

  if (fechaDesde && fechaHasta) {
    const desde = new Date(fechaDesde).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    });
    const hasta = new Date(fechaHasta).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    });
    periodoTexto = `del ${desde} al ${hasta}`;
  } else if (fechaDesde) {
    const desde = new Date(fechaDesde).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    periodoTexto = `desde el ${desde}`;
  } else if (fechaHasta) {
    const hasta = new Date(fechaHasta).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    periodoTexto = `hasta el ${hasta}`;
  } else {
    periodoTexto = "en el período seleccionado";
  }

  const notaHTML = `
    <div class="nota-inteligente">
      <div class="nota-icon">💡</div>
      <div class="nota-content">
        <div class="nota-title">Análisis Inteligente</div>
        <div class="nota-text">
          <strong style="color: #10b981;">${
            productoMasVendido[0]
          }</strong> es el producto más vendido 
          con <strong>${
            productoMasVendido[1]
          } unidades</strong> ${periodoTexto}. 
          Se vende aproximadamente <strong>${frecuenciaTexto}</strong>. 
          ${
            productosArray.length > 1
              ? `Por otro lado, <strong style="color: #ef4444;">${
                  productoMenosVendido[0]
                }</strong> 
          tiene el menor volumen con ${productoMenosVendido[1]} unidad${
                  productoMenosVendido[1] > 1 ? "es" : ""
                }.`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  document.getElementById("notaInteligente").innerHTML = notaHTML;

  const canvas = document.getElementById("chartCanvas");
  const ctx = canvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  const size = 280;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  ctx.scale(dpr, dpr);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 90;

  const colores = [
    "#10b981",
    "#06b6d4",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#059669",
    "#0891b2",
    "#7c3aed",
    "#db2777",
    "#d97706",
    "#34d399",
    "#22d3ee",
    "#a78bfa",
    "#f472b6",
    "#fbbf24",
    "#6ee7b7",
    "#67e8f9",
    "#c4b5fd",
    "#f9a8d4",
    "#fcd34d",
    "#14b8a6",
    "#0284c7",
    "#6366f1",
    "#e11d48",
    "#ea580c",
    "#2dd4bf",
    "#38bdf8",
    "#818cf8",
    "#fb7185",
    "#fb923c",
    "#5eead4",
    "#7dd3fc",
    "#a5b4fc",
    "#fda4af",
    "#fdba74",
    "#99f6e4",
    "#bae6fd",
    "#c7d2fe",
    "#fecdd3",
    "#fed7aa",
  ];

  const total = productosArray.reduce((sum, [_, count]) => sum + count, 0);
  let currentAngle = -Math.PI / 2;

  productosArray.forEach(([nombre, cantidad], index) => {
    const sliceAngle = (cantidad / total) * 2 * Math.PI;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colores[index % colores.length];
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    currentAngle += sliceAngle;
  });

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
  ctx.fillStyle = "white";
  ctx.fill();

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 20px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(total, centerX, centerY - 8);
  ctx.font = "12px -apple-system, sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("unidades", centerX, centerY + 10);

  const leyendaHTML = productosArray
    .slice(0, 8)
    .map(([nombre, cantidad], index) => {
      const porcentaje = ((cantidad / total) * 100).toFixed(1);
      return `
      <div class="leyenda-item">
        <div class="leyenda-color" style="background: ${
          colores[index % colores.length]
        }"></div>
        <div class="leyenda-info">
          <div class="leyenda-nombre">${nombre}</div>
          <div class="leyenda-valor">${cantidad} unid. (${porcentaje}%)</div>
        </div>
      </div>
    `;
    })
    .join("");

  document.getElementById("leyendaProductos").innerHTML = leyendaHTML;
}

function mostrarTopClientes(ventas) {
  const clientesStats = {};

  ventas.forEach((venta) => {
    const nombreCliente = venta.fields["Nombre"] || "Cliente desconocido";
    const total =
      venta.fields["Total Neto Numerico"] ||
      venta.fields["Total de venta"] ||
      0;

    if (!clientesStats[nombreCliente]) {
      clientesStats[nombreCliente] = {
        total: 0,
        cantidad: 0,
        nombre: nombreCliente,
      };
    }
    clientesStats[nombreCliente].total += total;
    clientesStats[nombreCliente].cantidad += 1;
  });

  const ranking = Object.values(clientesStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const container = document.getElementById("topClientes");
  if (ranking.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay datos</p></div>';
    return;
  }

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  container.innerHTML = ranking
    .map((cli, index) => {
      return `
      <div class="ranking-item">
        <div class="ranking-name">
          <span class="ranking-medal">${medals[index]}</span>
          <span>${cli.nombre}</span>
        </div>
        <div class="ranking-value">${Math.round(cli.total).toLocaleString(
          "es-CL"
        )}</div>
      </div>
    `;
    })
    .join("");
}

function mostrarClasificacionClientes(ventas) {
  const clientesEnVentas = new Set();
  ventas.forEach((venta) => {
    const clienteIds = venta.fields["Cliente"] || [];
    clienteIds.forEach((id) => clientesEnVentas.add(id));
  });

  const clasificaciones = {
    premium: [],
    gold: [],
    frecuente: [],
    normal: [],
  };

  clientesEnVentas.forEach((clienteId) => {
    const clienteData = clientesMap[clienteId];
    if (!clienteData) return;

    const nombre = clienteData.Nombre || clienteData.Name || "Sin nombre";
    const cantidadUnidades =
      clienteData["Cantidad de unidades General x Cliente"] || 0;

    if (cantidadUnidades === 0) {
      clasificaciones.normal.push(nombre);
    } else if (cantidadUnidades <= 3) {
      clasificaciones.frecuente.push(nombre);
    } else if (cantidadUnidades <= 6) {
      clasificaciones.gold.push(nombre);
    } else {
      clasificaciones.premium.push(nombre);
    }
  });

  const container = document.getElementById("clasificacionClientes");

  const resumenHTML = `
    <div class="clasificacion-grid">
      <div class="clasificacion-card">
        <div class="clasificacion-icon">💎</div>
        <div class="clasificacion-count">${clasificaciones.premium.length}</div>
        <div class="clasificacion-label">Premium</div>
      </div>
      <div class="clasificacion-card">
        <div class="clasificacion-icon">👑</div>
        <div class="clasificacion-count">${clasificaciones.gold.length}</div>
        <div class="clasificacion-label">Gold</div>
      </div>
      <div class="clasificacion-card">
        <div class="clasificacion-icon">⭐</div>
        <div class="clasificacion-count">${clasificaciones.frecuente.length}</div>
        <div class="clasificacion-label">Frecuente</div>
      </div>
      <div class="clasificacion-card">
        <div class="clasificacion-icon">👤</div>
        <div class="clasificacion-count">${clasificaciones.normal.length}</div>
        <div class="clasificacion-label">Normal</div>
      </div>
    </div>
  `;

  const todosClientes = [
    ...clasificaciones.premium.map((n) => ({
      nombre: n,
      tipo: "premium",
      label: "Premium",
      icon: "💎",
    })),
    ...clasificaciones.gold.map((n) => ({
      nombre: n,
      tipo: "gold",
      label: "Gold",
      icon: "👑",
    })),
    ...clasificaciones.frecuente.map((n) => ({
      nombre: n,
      tipo: "frecuente",
      label: "Frecuente",
      icon: "⭐",
    })),
    ...clasificaciones.normal
      .slice(0, 10)
      .map((n) => ({ nombre: n, tipo: "normal", label: "Normal", icon: "👤" })),
  ];

  const listaHTML =
    todosClientes.length > 0
      ? `
    <div class="clasificacion-list">
      ${todosClientes
        .map(
          (cliente) => `
        <div class="clasificacion-item">
          <span class="clasificacion-nombre">
            <span style="margin-right: 8px;">${cliente.icon}</span>
            ${cliente.nombre}
          </span>
          <span class="clasificacion-badge badge-${cliente.tipo}">${cliente.label}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `
      : '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay clientes</p></div>';

  container.innerHTML = resumenHTML + listaHTML;
}

function mostrarUltimasTransacciones(ventas) {
  const container = document.getElementById("ultimasTransacciones");
  if (ventas.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay transacciones</p></div>';
    return;
  }

  container.innerHTML = ventas
    .map((venta) => {
      const nombreCliente = venta.fields["Nombre"] || "Sin cliente";
      const total =
        venta.fields["Total Neto Numerico"] ||
        venta.fields["Total de venta"] ||
        0;
      const items = venta.fields["Items"] || "Sin items";

      let fechaHoraTexto = "Sin fecha";
      if (venta.fields["Fecha de compra"]) {
        const fechaCompleta = new Date(venta.fields["Fecha de compra"]);
        const fecha = fechaCompleta.toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const hora = fechaCompleta.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        fechaHoraTexto = `${fecha} - ${hora}`;
      }

      const esDevolucion =
        venta.fields["Devolución"] && venta.fields["Devolución"].length > 0;

      let autorizadoPor = "";
      if (esDevolucion && venta.fields["Box Observaciones"]) {
        autorizadoPor = `<div style="margin-top: 8px; padding: 8px; background: #fff3cd; border-radius: 6px; font-size: 11px; color: #856404;">
        <strong>✓ Autorizado por:</strong> ${venta.fields["Box Observaciones"]}
      </div>`;
      }

      return `
      <div class="transaction-item">
        <div class="transaction-header">
          <span>${nombreCliente}</span>
          <span class="badge ${
            esDevolucion ? "badge-devolucion" : "badge-venta"
          }">
            ${esDevolucion ? "Devolución" : "Venta"}
          </span>
        </div>
        <div class="transaction-details">
          <div style="margin-bottom: 3px;">📦 ${items}</div>
          <div style="display: flex; justify-content: space-between;">
            <span>📅 ${fechaHoraTexto}</span>
            <span style="font-weight: 600; color: #10b981;">${Math.round(
              total
            ).toLocaleString("es-CL")}</span>
          </div>
          ${autorizadoPor}
        </div>
      </div>
    `;
    })
    .join("");
}

function filtrarTransacciones(tipo) {
  filtroTransaccionActual = tipo;

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.filter === tipo) {
      btn.classList.add("active");
    }
  });

  let transaccionesFiltradas = [...todasLasTransacciones];

  if (tipo === "ventas") {
    transaccionesFiltradas = todasLasTransacciones.filter(
      (v) => !v.fields["Devolución"] || v.fields["Devolución"].length === 0
    );
  } else if (tipo === "devoluciones") {
    transaccionesFiltradas = todasLasTransacciones.filter(
      (v) => v.fields["Devolución"] && v.fields["Devolución"].length > 0
    );
  }

  mostrarUltimasTransacciones(transaccionesFiltradas.slice(0, 10));
}

// ==========================================
// FUNCIONES DEL MENÚ HAMBURGUESA
// ==========================================

function toggleMenu() {
  const menuPanel = document.querySelector(".menu-panel");
  const menuOverlay = document.querySelector(".menu-overlay");
  const menuHamburger = document.querySelector(".menu-hamburger");

  menuPanel.classList.toggle("active");
  menuOverlay.classList.toggle("active");
  menuHamburger.classList.toggle("active");
}

function cambiarSeccion(seccion) {
  document.querySelectorAll(".menu-option").forEach((btn) => {
    btn.classList.remove("active");
  });

  const botonActivo = document.querySelector(
    `.menu-option[data-section="${seccion}"]`
  );
  if (botonActivo) {
    botonActivo.classList.add("active");
  }

  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });

  const seccionActiva = document.getElementById(`section-${seccion}`);
  if (seccionActiva) {
    seccionActiva.classList.add("active");
  }

  toggleMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================
// BUSCADOR GLOBAL
// ==========================================

function buscarGlobal() {
  const query = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const clearBtn = document.getElementById("clearSearch");
  const resultsContainer = document.getElementById("searchResults");

  console.log("🔍 Buscando:", query);
  console.log(
    "📊 Datos disponibles - Ventas:",
    ventasData.length,
    "Clientes:",
    clientesData.length
  );

  // Mostrar/ocultar botón de limpiar
  if (query.length > 0) {
    clearBtn.classList.add("show");
  } else {
    clearBtn.classList.remove("show");
    resultsContainer.innerHTML = "";
    return;
  }

  // Buscar en todas las categorías
  const resultados = {
    clientes: buscarClientes(query),
    productos: buscarProductos(query),
    anfitriones: buscarAnfitriones(query),
  };

  console.log("📋 Resultados encontrados:", resultados);

  mostrarResultadosBusqueda(resultados, query);
}

function buscarClientes(query) {
  const resultados = [];
  const clientesVistos = new Set();

  console.log("🔍 Buscando en ventas...");

  ventasData.forEach((venta) => {
    // El campo Nombre puede ser un array o un string
    let nombreCliente = venta.fields["Nombre"];

    // Si es array, tomar el primer elemento
    if (Array.isArray(nombreCliente)) {
      nombreCliente = nombreCliente[0] || "";
    }

    // Asegurar que sea string
    nombreCliente = String(nombreCliente || "").toLowerCase();

    if (
      nombreCliente.includes(query) &&
      nombreCliente &&
      !clientesVistos.has(nombreCliente)
    ) {
      clientesVistos.add(nombreCliente);

      const nombreOriginal = Array.isArray(venta.fields["Nombre"])
        ? venta.fields["Nombre"][0]
        : venta.fields["Nombre"];

      const clienteId = venta.fields["Cliente"]
        ? venta.fields["Cliente"][0]
        : null;
      const clienteData = clienteId ? clientesMap[clienteId] : null;
      const totalCompras = calcularTotalCliente(nombreOriginal);
      const numCompras = contarComprasCliente(nombreOriginal);

      resultados.push({
        nombre: nombreOriginal,
        id: clienteId,
        tipo: "cliente",
        totalCompras: totalCompras,
        numCompras: numCompras,
        data: clienteData,
      });
    }
  });

  console.log("✅ Clientes encontrados:", resultados.length);
  return resultados.slice(0, 5);
}

function buscarProductos(query) {
  const resultados = [];
  const productosEncontrados = new Set();

  ventasData.forEach((venta) => {
    Object.keys(venta.fields).forEach((campo) => {
      if (campo.startsWith("Cantidad real de ventas")) {
        const nombreProducto = campo
          .replace("Cantidad real de ventas ", "")
          .trim();

        if (
          nombreProducto.toLowerCase().includes(query) &&
          !productosEncontrados.has(nombreProducto)
        ) {
          productosEncontrados.add(nombreProducto);

          const totalVendido = calcularTotalProducto(nombreProducto);
          resultados.push({
            nombre: nombreProducto,
            tipo: "producto",
            totalVendido: totalVendido,
          });
        }
      }
    });
  });

  return resultados.slice(0, 5);
}

function buscarAnfitriones(query) {
  const resultados = [];

  anfitrionesData.forEach((anfitrion) => {
    // El campo se llama "Anfitrión" en la tabla
    let nombre =
      anfitrion.fields["Anfitrión"] ||
      anfitrion.fields.Nombre ||
      anfitrion.fields.Name ||
      "";

    // Si es array, tomar el primer elemento
    if (Array.isArray(nombre)) {
      nombre = nombre[0] || "";
    }

    nombre = String(nombre).trim();

    if (nombre && nombre.toLowerCase().includes(query)) {
      const stats = calcularStatsAnfitrion(anfitrion.id);
      resultados.push({
        nombre: nombre,
        id: anfitrion.id,
        tipo: "anfitrion",
        totalVentas: stats.total,
        numVentas: stats.cantidad,
      });
    }
  });

  return resultados.slice(0, 5);
}

function calcularTotalCliente(nombreCliente) {
  return ventasData
    .filter((v) => {
      let nombre = v.fields["Nombre"];
      if (Array.isArray(nombre)) nombre = nombre[0];
      return nombre === nombreCliente;
    })
    .reduce(
      (sum, v) =>
        sum +
        (v.fields["Total Neto Numerico"] || v.fields["Total de venta"] || 0),
      0
    );
}

function contarComprasCliente(nombreCliente) {
  return ventasData.filter((v) => {
    let nombre = v.fields["Nombre"];
    if (Array.isArray(nombre)) nombre = nombre[0];
    return nombre === nombreCliente;
  }).length;
}

function calcularTotalProducto(nombreProducto) {
  let total = 0;
  ventasData.forEach((venta) => {
    Object.keys(venta.fields).forEach((campo) => {
      if (campo.startsWith("Cantidad real de ventas")) {
        const producto = campo.replace("Cantidad real de ventas ", "").trim();
        if (producto === nombreProducto) {
          total += parseInt(venta.fields[campo]) || 0;
        }
      }
    });
  });
  return total;
}

function calcularStatsAnfitrion(anfitrionId) {
  let total = 0;
  let cantidad = 0;

  ventasData.forEach((venta) => {
    const anfitriones = venta.fields["Anfitrión"] || [];
    if (anfitriones.includes(anfitrionId)) {
      total +=
        venta.fields["Total Neto Numerico"] ||
        venta.fields["Total de venta"] ||
        0;
      cantidad++;
    }
  });

  return { total, cantidad };
}

function mostrarResultadosBusqueda(resultados, query) {
  const container = document.getElementById("searchResults");
  let html = "";

  const totalResultados =
    resultados.clientes.length +
    resultados.productos.length +
    resultados.anfitriones.length;

  if (totalResultados === 0) {
    container.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <div class="no-results-text">No se encontraron resultados para "${query}"</div>
      </div>
    `;
    return;
  }

  html += '<div class="search-results">';

  // Resultados de Clientes
  if (resultados.clientes.length > 0) {
    html += `
      <div class="search-category">
        <div class="category-title">👥 Clientes (${
          resultados.clientes.length
        })</div>
        ${resultados.clientes
          .map((cliente) => {
            const nombreHighlight = resaltarTexto(cliente.nombre, query);
            return `
            <div class="result-item" onclick="abrirPerfilCliente('${cliente.nombre.replace(
              /'/g,
              "\\'"
            )}')">
              <div class="result-name">${nombreHighlight}</div>
              <div class="result-details">
                💰 ${Math.round(cliente.totalCompras).toLocaleString(
                  "es-CL"
                )} • 
                🛍️ ${cliente.numCompras} compra${
              cliente.numCompras !== 1 ? "s" : ""
            }
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  // Resultados de Productos
  if (resultados.productos.length > 0) {
    html += `
      <div class="search-category">
        <div class="category-title">📦 Productos (${
          resultados.productos.length
        })</div>
        ${resultados.productos
          .map((producto) => {
            const nombreHighlight = resaltarTexto(producto.nombre, query);
            return `
            <div class="result-item">
              <div class="result-name">${nombreHighlight}</div>
              <div class="result-details">
                📊 ${producto.totalVendido} unidades vendidas
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  // Resultados de Anfitriones
  if (resultados.anfitriones.length > 0) {
    html += `
      <div class="search-category">
        <div class="category-title">🏆 Anfitriones (${
          resultados.anfitriones.length
        })</div>
        ${resultados.anfitriones
          .map((anfitrion) => {
            const nombreHighlight = resaltarTexto(anfitrion.nombre, query);
            return `
            <div class="result-item">
              <div class="result-name">${nombreHighlight}</div>
              <div class="result-details">
                💰 ${Math.round(anfitrion.totalVentas).toLocaleString(
                  "es-CL"
                )} • 
                🛍️ ${anfitrion.numVentas} venta${
              anfitrion.numVentas !== 1 ? "s" : ""
            }
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  html += "</div>";
  container.innerHTML = html;
}

function resaltarTexto(texto, query) {
  const regex = new RegExp(`(${query})`, "gi");
  return texto.replace(regex, '<span class="highlight">$1</span>');
}

function limpiarBusqueda() {
  document.getElementById("searchInput").value = "";
  document.getElementById("clearSearch").classList.remove("show");
  document.getElementById("searchResults").innerHTML = "";
}

// ==========================================
// PERFIL DE CLIENTE
// ==========================================

function abrirPerfilCliente(nombreCliente) {
  const modal = document.getElementById("clientModal");

  // Obtener todas las compras del cliente (ventas y devoluciones)
  const comprasCliente = ventasData.filter((v) => {
    let nombre = v.fields["Nombre"];
    if (Array.isArray(nombre)) nombre = nombre[0];
    return nombre === nombreCliente;
  });

  if (comprasCliente.length === 0) return;

  // Separar ventas reales de devoluciones
  const ventasReales = comprasCliente.filter(
    (v) => !v.fields["Devolución"] || v.fields["Devolución"].length === 0
  );
  const devoluciones = comprasCliente.filter(
    (v) => v.fields["Devolución"] && v.fields["Devolución"].length > 0
  );

  // Calcular estadísticas
  const totalCompras = ventasReales.reduce(
    (sum, v) =>
      sum +
      (v.fields["Total Neto Numerico"] || v.fields["Total de venta"] || 0),
    0
  );

  const totalDevoluciones = devoluciones.reduce(
    (sum, v) =>
      sum +
      (v.fields["Total Neto Numerico"] || v.fields["Total de venta"] || 0),
    0
  );

  const numCompras = ventasReales.length;
  const numDevoluciones = devoluciones.length;

  let totalProductos = 0;
  ventasReales.forEach((venta) => {
    Object.keys(venta.fields).forEach((campo) => {
      if (campo.startsWith("Cantidad real de ventas")) {
        totalProductos += parseInt(venta.fields[campo]) || 0;
      }
    });
  });

  // Obtener última compra
  const comprasOrdenadas = [...comprasCliente].sort((a, b) => {
    const fechaA = new Date(a.fields["Fecha de compra"] || 0);
    const fechaB = new Date(b.fields["Fecha de compra"] || 0);
    return fechaB - fechaA;
  });

  const ultimaCompra = comprasOrdenadas[0];
  let ultimaCompraTexto = "No disponible";
  if (ultimaCompra && ultimaCompra.fields["Fecha de compra"]) {
    const fecha = new Date(ultimaCompra.fields["Fecha de compra"]);
    ultimaCompraTexto = fecha.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // Calcular promedio por compra
  const promedioCompra = numCompras > 0 ? totalCompras / numCompras : 0;

  // Generar HTML del perfil
  const perfilHTML = `
    <div class="modal-header">
      <h2>👤 Perfil de Cliente</h2>
      <button class="modal-close" onclick="cerrarPerfilCliente()">✕</button>
    </div>
    
    <div class="modal-body">
      <div class="client-name">${nombreCliente}</div>
      
      <div class="client-stats-grid">
        <div class="client-stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-value">$${Math.round(totalCompras).toLocaleString(
            "es-CL"
          )}</div>
          <div class="stat-label">Total Comprado</div>
        </div>
        <div class="client-stat-card">
          <div class="stat-icon">🛍️</div>
          <div class="stat-value">${numCompras}</div>
          <div class="stat-label">Compras Totales</div>
        </div>
        <div class="client-stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-value">${totalProductos}</div>
          <div class="stat-label">Productos Comprados</div>
        </div>
        <div class="client-stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-value">$${Math.round(promedioCompra).toLocaleString(
            "es-CL"
          )}</div>
          <div class="stat-label">Promedio por Compra</div>
        </div>
      </div>

      ${
        numDevoluciones > 0
          ? `
        <div class="client-info-box" style="background: #fef2f2; border: 2px solid #ef4444; margin-bottom: 15px;">
          <div class="info-row" style="color: #991b1b;">
            <span class="info-label">⚠️ Devoluciones:</span>
            <span class="info-value">${numDevoluciones} ($${Math.round(
              totalDevoluciones
            ).toLocaleString("es-CL")})</span>
          </div>
        </div>
      `
          : ""
      }

      <div class="client-info-box">
        <div class="info-row">
          <span class="info-label">📅 Última Compra:</span>
          <span class="info-value">${ultimaCompraTexto}</span>
        </div>
      </div>

      <div class="historial-title">📋 Historial Completo (${
        comprasOrdenadas.length
      })</div>
      <div class="historial-compras">
        ${comprasOrdenadas
          .map((venta, index) => {
            const fechaCompra = venta.fields["Fecha de compra"];
            let fechaHoraHTML =
              '<span style="color: #9ca3af;">Sin fecha</span>';

            if (fechaCompra) {
              const fecha = new Date(fechaCompra);
              const fechaTexto = fecha.toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const horaTexto = fecha.toLocaleTimeString("es-CL", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              fechaHoraHTML = `
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>📅 ${fechaTexto}</span>
                <span style="color: #10b981;">🕐 ${horaTexto}</span>
              </div>
            `;
            }

            const total =
              venta.fields["Total Neto Numerico"] ||
              venta.fields["Total de venta"] ||
              0;

            // Obtener productos comprados
            let productosHTML = "";
            let tieneProductos = false;
            Object.keys(venta.fields).forEach((campo) => {
              if (campo.startsWith("Cantidad real de ventas")) {
                const cantidad = parseInt(venta.fields[campo]) || 0;
                if (cantidad > 0) {
                  tieneProductos = true;
                  const nombreProducto = campo
                    .replace("Cantidad real de ventas ", "")
                    .trim();
                  productosHTML += `<div class="producto-item">• ${nombreProducto} <span style="color: #10b981; font-weight: 600;">(${cantidad})</span></div>`;
                }
              }
            });

            const esDevolucion =
              venta.fields["Devolución"] &&
              venta.fields["Devolución"].length > 0;

            return `
            <div class="compra-item ${esDevolucion ? "devolucion" : ""}">
              <div class="compra-header">
                <span class="compra-numero">${
                  esDevolucion ? "↩️ Devolución" : "🛍️ Compra"
                } #${comprasOrdenadas.length - index}</span>
                ${
                  esDevolucion
                    ? '<span class="badge badge-devolucion">Devuelto</span>'
                    : '<span class="badge badge-venta">Completada</span>'
                }
              </div>
              <div class="compra-fecha">${fechaHoraHTML}</div>
              ${
                tieneProductos
                  ? `
                <div class="compra-items">
                  <strong>📦 Productos:</strong>
                  <div style="margin-top: 6px;">
                    ${productosHTML}
                  </div>
                </div>
              `
                  : ""
              }
              <div class="compra-total">
                <span>Total:</span>
                <span class="total-amount" style="${
                  esDevolucion ? "color: #ef4444;" : ""
                }">
                  ${esDevolucion ? "-" : ""}$${Math.round(
              Math.abs(total)
            ).toLocaleString("es-CL")}
                </span>
              </div>
              ${
                esDevolucion && venta.fields["Box Observaciones"]
                  ? `
                <div class="compra-observacion">
                  <strong>📝 Motivo:</strong> ${venta.fields["Box Observaciones"]}
                </div>
              `
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;

  document.getElementById("modalContent").innerHTML = perfilHTML;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function cerrarPerfilCliente() {
  const modal = document.getElementById("clientModal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}
cerrarPerfilCliente;

// Cerrar modal al hacer click fuera
window.onclick = function (event) {
  const clientModal = document.getElementById("clientModal");
  const anfitrionModal = document.getElementById("anfitrionModal");
  const productoModal = document.getElementById("productoModal");

  if (event.target === clientModal) {
    cerrarPerfilCliente();
  }
  if (event.target === anfitrionModal) {
    cerrarPerfilAnfitrion();
  }
  if (event.target === productoModal) {
    cerrarPerfilProducto();
  }
};
// ==========================================
// SISTEMA DE TEMA CLARO/OSCURO
// ==========================================

// Cargar tema guardado al iniciar
document.addEventListener("DOMContentLoaded", function () {
  const temaGuardado = localStorage.getItem("tema");
  if (temaGuardado === "dark") {
    document.body.classList.add("dark-mode");
    actualizarIconoTema();
  }
});

// ==========================================
// SISTEMA DE TEMA CLARO/OSCURO
// ==========================================

// ==========================================
// AUTO-REFRESH
// ==========================================
// ==========================================
// NUEVAS FUNCIONES DEL DASHBOARD
// ==========================================

function mostrarGraficoVentasDias(ventas) {
  const hoy = new Date();
  const ultimos7Dias = [];

  // Generar últimos 7 días
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - i);
    ultimos7Dias.push({
      fecha: fecha,
      dia: fecha.toLocaleDateString("es-CL", { weekday: "short" }),
      total: 0,
    });
  }

  // Calcular ventas por día
  ventas.forEach((venta) => {
    const fechaVenta = new Date(venta.fields["Fecha de compra"]);
    const total =
      venta.fields["Total Neto Numerico"] ||
      venta.fields["Total de venta"] ||
      0;

    ultimos7Dias.forEach((dia) => {
      if (fechaVenta.toDateString() === dia.fecha.toDateString()) {
        dia.total += total;
      }
    });
  });

  // Crear gráfico con canvas
  const canvas = document.getElementById("chartVentasDiasCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth;
  const height = 200;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.scale(dpr, dpr);

  // Limpiar canvas
  ctx.clearRect(0, 0, width, height);

  // Configuración
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxTotal = Math.max(...ultimos7Dias.map((d) => d.total), 1);
  const barWidth = chartWidth / ultimos7Dias.length;

  // Dibujar barras
  ultimos7Dias.forEach((dia, index) => {
    const barHeight = (dia.total / maxTotal) * chartHeight;
    const x = padding.left + index * barWidth + barWidth * 0.1;
    const y = padding.top + (chartHeight - barHeight);
    const w = barWidth * 0.8;

    // Gradiente
    const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
    gradient.addColorStop(0, "#10b981");
    gradient.addColorStop(1, "#059669");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, barHeight);

    // Etiqueta día
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(dia.dia, x + w / 2, height - 10);

    // Valor
    if (dia.total > 0) {
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 10px -apple-system, sans-serif";
      ctx.fillText("$" + Math.round(dia.total / 1000) + "k", x + w / 2, y - 5);
    }
  });

  // Línea base
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(width - padding.right, padding.top + chartHeight);
  ctx.stroke();
}

function mostrarProductosDestacados(ventas) {
  const productosCount = {};
  const productosVentas = {};

  ventas.forEach((venta) => {
    const total =
      venta.fields["Total Neto Numerico"] ||
      venta.fields["Total de venta"] ||
      0;

    Object.keys(venta.fields).forEach((campo) => {
      if (campo.startsWith("Cantidad real de ventas")) {
        const cantidad = parseInt(venta.fields[campo]) || 0;

        if (cantidad > 0) {
          const nombreProducto = campo
            .replace("Cantidad real de ventas ", "")
            .trim();
          productosCount[nombreProducto] =
            (productosCount[nombreProducto] || 0) + cantidad;

          const numProductos = Object.keys(venta.fields).filter(
            (k) =>
              k.startsWith("Cantidad real de ventas") &&
              parseInt(venta.fields[k]) > 0
          ).length;

          productosVentas[nombreProducto] =
            (productosVentas[nombreProducto] || 0) + total / numProductos;
        }
      }
    });
  });

  const ranking = Object.entries(productosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const container = document.getElementById("productosDestacados");
  if (ranking.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No hay productos</p></div>';
    return;
  }

  const iconos = ["🥇", "🥈", "🥉", "📦", "📦"];

  container.innerHTML = ranking
    .map(([producto, cantidad], index) => {
      const ventas = Math.round(productosVentas[producto] || 0);
      return `
      <div class="producto-destacado" onclick="abrirPerfilProducto('${producto.replace(
        /'/g,
        "\\'"
      )}')">
        <div class="producto-icono">${iconos[index]}</div>
        <div class="producto-info">
          <div class="producto-nombre">${producto}</div>
          <div class="producto-stats">
            <span class="producto-stat">📊 ${cantidad} unid.</span>
            <span class="producto-stat">💰 $${ventas.toLocaleString(
              "es-CL"
            )}</span>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function mostrarActividadReciente(ventas) {
  const actividades = ventas.slice(0, 5).map((venta) => {
    const cliente = Array.isArray(venta.fields["Nombre"])
      ? venta.fields["Nombre"][0]
      : venta.fields["Nombre"] || "Cliente";
    const total =
      venta.fields["Total Neto Numerico"] ||
      venta.fields["Total de venta"] ||
      0;
    const esDevolucion =
      venta.fields["Devolución"] && venta.fields["Devolución"].length > 0;
    const fecha = venta.fields["Fecha de compra"];

    let tiempoTexto = "Hace un momento";
    if (fecha) {
      const fechaVenta = new Date(fecha);
      const ahora = new Date();
      const diff = ahora - fechaVenta;
      const minutos = Math.floor(diff / 60000);
      const horas = Math.floor(minutos / 60);
      const dias = Math.floor(horas / 24);

      if (dias > 0) tiempoTexto = `Hace ${dias} día${dias > 1 ? "s" : ""}`;
      else if (horas > 0)
        tiempoTexto = `Hace ${horas} hora${horas > 1 ? "s" : ""}`;
      else if (minutos > 0)
        tiempoTexto = `Hace ${minutos} minuto${minutos > 1 ? "s" : ""}`;
    }

    return {
      icono: esDevolucion ? "↩️" : "🛍️",
      titulo: esDevolucion ? "Devolución" : "Nueva venta",
      detalle: `${cliente} - $${Math.round(total).toLocaleString("es-CL")}`,
      tiempo: tiempoTexto,
    };
  });

  const container = document.getElementById("actividadReciente");
  if (actividades.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay actividad</p></div>';
    return;
  }

  container.innerHTML = actividades
    .map(
      (act) => `
    <div class="actividad-item">
      <div class="actividad-icon">${act.icono}</div>
      <div class="actividad-content">
        <div class="actividad-titulo">${act.titulo}</div>
        <div class="actividad-detalle">${act.detalle}</div>
        <div class="actividad-tiempo">${act.tiempo}</div>
      </div>
    </div>
  `
    )
    .join("");
}

// ==========================================
// MODAL DE PERFIL DE ANFITRIÓN
// ==========================================

function abrirPerfilAnfitrion(anfitrionId) {
  const modal = document.getElementById("anfitrionModal");
  const anfitrionData = anfitrionesMap[anfitrionId];

  if (!anfitrionData) return;

  // Obtener nombre
  let nombre =
    anfitrionData.Nombre ||
    anfitrionData.Name ||
    anfitrionData["Anfitrión"] ||
    "Anfitrión";

  if (Array.isArray(nombre)) nombre = nombre[0];

  // Calcular estadísticas
  const ventasAnfitrion = ventasData.filter((v) => {
    const anfitriones = v.fields["Anfitrión"] || [];
    return anfitriones.includes(anfitrionId);
  });

  const ventasReales = ventasAnfitrion.filter(
    (v) => !v.fields["Devolución"] || v.fields["Devolución"].length === 0
  );

  const totalVentas = ventasReales.reduce(
    (sum, v) =>
      sum +
      (v.fields["Total Neto Numerico"] || v.fields["Total de venta"] || 0),
    0
  );

  const numVentas = ventasReales.length;
  const promedio = numVentas > 0 ? totalVentas / numVentas : 0;

  // Contar clientes únicos
  const clientesUnicos = new Set();
  ventasAnfitrion.forEach((v) => {
    const clientes = v.fields["Cliente"] || [];
    clientes.forEach((c) => clientesUnicos.add(c));
  });

  // Productos vendidos
  let totalProductos = 0;
  ventasReales.forEach((venta) => {
    Object.keys(venta.fields).forEach((campo) => {
      if (campo.startsWith("Cantidad real de ventas")) {
        totalProductos += parseInt(venta.fields[campo]) || 0;
      }
    });
  });

  const perfilHTML = `
    <div class="modal-header">
      <h2>🏆 Perfil de Anfitrión</h2>
      <button class="modal-close" onclick="cerrarPerfilAnfitrion()">✕</button>
    </div>
    
    <div class="modal-body">
      <div class="client-name">${nombre}</div>
      
      <div class="client-stats-grid">
        <div class="client-stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-value">$${Math.round(totalVentas).toLocaleString(
            "es-CL"
          )}</div>
          <div class="stat-label">Total Vendido</div>
        </div>
        <div class="client-stat-card">
          <div class="stat-icon">🛍️</div>
          <div class="stat-value">${numVentas}</div>
          <div class="stat-label">Ventas</div>
        </div>
        <div class="client-stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-value">${clientesUnicos.size}</div>
          <div class="stat-label">Clientes</div>
        </div>
        <div class="client-stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-value">${totalProductos}</div>
          <div class="stat-label">Productos</div>
        </div>
      </div>

      <div class="client-info-box">
        <div class="info-row">
          <span class="info-label">📈 Promedio por Venta:</span>
          <span class="info-value">$${Math.round(promedio).toLocaleString(
            "es-CL"
          )}</span>
        </div>
      </div>

      <div class="historial-title">📋 Últimas Ventas (${
        ventasAnfitrion.slice(0, 10).length
      })</div>
      <div class="historial-compras">
        ${ventasAnfitrion
          .slice(0, 10)
          .map((venta, index) => {
            const fechaCompra = venta.fields["Fecha de compra"];
            let fechaTexto = "Sin fecha";

            if (fechaCompra) {
              const fecha = new Date(fechaCompra);
              fechaTexto = fecha.toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
            }

            const total =
              venta.fields["Total Neto Numerico"] ||
              venta.fields["Total de venta"] ||
              0;
            const cliente = Array.isArray(venta.fields["Nombre"])
              ? venta.fields["Nombre"][0]
              : venta.fields["Nombre"] || "Sin cliente";
            const esDevolucion =
              venta.fields["Devolución"] &&
              venta.fields["Devolución"].length > 0;

            return `
            <div class="compra-item ${esDevolucion ? "devolucion" : ""}">
              <div class="compra-header">
                <span class="compra-numero">${
                  esDevolucion ? "↩️ Devolución" : "🛍️ Venta"
                } #${index + 1}</span>
                ${
                  esDevolucion
                    ? '<span class="badge badge-devolucion">Devuelto</span>'
                    : '<span class="badge badge-venta">Completada</span>'
                }
              </div>
              <div class="compra-fecha">📅 ${fechaTexto}</div>
              <div class="compra-items" style="margin-top: 8px;">
                <strong>👤 Cliente:</strong> ${cliente}
              </div>
              <div class="compra-total">
                <span>Total:</span>
                <span class="total-amount" style="${
                  esDevolucion ? "color: #ef4444;" : ""
                }">
                  ${esDevolucion ? "-" : ""}$${Math.round(
              Math.abs(total)
            ).toLocaleString("es-CL")}
                </span>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;

  document.getElementById("anfitrionModalContent").innerHTML = perfilHTML;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function cerrarPerfilAnfitrion() {
  const modal = document.getElementById("anfitrionModal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

// ==========================================
// MODAL DE PERFIL DE PRODUCTO
// ==========================================

function abrirPerfilProducto(nombreProducto) {
  const modal = document.getElementById("productoModal");

  // Calcular estadísticas del producto
  let totalUnidades = 0;
  let totalVentas = 0;
  let numTransacciones = 0;
  const ventasPorDia = {};

  ventasData.forEach((venta) => {
    const esDevolucion =
      venta.fields["Devolución"] && venta.fields["Devolución"].length > 0;
    if (esDevolucion) return;

    Object.keys(venta.fields).forEach((campo) => {
      if (campo.startsWith("Cantidad real de ventas")) {
        const producto = campo.replace("Cantidad real de ventas ", "").trim();

        if (producto === nombreProducto) {
          const cantidad = parseInt(venta.fields[campo]) || 0;
          if (cantidad > 0) {
            totalUnidades += cantidad;
            numTransacciones++;

            const total =
              venta.fields["Total Neto Numerico"] ||
              venta.fields["Total de venta"] ||
              0;
            const numProductos = Object.keys(venta.fields).filter(
              (k) =>
                k.startsWith("Cantidad real de ventas") &&
                parseInt(venta.fields[k]) > 0
            ).length;

            totalVentas += total / numProductos;

            // Agrupar por día
            const fecha = venta.fields["Fecha de compra"];
            if (fecha) {
              const dia = new Date(fecha).toLocaleDateString("es-CL");
              ventasPorDia[dia] = (ventasPorDia[dia] || 0) + cantidad;
            }
          }
        }
      }
    });
  });

  const precioPromedio =
    numTransacciones > 0 ? totalVentas / numTransacciones : 0;
  const unidadesPorVenta =
    numTransacciones > 0 ? totalUnidades / numTransacciones : 0;

  // Día con más ventas
  const mejorDia = Object.entries(ventasPorDia).sort(
    (a, b) => b[1] - a[1]
  )[0] || ["N/A", 0];

  const perfilHTML = `
    <div class="modal-header">
      <h2>📦 Detalle de Producto</h2>
      <button class="modal-close" onclick="cerrarPerfilProducto()">✕</button>
    </div>
    
    <div class="modal-body">
      <div class="client-name">${nombreProducto}</div>
      
      <div class="client-stats-grid">
        <div class="client-stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${totalUnidades}</div>
          <div class="stat-label">Unidades Vendidas</div>
        </div>
        <div class="client-stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-value">$${Math.round(totalVentas).toLocaleString(
            "es-CL"
          )}</div>
          <div class="stat-label">Total Generado</div>
        </div>
        <div class="client-stat-card">
          <div class="stat-icon">🛍️</div>
          <div class="stat-value">${numTransacciones}</div>
          <div class="stat-label">Transacciones</div>
        </div>
        <div class="client-stat-card">
          <div class="stat-icon">💵</div>
          <div class="stat-value">$${Math.round(precioPromedio).toLocaleString(
            "es-CL"
          )}</div>
          <div class="stat-label">Precio Promedio</div>
        </div>
      </div>

      <div class="client-info-box">
        <div class="info-row" style="margin-bottom: 8px;">
          <span class="info-label">📦 Unidades por Venta:</span>
          <span class="info-value">${unidadesPorVenta.toFixed(1)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🎯 Mejor Día:</span>
          <span class="info-value">${mejorDia[0]} (${mejorDia[1]} unid.)</span>
        </div>
      </div>

      <div class="nota-inteligente">
        <div class="nota-icon">💡</div>
        <div class="nota-content">
          <div class="nota-title">Análisis</div>
          <div class="nota-text">
            Este producto ha generado <strong>$${Math.round(
              totalVentas
            ).toLocaleString("es-CL")}</strong> en ventas
            con un promedio de <strong>${unidadesPorVenta.toFixed(
              1
            )} unidades por transacción</strong>.
            ${
              totalUnidades > 10
                ? "Es uno de los productos más populares."
                : "Tiene potencial de crecimiento."
            }
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("productoModalContent").innerHTML = perfilHTML;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function cerrarPerfilProducto() {
  const modal = document.getElementById("productoModal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

setInterval(() => {
  const sesionActiva = sessionStorage.getItem("dashboardAutenticado");
  if (sesionActiva === "true") {
    cargarDatos();
  }
}, 300000); // 5 minutos