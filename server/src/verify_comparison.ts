import pool from './db.js';

async function verify() {
  console.log('--- Cross-Lease Clause Comparison Verification ---');

  try {
    // 1. Insert Lease A
    console.log('1. Creating Lease A...');
    const leaseARes = await pool.query(
      `INSERT INTO leases (filename, file_size, status) 
       VALUES ('test_lease_a.pdf', 524288, 'completed') 
       RETURNING *`
    );
    const leaseA = leaseARes.rows[0];

    // 2. Insert Lease B
    console.log('2. Creating Lease B...');
    const leaseBRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status) 
       VALUES ('test_lease_b.pdf', 655360, 'completed') 
       RETURNING *`
    );
    const leaseB = leaseBRes.rows[0];

    // 3. Create grounding clauses for Lease A and Lease B
    console.log('3. Inserting source clauses...');
    const clauseARes = await pool.query(
      `INSERT INTO clauses (lease_id, clause_number, clause_title, text_content, page_number, chunk_strategy)
       VALUES ($1, 'Section 4.1', 'Rent Payment', 'The Tenant shall pay initial yearly rent of £45,000.', 2, 'clause-boundary')
       RETURNING id`,
      [leaseA.id]
    );
    const clauseAId = clauseARes.rows[0].id;

    const clauseBRes = await pool.query(
      `INSERT INTO clauses (lease_id, clause_number, clause_title, text_content, page_number, chunk_strategy)
       VALUES ($1, 'Section 5', 'Rent Rates', 'Initial annual rate of £52,000 is due starting from commencement.', 3, 'clause-boundary')
       RETURNING id`,
      [leaseB.id]
    );
    const clauseBId = clauseBRes.rows[0].id;

    // 4. Create terms for Lease A and Lease B
    console.log('4. Creating matching terms...');
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status, source_clause_ids)
       VALUES ($1, 'initial_rent', '£45,000 per annum', 0.98, 'approved', $2)`,
      [leaseA.id, [clauseAId]]
    );

    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status, source_clause_ids)
       VALUES ($1, 'initial_rent', '£52,000 per annum', 0.95, 'unreviewed', $2)`,
      [leaseB.id, [clauseBId]]
    );

    // 5. Query the comparison API
    console.log('\n5. Querying comparison API endpoint...');
    const res = await fetch('http://localhost:5000/api/leases/compare/terms/initial_rent');
    const data = (await res.json()) as any;
    console.log('API Response count:', data.length);
    console.log('Lease A entry:', data.find((item: any) => item.lease_id === leaseA.id));
    console.log('Lease B entry:', data.find((item: any) => item.lease_id === leaseB.id));

    // Assertions
    const leaseAData = data.find((item: any) => item.lease_id === leaseA.id);
    const leaseBData = data.find((item: any) => item.lease_id === leaseB.id);

    if (leaseAData && leaseBData) {
      console.log('✅ PASS: Both leases are returned in the comparison results.');
    } else {
      console.log('❌ FAIL: Missing lease data in comparison API response.');
    }

    if (leaseAData.clauses[0].text_content.includes('£45,000') && leaseBData.clauses[0].text_content.includes('£52,000')) {
      console.log('✅ PASS: Grounding clauses successfully resolved and returned.');
    } else {
      console.log('❌ FAIL: Grounding clauses were not resolved correctly.');
    }

    // 6. Cleanup
    console.log('\n6. Cleaning up test data...');
    await pool.query('DELETE FROM leases WHERE id IN ($1, $2)', [leaseA.id, leaseB.id]);
    console.log('Cleanup complete.');

  } catch (err) {
    console.error('Verification script failed:', err);
  } finally {
    await pool.end();
  }
}

verify();
