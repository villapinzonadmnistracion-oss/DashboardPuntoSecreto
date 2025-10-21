// api/airtable.js - Proxy seguro para Airtable
export default async function handler(req, res) {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Obtener variables de entorno - USAR LOS NOMBRES CORRECTOS DE VERCEL
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.BASE_ID;

  console.log('🔍 Verificando variables:', {
    hasToken: !!AIRTABLE_TOKEN,
    hasBaseId: !!BASE_ID,
    tokenPreview: AIRTABLE_TOKEN ? AIRTABLE_TOKEN.substring(0, 10) + '...' : 'NO DEFINIDO',
    baseId: BASE_ID || 'NO DEFINIDO'
  });

  // Validar configuración
  if (!AIRTABLE_TOKEN || !BASE_ID) {
    console.error('❌ Variables de entorno faltantes:', {
      hasToken: !!AIRTABLE_TOKEN,
      hasBaseId: !!BASE_ID
    });
    return res.status(500).json({ 
      error: 'Configuración de servidor incompleta',
      details: 'Faltan AIRTABLE_TOKEN o BASE_ID en variables de entorno',
      hasToken: !!AIRTABLE_TOKEN,
      hasBaseId: !!BASE_ID
    });
  }

  try {
    const { action, tableId } = req.query;

    console.log('📥 Request recibido:', { action, tableId });

    if (action === 'getRecords' && tableId) {
      // Obtener registros de una tabla específica
      const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${tableId}`;
      
      console.log('🔄 Fetching from Airtable:', airtableUrl);

      const response = await fetch(airtableUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Airtable error:', response.status, errorText);
        return res.status(response.status).json({ 
          error: 'Error al consultar Airtable',
          status: response.status,
          details: errorText,
          url: airtableUrl
        });
      }

      const data = await response.json();
      console.log('✅ Registros obtenidos:', data.records?.length || 0);
      
      return res.status(200).json(data);
    }

    if (action === 'test') {
      return res.status(200).json({ 
        status: 'OK',
        message: 'API funcionando',
        hasToken: !!AIRTABLE_TOKEN,
        hasBaseId: !!BASE_ID
      });
    }

    return res.status(400).json({ 
      error: 'Acción no válida',
      validActions: ['getRecords', 'test'],
      received: { action, tableId }
    });

  } catch (error) {
    console.error('❌ Error en proxy:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}