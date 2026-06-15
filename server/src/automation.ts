import pool from './db.js';

export async function runLandRegistryAutomation(leaseId: string) {
  // 1. Fetch the extracted terms from the database to send to the automation worker
  const termsRes = await pool.query(
    `SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1`,
    [leaseId]
  );

  if (termsRes.rowCount === 0) {
    throw new Error(`No terms found for lease ${leaseId}. Process the lease before submitting.`);
  }

  const termsMap: Record<string, string> = {};
  termsRes.rows.forEach(row => {
    // Strip citation suffix if present
    const cleanValue = row.extracted_value.split(' (Citation:')[0];
    termsMap[row.term_name] = cleanValue;
  });

  // 2. Call FastAPI automation endpoint
  const parserUrl = `${process.env.PARSER_URL || 'http://localhost:8000'}/automation/registry`;
  const response = await fetch(parserUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lease_id: leaseId,
      terms: {
        tenant_name: termsMap.tenant_name || 'Unknown',
        landlord_name: termsMap.landlord_name || 'Unknown',
        commencement_date: termsMap.commencement_date || 'Unknown',
        expiration_date: termsMap.expiration_date || 'Unknown',
        initial_rent: termsMap.initial_rent || 'Unknown',
        notes: `Renewal: ${termsMap.renewal_option || 'N/A'}. Break Clause: ${termsMap.break_clause || 'N/A'}. Repairs: ${termsMap.repair_obligations || 'N/A'}.`
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FastAPI automation failed: ${errorText}`);
  }

  const result = await response.json();
  return result;
}
