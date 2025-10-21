// VERSIÓN DE DIAGNÓSTICO - Ver errores detallados

// Variables globales
let ventasData = [];
let clientesData = [];
let anfitrionesData = [];
let clientesMap = {};
let anfitrionesMap = {};

function log(emoji, mensaje, data) {
  console.log(`${emoji} ${mensaje}`, data || '');
  // Mostrar en pantalla también
  const debugDiv = document.getElementById('debugOutput') || createDebugDiv();
  debugDiv.innerHTML += `<div>${emoji} ${mensaje} ${data ? JSON.stringify(data).substring(0, 100) : ''}</div>`;
}

function createDebugDiv() {
  const div = document.createElement('div');
  div.id = 'debugOutput';
  div.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: #000; color: #0f0; padding: 10px; max-height: 200px; overflow-y: auto; font-size: 11px; font-family: monospace; z-index: 9999;';
  document.body.appendChild(div);
  return div;
}

// Inicializar fechas
function inicializarFechas() {
  const hoy = new Date();
  const hace30dias = new Date();
  hace30dias.setDate(hace30dias.getDate() - 30);
  
  document.getElementById('fechaHasta').valueAsDate = hoy;
  document.getElementById('fechaDesde').valueAsDate = hace30dias;
  log('📅', 'Fechas inicializadas');
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

    log('🔄', 'Iniciando carga de datos...');
    log('🌐', 'URL actual:', window.location.href);

    // Probar si el endpoint existe
    log('🔍', 'Probando endpoint /api/airtable...');
    
    const testResponse = await fetch('/api/airtable?action=test').catch(err => {
      log('❌', 'Error al conectar con /api/airtable:', err.message);
      throw new Error('No se puede conectar con el API. ¿Está desplegado en Vercel?');
    });

    log('✅', 'Endpoint responde, status:', testResponse.status);

    // Cargar ventas
    log('📊', 'Cargando tabla de ventas...');
    const ventas = await fetchFromProxy('tblC7aADITb6A6iYP');
    log('✅', 'Ventas cargadas:', ventas.length);

    // Cargar clientes
    log('👥', 'Cargando tabla de clientes...');
    const clientes = await fetchFromProxy('tbl1fRI4vdXspaNNlD');
    log('✅', 'Clientes cargados:', clientes.length);

    // Cargar anfitriones
    log('🎭', 'Cargando tabla de anfitriones...');
    const anfitriones = await fetchFromProxy('tbirtLcB3dUASCfnL');
    log('✅', 'Anfitriones cargados:', anfitriones.length);

    ventasData = ventas;
    clientesData = clientes;
    anfitrionesData = anfitriones;

    // Crear mapas
    clientesMap = {};
    clientesData.forEach(c => {
      clientesMap[c.id] = c.fields;
    });

    anfitrionesMap = {};
    anfitrionesData.forEach(a => {
      anfitrionesMap[a.id] = a.fields;
    });

    log('🗺️', 'Mapas creados');

    // Ver estructura
    if (ventasData.length > 0) {
      log('📋', 'Campos de venta:', Object.keys(ventasData[0].fields));
    }

    cargarAnfitrionesEnFiltro();
    aplicarFiltros();

    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';

    const now = new Date();
    document.getElementById('lastUpdate').textContent = `Última actualización: ${now.toLocaleTimeString('es-CL')}`;
    document.getElementById('refreshTime').textContent = `Actualizado: ${now.toLocaleString('es-CL')}`;

    log('✅', 'Dashboard cargado exitosamente!');

  } catch (error) {
    log('❌', 'ERROR CRÍTICO:', error.message);
    console.error('Stack trace:', error);
    
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3>Error al cargar datos</h3>
        <p style="color: white; margin: 10px 0;">${error.message}</p>
        <button onclick="cargarDatos()" style="margin-top: 20px; padding: 10px 20px; background: white; border: none; border-radius: 10px; cursor: pointer;">Reintentar</button>
        <details style="margin-top: 20px; text-align: left; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px;">
          <summary style="cursor: pointer; color: white;">Ver detalles técnicos</summary>
          <pre style="color: white; font-size: 10px; overflow-x: auto;">${error.stack}</pre>
        </details>
      </div>
    `;
  }
}

async function fetchFromProxy(tableId) {
  try {
    const url = `/api/airtable?action=getRecords&tableId=${tableId}`;
    log('🌐', `Fetching: ${url}`);
    
    const response = await fetch(url);
    
    log('📡', `Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      log('❌', 'Error response:', errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    log('✅', `Tabla ${tableId}: ${data.records?.length || 0} registros`);
    return data.records || [];
  } catch (error) {
    log('❌', `Error en fetchFromProxy(${tableId}):`, error.message);
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
  log('📝', `${anfitrionesData.length} anfitriones en filtro`);
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

  log('🔍', `Filtros aplicados: ${ventasFiltradas.length}/${ventasData.length} ventas`);
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
  mostrarTopClientes(ventasReales);
  mostrarUltimasTransacciones(ventas.slice(0, 10));
  
  log('📊', 'Estadísticas calculadas');
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
    const nombre = anfitrionesMap[anf.id]?.Nombre || 'Desconocido';
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
    const items = venta.fields['Items'] || '';
    
    const regex1 = /(\w+)\s*\(x(\d+)\)/gi;
    let match;
    while ((match = regex1.exec(items)) !== null) {
      const producto = match[1].trim();
      const cantidad = parseInt(match[2]) || 1;
      productosCount[producto] = (productosCount[producto] || 0) + cantidad;
    }
    
    if (Object.keys(productosCount).length === 0 && items) {
      const partes = items.split(',');
      partes.forEach(parte => {
        const nombre = parte.replace(/\([^)]*\)/g, '').trim();
        if (nombre && nombre.length > 0) {
          productosCount[nombre] = (productosCount[nombre] || 0) + 1;
        }
      });
    }
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
          <span style="color: #667eea;">${cantidad} unid.</span>
        </div>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${porcentaje}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function mostrarTopClientes(ventas) {
  const clientesStats = {};

  ventas.forEach(venta => {
    const clienteIds = venta.fields['Cliente'] || [];
    const total = venta.fields['Total Neto Numerico'] || venta.fields['Total de venta'] || 0;

    clienteIds.forEach(id => {
      if (!clientesStats[id]) {
        clientesStats[id] = { total: 0, cantidad: 0, id: id };
      }
      clientesStats[id].total += total;
      clientesStats[id].cantidad += 1;
    });
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
    const nombre = clientesMap[cli.id]?.Nombre || 'Cliente desconocido';
    return `
      <div class="ranking-item">
        <div class="ranking-name">
          <span class="ranking-medal">${medals[index]}</span>
          <span>${nombre}</span>
        </div>
        <div class="ranking-value">$${Math.round(cli.total).toLocaleString('es-CL')}</div>
      </div>
    `;
  }).join('');
}

function mostrarUltimasTransacciones(ventas) {
  const container = document.getElementById('ultimasTransacciones');
  if (ventas.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay transacciones</p></div>';
    return;
  }

  container.innerHTML = ventas.map(venta => {
    const clienteId = venta.fields['Cliente'] ? venta.fields['Cliente'][0] : null;
    const nombreCliente = clientesMap[clienteId]?.Nombre || 'Sin cliente';
    
    const total = venta.fields['Total Neto Numerico'] || venta.fields['Total de venta'] || 0;
    const items = venta.fields['Items'] || 'Sin items';
    const fecha = venta.fields['Fecha de compra'] ? new Date(venta.fields['Fecha de compra']).toLocaleDateString('es-CL') : 'Sin fecha';
    const esDevolucion = venta.fields['Devolución'] && venta.fields['Devolución'].length > 0;

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
            <span>📅 ${fecha}</span>
            <span style="font-weight: 600; color: #667eea;">$${Math.round(total).toLocaleString('es-CL')}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Inicializar
log('🚀', 'Iniciando aplicación...');
inicializarFechas();
cargarDatos();

// Auto-refresh cada 5 minutos
setInterval(cargarDatos, 300000);