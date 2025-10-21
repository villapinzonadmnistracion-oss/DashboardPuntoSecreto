export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Manejar preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtener variables de entorno
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const BASE_ID = process.env.BASE_ID;

    // Log para debugging (visible en Vercel logs)
    console.log('📝 Variables check:', {
      hasToken: !!AIRTABLE_TOKEN,
      tokenPrefix: AIRTABLE_TOKEN ? AIRTABLE_TOKEN.substring(0, 8) : 'MISSING',
      hasBaseId: !!BASE_ID,
      baseId: BASE_ID || 'MISSING'
    });

    // Validar configuración
    if (!AIRTABLE_TOKEN || !BASE_ID) {
      return res.status(500).json({ 
        error: 'Server configuration incomplete',
        details: 'Missing environment variables',
        hasToken: !!AIRTABLE_TOKEN,
        hasBaseId: !!BASE_ID
      });
    }

    // Obtener parámetros de la query
    const { action, tableId } = req.query;

    console.log('📥 Request:', { action, tableId });

    // Test endpoint
    if (action === 'test') {
      return res.status(200).json({ 
        status: 'OK',
        message: 'API is working',
        timestamp: new Date().toISOString()
      });
    }

    // Get records endpoint
    if (action === 'getRecords' && tableId) {
      const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}`;
      
      console.log('🔄 Fetching:', url);

      const response = await fetch(url, {
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
          error: 'Airtable API error',
          status: response.status,
          message: errorText
        });
      }

      const data = await response.json();
      console.log('✅ Records fetched:', data.records?.length || 0);
      
      return res.status(200).json(data);
    }

    // Invalid request
    return res.status(400).json({ 
      error: 'Invalid request',
      validActions: ['test', 'getRecords'],
      received: { action, tableId }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}