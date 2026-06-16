import pool from './db.js';

async function verify() {
  console.log('--- Observability Verification Script ---');
  
  try {
    // 1. Create a dummy lease
    console.log('1. Creating a dummy lease...');
    const leaseRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status) 
       VALUES ('test_verification_lease.pdf', 1048576, 'completed') 
       RETURNING *`
    );
    const lease = leaseRes.rows[0];
    console.log('Created lease:', lease.id);

    // 2. Create a dummy abstraction job with stats
    console.log('2. Creating a dummy abstraction job...');
    const jobRes = await pool.query(
      `INSERT INTO abstraction_jobs (lease_id, status, input_tokens, output_tokens, processing_time_ms, api_cost)
       VALUES ($1, 'completed', 5000, 1000, 8500, 0.001350)
       RETURNING *`,
      [lease.id]
    );
    console.log('Created job with cost $0.001350 and latency 8.5s');

    // 3. Create a dummy lease term (unreviewed, is_edited = false)
    console.log('3. Creating a dummy lease term...');
    const termRes = await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status, is_edited)
       VALUES ($1, 'tenant_name', 'Acme Corp Inc.', 0.95, 'unreviewed', FALSE)
       RETURNING *`,
      [lease.id]
    );
    const term = termRes.rows[0];
    console.log('Created term:', term.id, 'value:', term.extracted_value);

    // 4. Fetch initial stats
    console.log('\n4. Fetching initial stats...');
    const statsRes1 = await fetch('http://localhost:5000/api/observability/stats');
    const stats1 = await statsRes1.json();
    console.log('Initial stats - total cost:', stats1.total_cost, 'accuracy rate:', stats1.accuracy_rate);

    // 5. Simulate human reviewer editing the term
    console.log('\n5. Editing term value...');
    const editRes = await fetch(`http://localhost:5000/api/leases/${lease.id}/terms/${term.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extracted_value: 'Acme Corp International LLC',
        reviewer_status: 'approved'
      })
    });
    const updatedTerm = await editRes.json();
    console.log('Updated term - is_edited:', updatedTerm.is_edited, 'reviewer_status:', updatedTerm.reviewer_status);

    // 6. Fetch stats again
    console.log('\n6. Fetching updated stats...');
    const statsRes2 = await fetch('http://localhost:5000/api/observability/stats');
    const stats2 = await statsRes2.json();
    console.log('Updated stats - total cost:', stats2.total_cost, 'accuracy rate:', stats2.accuracy_rate);
    console.log('Latest audit log entry:', stats2.audit_logs[0]);

    // Check assertions
    if (updatedTerm.is_edited === true) {
      console.log('✅ PASS: Term flagged as edited.');
    } else {
      console.log('❌ FAIL: Term is_edited flag was not set to true.');
    }

    if (stats2.accuracy_rate < 100.0) {
      console.log('✅ PASS: Accuracy rate reflects edited term.');
    } else {
      console.log('❌ FAIL: Accuracy rate did not reflect the edited term.');
    }

    // 7. Cleanup
    console.log('\n7. Cleaning up test data...');
    await pool.query('DELETE FROM leases WHERE id = $1', [lease.id]);
    console.log('Cleanup complete.');

  } catch (err) {
    console.error('Verification failed with error:', err);
  } finally {
    await pool.end();
  }
}

verify();
