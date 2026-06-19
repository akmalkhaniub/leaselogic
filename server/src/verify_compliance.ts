import pool from './db.js';

async function verify() {
  console.log('--- Compliance Risk Auditor Rules Engine Verification ---');

  try {
    // 1. Create a mock lease
    console.log('1. Creating mock lease...');
    const leaseRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status) 
       VALUES ('test_compliance_lease.pdf', 1048576, 'completed') 
       RETURNING *`
    );
    const lease = leaseRes.rows[0];

    // 2. Create grounding clauses
    console.log('2. Inserting mock clauses...');
    const clauseRes = await pool.query(
      `INSERT INTO clauses (lease_id, clause_number, clause_title, text_content, page_number, chunk_strategy)
       VALUES ($1, 'Section 15', 'Insurance', 'Tenant must maintain public liability insurance of at least $2,000,000.', 4, 'clause-boundary')
       RETURNING id`,
      [lease.id]
    );
    const clauseId = clauseRes.rows[0].id;

    // 3. Create terms representing a non-compliant lease
    console.log('3. Inserting terms for non-compliant lease...');
    
    // Low insurance: $2M instead of $5M -> should FAIL
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status, source_clause_ids)
       VALUES ($1, 'indemnity_covenants', '$2,000,000 coverage limit', 0.95, 'approved', $2)`,
      [lease.id, [clauseId]]
    );

    // Early expiry: 2026 instead of 2028 -> should FAIL
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status)
       VALUES ($1, 'expiration_date', 'December 31, 2026', 0.99, 'approved')`,
      [lease.id]
    );

    // No break clause -> should WARN
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status)
       VALUES ($1, 'break_clause', 'None. The tenant has no right to terminate early.', 0.90, 'approved')`,
      [lease.id]
    );

    // Tenant assigned structural roof repairs -> should FAIL
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status)
       VALUES ($1, 'repair_obligations', 'Tenant is responsible for structural roof maintenance.', 0.95, 'approved')`,
      [lease.id]
    );

    // 4. Query compliance API
    console.log('\n4. Querying compliance audit API...');
    const response = await fetch('http://localhost:5000/api/compliance/audit');
    const report = (await response.json()) as any;
    
    const leaseReport = report.filter((item: any) => item.lease_id === lease.id);
    console.log('Total rules evaluated for test lease:', leaseReport.length);

    // Validate rules outcomes
    const insuranceRule = leaseReport.find((r: any) => r.rule_id === 'min_insurance');
    const expiryRule = leaseReport.find((r: any) => r.rule_id === 'expiry_check');
    const breakRule = leaseReport.find((r: any) => r.rule_id === 'break_clause');
    const repairRule = leaseReport.find((r: any) => r.rule_id === 'repair_responsibility');

    console.log('Insurance Rule Status:', insuranceRule?.status, '-', insuranceRule?.message);
    console.log('Expiry Rule Status:', expiryRule?.status, '-', expiryRule?.message);
    console.log('Break Rule Status:', breakRule?.status, '-', breakRule?.message);
    console.log('Repair Rule Status:', repairRule?.status, '-', repairRule?.message);

    // Assertions
    if (insuranceRule && insuranceRule.status === 'fail') {
      console.log('✅ PASS: Insurance rule correctly flagged limit below $5M as FAIL.');
    } else {
      console.log('❌ FAIL: Insurance rule validation failed.');
    }

    if (expiryRule && expiryRule.status === 'fail') {
      console.log('✅ PASS: Expiry rule correctly flagged year 2026 as FAIL.');
    } else {
      console.log('❌ FAIL: Expiry rule validation failed.');
    }

    if (breakRule && breakRule.status === 'warn') {
      console.log('✅ PASS: Break rule correctly flagged missing clause as WARN.');
    } else {
      console.log('❌ FAIL: Break rule validation failed.');
    }

    if (repairRule && repairRule.status === 'fail') {
      console.log('✅ PASS: Repair rule correctly flagged tenant structural repairs as FAIL.');
    } else {
      console.log('❌ FAIL: Repair rule validation failed.');
    }

    // 5. Cleanup
    console.log('\n5. Cleaning up test database entries...');
    await pool.query('DELETE FROM leases WHERE id = $1', [lease.id]);
    console.log('Cleanup complete.');

  } catch (err) {
    console.error('Compliance verification script error:', err);
  } finally {
    await pool.end();
  }
}

verify();
