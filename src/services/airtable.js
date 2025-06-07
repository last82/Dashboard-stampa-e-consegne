const AIRTABLE_BASE_ID = 'appkaYhl810WwG7jf';
const AIRTABLE_TOKEN = 'patnhoUAqDz44YP5G.bc379a3490a179c8d37c0c9f5ea18d1f0379e901297137c8bc10ede9624b8135';
const TIMELINE_TABLE = 'tblWW6GJIxgZR8hp8';
const PRESCRIZIONI_TABLE = 'tblM2RwtcSmfw7OTs';

async function fetchAirtableData(baseId, table, token) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data.records || [];
    } catch (error) {
        console.error('Errore API:', error);
        return [];
    }
}

async function updateAirtableRecord(baseId, table, token, recordId, fields) {
    try {
        console.log('🔄 Tentativo aggiornamento Airtable:', { recordId, fields });
        const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields })
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Errore Airtable:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`Airtable error ${response.status}: ${JSON.stringify(errorData)}`);
        }
        const result = await response.json();
        console.log('✅ Aggiornamento riuscito:', result);
        return result;
    } catch (error) {
        console.error('❌ Errore completo updateAirtableRecord:', error);
        throw error;
    }
}
