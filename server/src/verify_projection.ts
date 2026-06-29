import pool from './db.js';
import { getRentProjection } from './rent_projection.js';

async function verify() {
  console.log('--- Rent Projection Engine Verification ---');

  try {
    // 1. Create a mock lease
    console.log('1. Creating mock lease...');
    const leaseRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status) 
       VALUES ('test_projection_lease.pdf', 1048576, 'completed') 
       RETURNING *`
    );
    const lease = leaseRes.rows[0];

    // 2. Insert terms for the mock lease
    console.log('2. Inserting terms for compound escalation...');
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status)
       VALUES 
         ($1, 'initial_rent', '£120,000 per annum, payable monthly', 0.95, 'approved'),
         ($1, 'rent_escalation', 'Rent increases annually by exactly 3.0% over the previous year.', 0.95, 'approved'),
         ($1, 'commencement_date', 'October 1, 2026', 0.95, 'approved'),
         ($1, 'expiration_date', 'September 30, 2031', 0.95, 'approved')`,
      [lease.id]
    );

    // 3. Test direct function calculation
    console.log('3. Running direct projection calculation...');
    const projection = await getRentProjection(lease.id);

    console.log('Currency parsed:', projection.currency);
    console.log('Duration Years:', projection.duration_years);
    console.log('Initial Annual Rent:', projection.initial_rent_annual);
    console.log('Escalation Type:', projection.escalation_type);
    console.log('Escalation Rate:', projection.escalation_rate);
    console.log('Total Cumulative Rent:', projection.total_rent_cumulative);

    // Assertions for Direct function
    if (projection.currency === '£' && projection.duration_years === 5 && projection.initial_rent_annual === 120000) {
      console.log('✅ PASS: Basic metadata parsed correctly.');
    } else {
      console.log('❌ FAIL: Basic metadata mismatch.');
    }

    if (projection.schedule.length === 5 && projection.schedule[4].annual_rent === 135061.06 && projection.total_rent_cumulative === 637096.3) {
      console.log('✅ PASS: Compound escalation math compounds correctly.');
    } else {
      console.log('❌ FAIL: Compound math mismatch. Expected Year 5 annual rent of 135061.06, got:', projection.schedule[4]?.annual_rent);
    }

    // 4. Test flat escalation
    console.log('\n4. Testing flat escalation rule...');
    // Update the escalation to a flat amount
    await pool.query(
      `UPDATE lease_terms SET extracted_value = 'Rent increases by exactly £5,000 each year.'
       WHERE lease_id = $1 AND term_name = 'rent_escalation'`,
      [lease.id]
    );

    const flatProjection = await getRentProjection(lease.id);
    console.log('Flat Escalation Type:', flatProjection.escalation_type);
    console.log('Flat Escalation Rate:', flatProjection.escalation_rate);
    console.log('Flat Year 5 Rent:', flatProjection.schedule[4].annual_rent);
    console.log('Flat Total Cumulative:', flatProjection.total_rent_cumulative);

    if (flatProjection.escalation_type === 'flat' && flatProjection.schedule[4].annual_rent === 140000 && flatProjection.total_rent_cumulative === 650000) {
      console.log('✅ PASS: Flat escalation math adds up correctly.');
    } else {
      console.log('❌ FAIL: Flat math mismatch.');
    }

    // 5. Query the API endpoint
    console.log('\n5. Querying the REST API endpoint...');
    const response = await fetch(`http://localhost:5000/api/leases/${lease.id}/rent-projection`);
    const apiData = (await response.json()) as any;

    if (response.ok && apiData.schedule && apiData.schedule.length === 5) {
      console.log('✅ PASS: REST API endpoint returned valid JSON schedule.');
    } else {
      console.log('❌ FAIL: API endpoint returned error or invalid format.');
    }

    // 6. Cleanup
    console.log('\n6. Cleaning up test data...');
    await pool.query('DELETE FROM leases WHERE id = $1', [lease.id]);
    console.log('Cleanup complete.');

  } catch (err) {
    console.error('Projection verification script error:', err);
  } finally {
    await pool.end();
  }
}

verify();
