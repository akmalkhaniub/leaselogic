import pool from './db.js';

async function verify() {
  console.log('--- Grounding Mappings API Verification ---');

  try {
    // 1. Create mock lease
    console.log('1. Creating mock lease...');
    const leaseRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status) 
       VALUES ('grounding_test_lease.pdf', 2048576, 'completed') 
       RETURNING id`
    );
    const leaseId = leaseRes.rows[0].id;

    // 2. Create mock clauses
    console.log('2. Inserting mock clauses...');
    const clause1Res = await pool.query(
      `INSERT INTO clauses (lease_id, clause_number, clause_title, text_content, page_number, chunk_strategy)
       VALUES ($1, 'Section 1.1', 'Parties Involved', 'This lease agreement is made between...', 1, 'clause-boundary')
       RETURNING id`,
      [leaseId]
    );
    const clause2Res = await pool.query(
      `INSERT INTO clauses (lease_id, clause_number, clause_title, text_content, page_number, chunk_strategy)
       VALUES ($1, 'Section 1.2', 'Initial Term', 'The lease term commencement is set to...', 1, 'clause-boundary')
       RETURNING id`,
      [leaseId]
    );
    const clauseId1 = clause1Res.rows[0].id;
    const clauseId2 = clause2Res.rows[0].id;

    // 3. Create mock lease term sheet
    console.log('3. Creating mock lease term sheet...');
    const termRes = await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status, source_clause_ids)
       VALUES ($1, 'tenant_name', 'Tenant Inc. (Citation: Section 1.1)', 0.95, 'unreviewed', $2)
       RETURNING *`,
      [leaseId, [clauseId1]]
    );
    const term = termRes.rows[0];

    // Verify initial state
    console.log('Initial term grounding ids:', term.source_clause_ids);
    if (term.source_clause_ids && term.source_clause_ids.length === 1 && term.source_clause_ids[0] === clauseId1) {
      console.log('✅ PASS: Initial grounding mappings verified.');
    } else {
      console.log('❌ FAIL: Initial grounding mappings mismatch.');
      process.exit(1);
    }

    // 4. PUT updated grounding array via HTTP request
    console.log('4. Triggering PUT /api/leases/:id/terms/:termId/grounding...');
    const updatedIds = [clauseId1, clauseId2];
    const putRes = await fetch(`http://localhost:5000/api/leases/${leaseId}/terms/${term.id}/grounding`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_clause_ids: updatedIds })
    });

    if (putRes.status === 200) {
      console.log('✅ PASS: PUT request completed with 200 OK.');
    } else {
      console.log('❌ FAIL: PUT request failed with status:', putRes.status);
      process.exit(1);
    }

    const updatedTerm = await putRes.json() as any;
    console.log('Updated grounding ids:', updatedTerm.source_clause_ids);

    if (updatedTerm.source_clause_ids && updatedTerm.source_clause_ids.length === 2 && updatedTerm.source_clause_ids.includes(clauseId2)) {
      console.log('✅ PASS: Updated grounding references array returned.');
    } else {
      console.log('❌ FAIL: Mappings update failed in response payload.');
      process.exit(1);
    }

    // 5. Query DB directly to assert changes are persisted
    console.log('5. Querying database directly for verification...');
    const dbRes = await pool.query(
      `SELECT * FROM lease_terms WHERE id = $1`,
      [term.id]
    );
    const dbTerm = dbRes.rows[0];
    if (dbTerm.is_edited === true && dbTerm.source_clause_ids.length === 2) {
      console.log('✅ PASS: Database holds the updated array and sets is_edited to true.');
    } else {
      console.log('❌ FAIL: Database state not updated correctly.');
      process.exit(1);
    }

    // 6. Assert Audit Logs entry
    console.log('6. Checking audit logs for grounding update...');
    const auditRes = await pool.query(
      `SELECT * FROM audit_logs WHERE record_id = $1 AND action = 'update_grounding'`,
      [term.id]
    );

    const rowCount = auditRes.rowCount || 0;
    if (rowCount > 0) {
      const log = auditRes.rows[0];
      console.log('Audit Old Values:', log.old_values);
      console.log('Audit New Values:', log.new_values);
      console.log('✅ PASS: Audit log entry successfully created.');
    } else {
      console.log('❌ FAIL: No audit log found for grounding edit.');
      process.exit(1);
    }

    // 7. Cleanup
    console.log('7. Cleaning up verification mock data...');
    await pool.query('DELETE FROM leases WHERE id = $1', [leaseId]);
    console.log('Cleanup completed successfully.');

  } catch (err) {
    console.error('Grounding verification script error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
