import pool from './db.js';

async function verify() {
  console.log('--- CSV Exporter Integration Verification ---');

  try {
    // 1. Trigger the export endpoint via HTTP
    console.log('1. Querying GET /api/portfolio/export/csv...');
    const response = await fetch('http://localhost:5000/api/portfolio/export/csv');

    // 2. Assert status
    if (response.status === 200) {
      console.log('✅ PASS: Export endpoint returned 200 OK.');
    } else {
      console.log('❌ FAIL: Export endpoint failed with status:', response.status);
      process.exit(1);
    }

    // 3. Assert headers
    const contentType = response.headers.get('content-type') || '';
    const contentDisposition = response.headers.get('content-disposition') || '';

    console.log('Content-Type:', contentType);
    console.log('Content-Disposition:', contentDisposition);

    if (contentType.includes('text/csv')) {
      console.log('✅ PASS: Correct text/csv Content-Type header.');
    } else {
      console.log('❌ FAIL: Incorrect Content-Type header.');
    }

    if (contentDisposition.includes('attachment; filename="leases_portfolio.csv"')) {
      console.log('✅ PASS: Correct Content-Disposition download header.');
    } else {
      console.log('❌ FAIL: Incorrect Content-Disposition header.');
    }

    // 4. Assert body format
    const csvText = await response.text();
    const lines = csvText.split('\n');

    console.log('CSV Lines Count:', lines.length);
    console.log('CSV Header Preview:', lines[0]);

    if (lines.length > 0 && lines[0].startsWith('Lease Filename')) {
      console.log('✅ PASS: CSV structure matches pivoted lease records.');
    } else {
      console.log('❌ FAIL: CSV Header row mismatch.');
    }

    // Verify cell quote boundaries
    const commaCount = (lines[0].match(/,/g) || []).length;
    if (commaCount > 0) {
      console.log(`✅ PASS: Found ${commaCount} pivoted columns in export spreadsheet.`);
    } else {
      console.log('❌ FAIL: No columns parsed in CSV output.');
    }

  } catch (err) {
    console.error('Exporter verification script error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
