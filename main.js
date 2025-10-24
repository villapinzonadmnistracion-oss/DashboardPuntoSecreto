// Variables globales
let ventasData = [];
let clientesData = [];
let anfitrionesData = [];
let clientesMap = {};
let anfitrionesMap = {};
let todasLasTransacciones = [];
let filtroTransaccionActual = 'todas';

// Inicializar fechas (últimos 30 días por defecto)
function inicializarFechas() {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hace30dias.getDate() - 30);
  
  document.getElementById('fechaHasta').valueAsDate = hoy;
  document.getElementById('fechaDesde').valueAsDate = hace30dias;
}

function cambiarPeriodoRapido() {
  const periodo = document.getElementById('filterPeriodo').value;
  if (!periodo) return;

  const hoy = new Date();
  const fechaHasta = document.getElementById('fechaHasta');
  const fechaDesde = document.getElementById('fechaDesde');
  
  fechaHasta.valueAsDate = hoy;

  switch(periodo) {
    case 'hoy':
      fechaDesde.valueAsDate = hoy;
      break;
    case '7dias':
      const hace7 = new Date();
      hace7.setDate(hace7.getDate() - 7);
      fechaDesde.valueAsDate = hace7;
      break;
    case '30dias':
      const hace30 = new Date();
      hace30.setDate(hace30.getDate() - 30);
      fechaDesde.valueAsDate = hace30;
      break;
    case 'mes':
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fechaDesde.valueAsDate = inicioMes;
      break;
    case 'year':
      const inicioAno = new Date(hoy.getFullYear(), 0, 1);
      fechaDesde.valueAsDate = inicioAno;
      break;
    case 'all':
      fechaDesde.value = '';
      fechaHasta.value = '';
      break;
  }
  
  aplicarFiltros();
}

