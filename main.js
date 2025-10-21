// Variables globales
let ventasData = [];
let clientesData = [];
let anfitrionesData = [];
let clientesMap = {};
let anfitrionesMap = {};

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

    // Cargar todas las tablas en paralelo - IDs CORRECTAS
    const [ventas, clientes, anfitriones] = await Promise.all([
      fetchFromProxy('tblC7aADITb6A6iYP'),  // VENTAS ✅
      fetchFromProxy('tblfRI4vdXspaNNlD'),  // CLIENTES ✅
      fetchFromProxy('tblrtLcB3dUASCfnL')   // ANFITRIONES ✅
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

    // Debug: Ver estructura de primera venta
    if (ventasData.length > 0) {
      console.log('📋 Ejemplo de venta:', ventasData[0].fields);
      console.log('📋 Campos disponibles:', Object.keys(ventasData[0].fields));
    }

    // Debug: Ver estructura de clientes
    if (clientesData.length > 0) {
      console.log('👤 Ejemplo de cliente:', clientesData[0].fields);
      console.log('👤 Campos de clientes:', Object.keys(clientesData[0].fields));
    }

    // Debug: Ver estructura de anfitriones
    if (anfitrionesData.length > 0) {
      console.log('🎭 Ejemplo de anfitrión:', anfitrionesData[0].fields);
      console.log('🎭 Campos de anfitriones:', Object.keys(anfitrionesData[0].fields));
    }

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

  // Filtrar por rango de fechas
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

  // Filtrar por anfitrión
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
  // Separar ventas y devoluciones
  const ventasReales = ventas.filter(v => !v.fields['Devolución'] || v.fields['Devolución'].length === 0);
  const devoluciones = ventas.filter(v => v.fields['Devolución'] && v.fields['Devolución'].length > 0);

  console.log(`📊 Ventas reales: ${ventasReales.length}, Devoluciones: ${devoluciones.length}`);

  // KPIs
  const totalVentas = ventasReales.reduce((sum, v) => {
    const total = v.fields['Total Neto Numerico'] || v.fields['Total de venta'] || 0;
    return sum + total;
  }, 0);
  
  const numVentas = ventasReales.length;
  const promedioVenta = numVentas > 0 ? totalVentas / numVentas : 0;
  const tasaDevolucion = ventas.length > 0 ? (devoluciones.length / ventas.length * 100) : 0;

  console.log(`💰 Total ventas calculado: $${totalVentas}`);

  document.getElementById('kpiTotalVentas').textContent = `$${Math.round(totalVentas).toLocaleString('es-CL')}`;
  document.getElementById('kpiPromedioVenta').textContent = `$${Math.round(promedioVenta).toLocaleString('es-CL')}`;
  document.getElementById('kpiNumVentas').textContent = ventas.length;
  document.getElementById('kpiTasaDevolucion').textContent = `${tasaDevolucion.toFixed(1)}%`;

  // Rankings
  mostrarTopAnfitriones(ventasReales);
  mostrarTopProductos(ventasReales);
  mostrarTopClientes(ventasReales);
  mostrarUltimasTransacciones(ventas.slice(0, 10));
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
    // Intentar múltiples campos para obtener el nombre
    const anfitrionData = anfitrionesMap[anf.id];
    const nombre = anfitrionData?.Nombre || 
                   anfitrionData?.Name || 
                   anfitrionData?.['Nombre completo'] ||
                   anfitrionData?.nombre ||
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
    // Buscar TODAS las columnas que empiecen con "Cantidad real de ventas"
    Object.keys(venta.fields).forEach(campo => {
      if (campo.startsWith('Cantidad real de ventas')) {
        const cantidad = parseInt(venta.fields[campo]) || 0;
        
        if (cantidad > 0) {
          // Extraer el nombre del producto del campo
          // "Cantidad real de ventas Parkas" → "Parkas"
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
    // Intentar múltiples campos para obtener el nombre
    const clienteData = clientesMap[cli.id];
    const nombre = clienteData?.Nombre || 
                   clienteData?.Name || 
                   clienteData?.['Nombre completo'] ||
                   clienteData?.nombre ||
                   'Cliente desconocido';
    
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
    const clienteData = clientesMap[clienteId];
    const nombreCliente = clienteData?.Nombre || 
                          clienteData?.Name || 
                          clienteData?.['Nombre completo'] ||
                          clienteData?.nombre ||
                          'Sin cliente';
    
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
inicializarFechas();
cargarDatos();

// Auto-refresh cada 5 minutos
setInterval(cargarDatos, 300000);