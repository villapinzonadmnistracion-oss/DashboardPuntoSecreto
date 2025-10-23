// chatbot.js - Asistente Virtual Inteligente con ChatGPT

const OPENAI_API_KEY = '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';

let chatHistory = [];

function inicializarAsistenteVirtual() {
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatMessages = document.getElementById('chatMessages');

  // Verificar que los elementos existan
  if (!chatInput || !sendBtn || !chatMessages) {
    console.error('❌ Elementos del chat no encontrados');
    return;
  }

  // Mensaje de bienvenida
  agregarMensaje('asistente', '¡Hola! 👋 Soy tu asistente virtual de Punto Secreto. Puedo ayudarte con información sobre ventas, productos, anfitriones y clientes. ¿En qué te puedo ayudar?');

  // Enviar mensaje al presionar Enter
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensajeAsistente();
    }
  });

  // Enviar mensaje al hacer clic en el botón
  sendBtn.addEventListener('click', enviarMensajeAsistente);
}

function agregarMensaje(tipo, contenido) {
  const chatMessages = document.getElementById('chatMessages');
  
  const mensajeDiv = document.createElement('div');
  mensajeDiv.className = `chat-message ${tipo}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.textContent = tipo === 'usuario' ? '👤' : '🤖';
  
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.innerHTML = contenido;
  
  mensajeDiv.appendChild(avatar);
  mensajeDiv.appendChild(bubble);
  
  chatMessages.appendChild(mensajeDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function enviarMensajeAsistente() {
  const chatInput = document.getElementById('chatInput');
  const mensaje = chatInput.value.trim();
  
  if (!mensaje) return;
  
  // Mostrar mensaje del usuario
  agregarMensaje('usuario', mensaje);
  chatInput.value = '';
  
  // Mostrar indicador de carga
  agregarMensaje('asistente', '💭 Analizando...');
  
  try {
    // Preparar contexto de datos
    const contexto = prepararContextoDatos();
    
    // Llamar a ChatGPT
    const respuesta = await obtenerRespuestaChatGPT(mensaje, contexto);
    
    // Remover indicador de carga
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.removeChild(chatMessages.lastChild);
    
    // Mostrar respuesta del asistente
    agregarMensaje('asistente', respuesta);
    
  } catch (error) {
    console.error('Error al obtener respuesta:', error);
    
    // Remover indicador de carga
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.removeChild(chatMessages.lastChild);
    
    // Respuesta de fallback
    const respuestaFallback = generarRespuestaLocal(mensaje);
    agregarMensaje('asistente', respuestaFallback);
  }
}

function prepararContextoDatos() {
  // Preparar resumen de datos para el contexto de ChatGPT
  const fechaDesde = document.getElementById('fechaDesde').value;
  const fechaHasta = document.getElementById('fechaHasta').value;
  
  let contexto = `Eres un asistente virtual para el Dashboard de Punto Secreto (negocio chileno). Ayudas a analizar datos de ventas en pesos chilenos (CLP). Usa lenguaje natural y cercano.\n\n`;
  
  // Agregar período actual
  if (fechaDesde && fechaHasta) {
    const desde = new Date(fechaDesde).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    const hasta = new Date(fechaHasta).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    contexto += `Período analizado: ${desde} al ${hasta}\n\n`;
  }
  
  // KPIs principales
  const totalVentas = document.getElementById('kpiTotalVentas')?.textContent || '0';
  const promedioVenta = document.getElementById('kpiPromedioVenta')?.textContent || '0';
  const numVentas = document.getElementById('kpiNumVentas')?.textContent || '0';
  const tasaDevolucion = document.getElementById('kpiTasaDevolucion')?.textContent || '0%';
  
  contexto += `MÉTRICAS ACTUALES:\n`;
  contexto += `- Total de ventas: $${totalVentas} CLP\n`;
  contexto += `- Promedio por venta: $${promedioVenta} CLP\n`;
  contexto += `- Número de transacciones: ${numVentas}\n`;
  contexto += `- Tasa de devolución: ${tasaDevolucion}\n\n`;
  
  // Top anfitriones
  const rankingAnfitriones = document.getElementById('rankingAnfitriones');
  if (rankingAnfitriones && rankingAnfitriones.children.length > 0) {
    contexto += `TOP ANFITRIONES:\n`;
    Array.from(rankingAnfitriones.children).slice(0, 3).forEach((item, index) => {
      const nombre = item.querySelector('.ranking-name span:last-child')?.textContent || '';
      const valor = item.querySelector('.ranking-value')?.textContent || '';
      if (nombre) {
        contexto += `${index + 1}. ${nombre}: ${valor}\n`;
      }
    });
    contexto += '\n';
  }
  
  // Top productos
  const topProductos = document.getElementById('topProductos');
  if (topProductos && topProductos.children.length > 0) {
    contexto += `TOP PRODUCTOS MÁS VENDIDOS:\n`;
    Array.from(topProductos.children).slice(0, 3).forEach((item, index) => {
      const nombre = item.querySelector('.product-name span:first-child')?.textContent || '';
      const cantidad = item.querySelector('.product-name span:last-child')?.textContent || '';
      if (nombre) {
        contexto += `${index + 1}. ${nombre}: ${cantidad}\n`;
      }
    });
    contexto += '\n';
  }
  
  // Top clientes
  const topClientes = document.getElementById('topClientes');
  if (topClientes && topClientes.children.length > 0) {
    contexto += `TOP CLIENTES:\n`;
    Array.from(topClientes.children).slice(0, 3).forEach((item, index) => {
      const nombre = item.querySelector('.ranking-name span:last-child')?.textContent || '';
      const valor = item.querySelector('.ranking-value')?.textContent || '';
      if (nombre) {
        contexto += `${index + 1}. ${nombre}: ${valor}\n`;
      }
    });
    contexto += '\n';
  }
  
  contexto += `INSTRUCCIONES:\n`;
  contexto += `- Responde de manera concisa (máximo 3-4 líneas)\n`;
  contexto += `- Usa emojis relevantes para hacer las respuestas más amigables\n`;
  contexto += `- Formatea números con separadores de miles: 12.345 en lugar de 12345\n`;
  contexto += `- Si preguntan por un nombre específico que no aparece en los datos, di que no encontraste esa información\n`;
  contexto += `- Ofrece insights útiles cuando sea posible\n`;
  contexto += `- Usa formato HTML básico: <strong> para resaltar, <br> para saltos de línea`;
  
  return contexto;
}

async function obtenerRespuestaChatGPT(pregunta, contexto) {
  const mensajes = [
    {
      role: 'system',
      content: contexto
    },
    ...chatHistory,
    {
      role: 'user',
      content: pregunta
    }
  ];
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: mensajes,
      max_tokens: 250,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Error de OpenAI:', errorData);
    throw new Error(`Error de OpenAI: ${response.status}`);
  }
  
  const data = await response.json();
  const respuesta = data.choices[0].message.content;
  
  // Guardar en historial (máximo 10 intercambios = 20 mensajes)
  chatHistory.push({ role: 'user', content: pregunta });
  chatHistory.push({ role: 'assistant', content: respuesta });
  
  if (chatHistory.length > 20) {
    chatHistory = chatHistory.slice(-20);
  }
  
  return respuesta;
}

function generarRespuestaLocal(pregunta) {
  // Respuestas locales como fallback si falla ChatGPT
  const preguntaLower = pregunta.toLowerCase();
  
  // Ventas totales
  if (preguntaLower.includes('cuánto') && (preguntaLower.includes('vend') || preguntaLower.includes('ventas') || preguntaLower.includes('total'))) {
    const totalVentas = document.getElementById('kpiTotalVentas')?.textContent || '0';
    return `💰 En el período seleccionado, las ventas totales son de <strong>$${totalVentas}</strong>.`;
  }
  
  // Producto más vendido
  if (preguntaLower.includes('producto') && (preguntaLower.includes('más') || preguntaLower.includes('mejor') || preguntaLower.includes('top'))) {
    const topProductos = document.getElementById('topProductos');
    if (topProductos && topProductos.children.length > 0) {
      const primerProducto = topProductos.children[0];
      const nombre = primerProducto.querySelector('.product-name span:first-child')?.textContent || '';
      const cantidad = primerProducto.querySelector('.product-name span:last-child')?.textContent || '';
      return `📦 El producto más vendido es <strong>${nombre}</strong> con ${cantidad}.`;
    }
    return '📦 No hay datos de productos disponibles para el período seleccionado.';
  }
  
  // Mejor anfitrión
  if (preguntaLower.includes('anfitrión') || preguntaLower.includes('anfitrion')) {
    const rankingAnfitriones = document.getElementById('rankingAnfitriones');
    if (rankingAnfitriones && rankingAnfitriones.children.length > 0) {
      const primerAnfitrion = rankingAnfitriones.children[0];
      const nombre = primerAnfitrion.querySelector('.ranking-name span:last-child')?.textContent || '';
      const valor = primerAnfitrion.querySelector('.ranking-value')?.textContent || '';
      return `🏆 El mejor anfitrión es <strong>${nombre}</strong> con ventas de ${valor}.`;
    }
    return '🏆 No hay datos de anfitriones disponibles para el período seleccionado.';
  }
  
  // Promedio
  if (preguntaLower.includes('promedio') || preguntaLower.includes('ticket')) {
    const promedioVenta = document.getElementById('kpiPromedioVenta')?.textContent || '0';
    return `📊 El ticket promedio de venta es de <strong>$${promedioVenta}</strong>.`;
  }
  
  // Transacciones
  if (preguntaLower.includes('transaccion') || preguntaLower.includes('número') || preguntaLower.includes('cuántas')) {
    const numVentas = document.getElementById('kpiNumVentas')?.textContent || '0';
    return `🛍️ Se realizaron <strong>${numVentas} transacciones</strong> en el período seleccionado.`;
  }
  
  // Devoluciones
  if (preguntaLower.includes('devoluci')) {
    const tasaDevolucion = document.getElementById('kpiTasaDevolucion')?.textContent || '0%';
    return `↩️ La tasa de devolución actual es del <strong>${tasaDevolucion}</strong>.`;
  }
  
  // Clientes
  if (preguntaLower.includes('cliente')) {
    const topClientes = document.getElementById('topClientes');
    if (topClientes && topClientes.children.length > 0) {
      const primerCliente = topClientes.children[0];
      const nombre = primerCliente.querySelector('.ranking-name span:last-child')?.textContent || '';
      const valor = primerCliente.querySelector('.ranking-value')?.textContent || '';
      return `👑 El cliente que más ha comprado es <strong>${nombre}</strong> con ${valor}.`;
    }
    return '👥 No hay datos de clientes disponibles para el período seleccionado.';
  }
  
  // Respuesta por defecto
  return `🤖 Puedo ayudarte con información sobre:<br><br>
    • 💰 Ventas totales y promedios<br>
    • 📦 Productos más vendidos<br>
    • 🏆 Mejores anfitriones<br>
    • 👥 Clientes destacados<br>
    • 📊 Análisis de tendencias<br><br>
    ¿Sobre qué te gustaría saber más?`;
}

// Hacer la función disponible globalmente
window.enviarMensajeAsistente = enviarMensajeAsistente;