async function cargarDatos() {
  try {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('content').style.display = 'none';

    console.log('🔄 Cargando datos desde Airtable...');

    // Cargar todas las tablas en paralelo
    const [ventas, clientes, anfitriones] = await Promise.all([
      fetchFromProxy('tblC7aADITb6A6iYP'),  // VENTAS
      fetchFromProxy('tblfRI4vdXspaNNlD'),  // CLIENTES
      fetchFromProxy('tblrtLcB3dUASCfnL')   // ANFITRIONES
    ]);

    ventasData = ventas;
    clientesData = clientes;
    anfitrionesData = anfitriones;

    // Crear mapas para búsqueda rápida
    clientesMap = {};
    clientesData.forEach(c => {
      clientesMap[c.id] = c.fields;
    });

    anfitrionesMap = {};
    anfitrionesData.forEach(a => {
      anfitrionesMap[a.id] = a.fields;
    });

    console.log('✅ Ventas cargadas:', ventasData.length);
    console.log('✅ Clientes cargados:', clientesData.length);
    console.log('✅ Anfitriones cargados:', anfitrionesData.length);

    cargarAnfitrionesEnFiltro();
    aplicarFiltros();

    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';

    const now = new Date();
    document.getElementById('lastUpdate').textContent = `Última actualización: ${now.toLocaleTimeString('es-CL')}`;
    document.getElementById('refreshTime').textContent = `Actualizado: ${now.toLocaleString('es-CL')}`;

  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
    document.getElementById('loading').innerHTML = `
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
    // Las credenciales deben estar en variables de entorno del servidor
    const response = await fetch(`/api/airtable?action=getRecords&tableId=${tableId}`);
    
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
  const select = document.getElementById('filterAnfitrion');
  select.innerHTML = '<option value="">Todos los anfitriones</option>';
  
  anfitrionesData.forEach(anfitrion => {
    const option = document.createElement('option');
    option.value = anfitrion.id;
    option.textContent = anfitrion.fields.Nombre || 'Sin nombre';
    select.appendChild(option);
  });
}

function aplicarFiltros() {
  const fechaDesde = document.getElementById('fechaDesde').value;
  const fechaHasta = document.getElementById('fechaHasta').value;
  const anfitrionId = document.getElementById('filterAnfitrion').value;

  let ventasFiltradas = [...ventasData];

  if (fechaDesde || fechaHasta) {
    ventasFiltradas = ventasFiltradas.filter(venta => {
      const fechaVenta = venta.fields['Fecha de compra'];
      if (!fechaVenta) return false;
      
      const fecha = new Date(fechaVenta);
      
      if (fechaDesde && fechaHasta) {
        return fecha >= new Date(fechaDesde) && fecha <= new Date(fechaHasta + 'T23:59:59');
      } else if (fechaDesde) {
        return fecha >= new Date(fechaDesde);
      } else if (fechaHasta) {
        return fecha <= new Date(fechaHasta + 'T23:59:59');
      }
      return true;
    });
  }

  if (anfitrionId) {
    ventasFiltradas = ventasFiltradas.filter(venta => {
      const anfitriones = venta.fields['Anfitrión'] || [];
      return anfitriones.includes(anfitrionId);
    });
  }

  console.log(`🔍 Ventas filtradas: ${ventasFiltradas.length} de ${ventasData.length}`);
  calcularEstadisticas(ventasFiltradas);
}

function calcularEstadisticas(ventas) {
  const ventasReales = ventas.filter(v => !v.fields['Devolución'] || v.fields['Devolución'].length === 0);
  const devoluciones = ventas.filter(v => v.fields['Devolución'] && v.fields['Devolución'].length > 0);

  const totalVentas = ventasReales.reduce((sum, v) => {
    const total = v.fields['Total Neto Numerico'] || v.fields['Total de venta'] || 0;
    return sum + total;
  }, 0);
  
  const numVentas = ventasReales.length;
  const promedioVenta = numVentas > 0 ? totalVentas / numVentas : 0;
  const tasaDevolucion = ventas.length > 0 ? (devoluciones.length / ventas.length * 100) : 0;

  document.getElementById('kpiTotalVentas').textContent = `$${Math.round(totalVentas).toLocaleString('es-CL')}`;
  document.getElementById('kpiPromedioVenta').textContent = `$${Math.round(promedioVenta).toLocaleString('es-CL')}`;
  document.getElementById('kpiNumVentas').textContent = ventas.length;
  document.getElementById('kpiTasaDevolucion').textContent = `${tasaDevolucion.toFixed(1)}%`;

  mostrarTopAnfitriones(ventasReales);
  mostrarTopProductos(ventasReales);
  mostrarGraficoProductos(ventasReales);
  mostrarTopClientes(ventasReales);
  mostrarClasificacionClientes(ventasReales);
  
  todasLasTransacciones = ventas.slice(0, 50);
  filtrarTransacciones(filtroTransaccionActual);
}

function mostrarTopAnfitriones(ventas) {
  const anfitrionesStats = {};

  ventas.forEach(venta => {
    const anfitrionesIds = venta.fields['Anfitrión'] || [];
    const total = venta.fields['Total Neto Numerico'] || venta.fields['Total de venta'] || 0;

    anfitrionesIds.forEach(id => {
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

  const container = document.getElementById('rankingAnfitriones');
  if (ranking.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay datos</p></div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  container.innerHTML = ranking.map((anf, index) => {
    const anfitrionData = anfitrionesMap[anf.id];
    const nombre = anfitrionData?.Nombre || 
                   anfitrionData?.Name || 
                   anfitrionData?.['Nombre completo'] ||
                   'Desconocido';
    
    return `
      <div class="ranking-item">
        <div class="ranking-name">
          <span class="ranking-medal">${medals[index]}</span>
          <span>${nombre}</span>
        </div>
        <div class="ranking-value">$${Math.round(anf.total).toLocaleString('es-CL')}</div>
      </div>
    `;
  }).join('');
}

function mostrarTopProductos(ventas) {
  const productosCount = {};

  ventas.forEach(venta => {
    Object.keys(venta.fields).forEach(campo => {
      if (campo.startsWith('Cantidad real de ventas')) {
        const cantidad = parseInt(venta.fields[campo]) || 0;
        
        if (cantidad > 0) {
          const nombreProducto = campo.replace('Cantidad real de ventas ', '').trim();
          productosCount[nombreProducto] = (productosCount[nombreProducto] || 0) + cantidad;
        }
      }
    });
  });

  const ranking = Object.entries(productosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const container = document.getElementById('topProductos');
  if (ranking.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay productos registrados</p></div>';
    return;
  }

  const maxCantidad = ranking[0][1];
  container.innerHTML = ranking.map(([producto, cantidad]) => {
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
  }).join('');
}

function mostrarGraficoProductos(ventas) {
  const productosCount = {};
  const productosPorFecha = {}; // Para calcular frecuencia

  ventas.forEach(venta => {
    const fechaVenta = venta.fields['Fecha de compra'];
    
    Object.keys(venta.fields).forEach(campo => {
      if (campo.startsWith('Cantidad real de ventas')) {
        const cantidad = parseInt(venta.fields[campo]) || 0;
        
        if (cantidad > 0) {
          const nombreProducto = campo.replace('Cantidad real de ventas ', '').trim();
          productosCount[nombreProducto] = (productosCount[nombreProducto] || 0) + cantidad;
          
          // Registrar venta por fecha para calcular frecuencia
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

  const productosArray = Object.entries(productosCount).sort((a, b) => b[1] - a[1]);

  if (productosArray.length === 0) {
    document.getElementById('graficoProductos').innerHTML = 
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay datos</p></div>';
    document.getElementById('notaInteligente').innerHTML = '';
    return;
  }

  // Calcular análisis inteligente
  const productoMasVendido = productosArray[0];
  const productoMenosVendido = productosArray[productosArray.length - 1];
  
  // Calcular frecuencia (días entre ventas promedio)
  let frecuenciaTexto = '';
  if (productosPorFecha[productoMasVendido[0]] && productosPorFecha[productoMasVendido[0]].length > 1) {
    const fechas = productosPorFecha[productoMasVendido[0]].sort((a, b) => a - b);
    let sumaIntervalos = 0;
    for (let i = 1; i < fechas.length; i++) {
      const dias = (fechas[i] - fechas[i-1]) / (1000 * 60 * 60 * 24);
      sumaIntervalos += dias;
    }
    const promedioDias = Math.round(sumaIntervalos / (fechas.length - 1));
    
    if (promedioDias < 1) {
      frecuenciaTexto = 'varias veces al día';
    } else if (promedioDias === 1) {
      frecuenciaTexto = 'diariamente';
    } else if (promedioDias <= 3) {
      frecuenciaTexto = `cada ${promedioDias} días`;
    } else if (promedioDias <= 7) {
      frecuenciaTexto = 'semanalmente';
    } else if (promedioDias <= 14) {
      frecuenciaTexto = 'cada 2 semanas';
    } else {
      frecuenciaTexto = `cada ${Math.round(promedioDias / 7)} semanas`;
    }
  } else {
    frecuenciaTexto = 'ocasionalmente';
  }

  // Obtener rango de fechas actual
  const fechaDesde = document.getElementById('fechaDesde').value;
  const fechaHasta = document.getElementById('fechaHasta').value;
  let periodoTexto = '';
  
  if (fechaDesde && fechaHasta) {
    const desde = new Date(fechaDesde).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    const hasta = new Date(fechaHasta).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    periodoTexto = `del ${desde} al ${hasta}`;
  } else if (fechaDesde) {
    const desde = new Date(fechaDesde).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    periodoTexto = `desde el ${desde}`;
  } else if (fechaHasta) {
    const hasta = new Date(fechaHasta).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    periodoTexto = `hasta el ${hasta}`;
  } else {
    periodoTexto = 'en el período seleccionado';
  }

  // Generar nota inteligente
  const notaHTML = `
    <div class="nota-inteligente">
      <div class="nota-icon">💡</div>
      <div class="nota-content">
        <div class="nota-title">Análisis Inteligente</div>
        <div class="nota-text">
          <strong style="color: #10b981;">${productoMasVendido[0]}</strong> es el producto más vendido 
          con <strong>${productoMasVendido[1]} unidades</strong> ${periodoTexto}. 
          Se vende aproximadamente <strong>${frecuenciaTexto}</strong>. 
          ${productosArray.length > 1 ? `Por otro lado, <strong style="color: #ef4444;">${productoMenosVendido[0]}</strong> 
          tiene el menor volumen con ${productoMenosVendido[1]} unidad${productoMenosVendido[1] > 1 ? 'es' : ''}.` : ''}
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('notaInteligente').innerHTML = notaHTML;

  // Generar gráfico circular (pie chart) con Canvas
  const canvas = document.getElementById('chartCanvas');
  const ctx = canvas.getContext('2d');
  
  // Ajustar para alta resolución
  const dpr = window.devicePixelRatio || 1;
  const size = 280;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 90;

  // Paleta de colores vibrante y variada (30 colores)
  const colores = [
    '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b',
    '#059669', '#0891b2', '#7c3aed', '#db2777', '#d97706',
    '#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24',
    '#6ee7b7', '#67e8f9', '#c4b5fd', '#f9a8d4', '#fcd34d',
    '#14b8a6', '#0284c7', '#6366f1', '#e11d48', '#ea580c',
    '#2dd4bf', '#38bdf8', '#818cf8', '#fb7185', '#fb923c',
    '#5eead4', '#7dd3fc', '#a5b4fc', '#fda4af', '#fdba74',
    '#99f6e4', '#bae6fd', '#c7d2fe', '#fecdd3', '#fed7aa'
  ];

  const total = productosArray.reduce((sum, [_, count]) => sum + count, 0);
  let currentAngle = -Math.PI / 2;

  // Dibujar segmentos
  productosArray.forEach(([nombre, cantidad], index) => {
    const sliceAngle = (cantidad / total) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colores[index % colores.length];
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    currentAngle += sliceAngle;
  });

  // Círculo blanco central
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Texto central
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 20px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, centerX, centerY - 8);
  ctx.font = '12px -apple-system, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('unidades', centerX, centerY + 10);

  // Leyenda
  const leyendaHTML = productosArray.slice(0, 8).map(([nombre, cantidad], index) => {
    const porcentaje = ((cantidad / total) * 100).toFixed(1);
    return `
      <div class="leyenda-item">
        <div class="leyenda-color" style="background: ${colores[index % colores.length]}"></div>
        <div class="leyenda-info">
          <div class="leyenda-nombre">${nombre}</div>
          <div class="leyenda-valor">${cantidad} unid. (${porcentaje}%)</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('leyendaProductos').innerHTML = leyendaHTML;
}

function mostrarTopClientes(ventas) {
  const clientesStats = {};

  ventas.forEach(venta => {
    const nombreCliente = venta.fields['Nombre'] || 'Cliente desconocido';
    const total = venta.fields['Total Neto Numerico'] || venta.fields['Total de venta'] || 0;

    if (!clientesStats[nombreCliente]) {
      clientesStats[nombreCliente] = { total: 0, cantidad: 0, nombre: nombreCliente };
    }
    clientesStats[nombreCliente].total += total;
    clientesStats[nombreCliente].cantidad += 1;
  });

  const ranking = Object.values(clientesStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const container = document.getElementById('topClientes');
  if (ranking.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay datos</p></div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  container.innerHTML = ranking.map((cli, index) => {
    return `
      <div class="ranking-item">
        <div class="ranking-name">
          <span class="ranking-medal">${medals[index]}</span>
          <span>${cli.nombre}</span>
        </div>
        <div class="ranking-value">$${Math.round(cli.total).toLocaleString('es-CL')}</div>
      </div>
    `;
  }).join('');
}

function mostrarClasificacionClientes(ventas) {
  // Obtener IDs únicos de clientes de las ventas
  const clientesEnVentas = new Set();
  ventas.forEach(venta => {
    const clienteIds = venta.fields['Cliente'] || [];
    clienteIds.forEach(id => clientesEnVentas.add(id));
  });

  // Clasificar clientes según la fórmula de Airtable
  const clasificaciones = {
    premium: [],
    gold: [],
    frecuente: [],
    normal: []
  };

  clientesEnVentas.forEach(clienteId => {
    const clienteData = clientesMap[clienteId];
    if (!clienteData) return;

    const nombre = clienteData.Nombre || clienteData.Name || 'Sin nombre';
    const cantidadUnidades = clienteData['Cantidad de unidades General x Cliente'] || 0;

    // Aplicar lógica de clasificación según Airtable:
    // 0 unidades = Cliente Normal
    // <= 3 unidades = Cliente Frecuente
    // <= 6 unidades = Cliente Gold
    // > 6 unidades = Cliente Premium
    
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

  const container = document.getElementById('clasificacionClientes');
  
  // Tarjetas de resumen
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

  // Lista detallada
  const todosClientes = [
    ...clasificaciones.premium.map(n => ({ nombre: n, tipo: 'premium', label: 'Premium', icon: '💎' })),
    ...clasificaciones.gold.map(n => ({ nombre: n, tipo: 'gold', label: 'Gold', icon: '👑' })),
    ...clasificaciones.frecuente.map(n => ({ nombre: n, tipo: 'frecuente', label: 'Frecuente', icon: '⭐' })),
    ...clasificaciones.normal.slice(0, 10).map(n => ({ nombre: n, tipo: 'normal', label: 'Normal', icon: '👤' }))
  ];

  const listaHTML = todosClientes.length > 0 ? `
    <div class="clasificacion-list">
      ${todosClientes.map(cliente => `
        <div class="clasificacion-item">
          <span class="clasificacion-nombre">
            <span style="margin-right: 8px;">${cliente.icon}</span>
            ${cliente.nombre}
          </span>
          <span class="clasificacion-badge badge-${cliente.tipo}">${cliente.label}</span>
        </div>
      `).join('')}
    </div>
  ` : '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay clientes</p></div>';

  container.innerHTML = resumenHTML + listaHTML;
}

function mostrarUltimasTransacciones(ventas) {
  const container = document.getElementById('ultimasTransacciones');
  if (ventas.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay transacciones</p></div>';
    return;
  }

  container.innerHTML = ventas.map(venta => {
    const nombreCliente = venta.fields['Nombre'] || 'Sin cliente';
    const total = venta.fields['Total Neto Numerico'] || venta.fields['Total de venta'] || 0;
    const items = venta.fields['Items'] || 'Sin items';
    
    let fechaHoraTexto = 'Sin fecha';
    if (venta.fields['Fecha de compra']) {
      const fechaCompleta = new Date(venta.fields['Fecha de compra']);
      const fecha = fechaCompleta.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const hora = fechaCompleta.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      fechaHoraTexto = `${fecha} - ${hora}`;
    }
    
    const esDevolucion = venta.fields['Devolución'] && venta.fields['Devolución'].length > 0;
    
    let autorizadoPor = '';
    if (esDevolucion && venta.fields['Box Observaciones']) {
      autorizadoPor = `<div style="margin-top: 8px; padding: 8px; background: #fff3cd; border-radius: 6px; font-size: 11px; color: #856404;">
        <strong>✓ Autorizado por:</strong> ${venta.fields['Box Observaciones']}
      </div>`;
    }

    return `
      <div class="transaction-item">
        <div class="transaction-header">
          <span>${nombreCliente}</span>
          <span class="badge ${esDevolucion ? 'badge-devolucion' : 'badge-venta'}">
            ${esDevolucion ? 'Devolución' : 'Venta'}
          </span>
        </div>
        <div class="transaction-details">
          <div style="margin-bottom: 3px;">📦 ${items}</div>
          <div style="display: flex; justify-content: space-between;">
            <span>📅 ${fechaHoraTexto}</span>
            <span style="font-weight: 600; color: #10b981;">$${Math.round(total).toLocaleString('es-CL')}</span>
          </div>
          ${autorizadoPor}
        </div>
      </div>
    `;
  }).join('');
}

function filtrarTransacciones(tipo) {
  filtroTransaccionActual = tipo;
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === tipo) {
      btn.classList.add('active');
    }
  });

  let transaccionesFiltradas = [...todasLasTransacciones];

  if (tipo === 'ventas') {
    transaccionesFiltradas = todasLasTransacciones.filter(v => 
      !v.fields['Devolución'] || v.fields['Devolución'].length === 0
    );
  } else if (tipo === 'devoluciones') {
    transaccionesFiltradas = todasLasTransacciones.filter(v => 
      v.fields['Devolución'] && v.fields['Devolución'].length > 0
    );
  }

  mostrarUltimasTransacciones(transaccionesFiltradas.slice(0, 10));
}

// Inicializar
inicializarFechas();
cargarDatos();
// Función para cambiar entre secciones del menú
function cambiarSeccion(seccion) {
  // Desactivar todos los botones del menú
  document.querySelectorAll('.menu-item').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Activar el botón seleccionado
  const botonActivo = document.querySelector(`.menu-item[data-section="${seccion}"]`);
  if (botonActivo) {
    botonActivo.classList.add('active');
  }
  
  // Ocultar todas las secciones
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Mostrar la sección seleccionada
  const seccionActiva = document.getElementById(`section-${seccion}`);
  if (seccionActiva) {
    seccionActiva.classList.add('active');
  }
}

// Auto-refresh cada 5 minutos
setInterval(cargarDatos, 300000);