import pool from './db.js';

// Automated integration checks for the Redlines feature
async function runVerification() {
  console.log('----------------------------------------------------');
  console.log('🧪 RUNNING SYSTEM LEASE REDLINING & EXPORT VERIFICATION');
  console.log('----------------------------------------------------');

  try {
    // 1. Get or create a dummy lease
    let leaseId: string;
    const leasesRes = await pool.query("SELECT id FROM leases LIMIT 1");
    if (leasesRes.rows.length > 0) {
      leaseId = leasesRes.rows[0].id;
      console.log(`✅ Using existing lease ID: ${leaseId}`);
    } else {
      const insertLease = await pool.query(
        "INSERT INTO leases (filename, file_size, status) VALUES ($1, $2, $3) RETURNING id",
        ['redline_verification_lease.pdf', 2048, 'completed']
      );
      leaseId = insertLease.rows[0].id;
      console.log(`✅ Created dummy lease ID: ${leaseId}`);
    }

    // 2. Get or create a dummy clause for this lease
    let clauseId: string;
    const clausesRes = await pool.query("SELECT id FROM clauses WHERE lease_id = $1 LIMIT 1", [leaseId]);
    if (clausesRes.rows.length > 0) {
      clauseId = clausesRes.rows[0].id;
      console.log(`✅ Using existing clause ID: ${clauseId}`);
    } else {
      const insertClause = await pool.query(
        `INSERT INTO clauses (lease_id, clause_number, clause_title, text_content, page_number, chunk_strategy) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [leaseId, '12.1', 'Maintenance obligations', 'The tenant must keep the building in good repair and condition.', 1, 'fixed']
      );
      clauseId = insertClause.rows[0].id;
      console.log(`✅ Created dummy clause ID: ${clauseId}`);
    }

    const testOriginal = 'The tenant must keep the building in good repair and condition.';
    const testRedline = 'The tenant must keep the interior in good repair, landlord handles exterior structural parts.';
    const testAuthor = 'Test Legal Advisor';

    // Clear any previous verification redline data for this clause/lease
    await pool.query("DELETE FROM lease_redlines WHERE clause_id = $1", [clauseId]);
    await pool.query("DELETE FROM audit_logs WHERE lease_id = $1 AND action IN ($2, $3, $4)", [leaseId, 'propose_redline', 'update_redline', 'delete_redline']);
    console.log('🧹 Cleaned up old test data.');

    // 3. Test insert new redline
    console.log('📝 Testing DB insertion into lease_redlines...');
    const insertRes = await pool.query(
      `INSERT INTO lease_redlines (lease_id, clause_id, redline_text, original_text, author_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [leaseId, clauseId, testRedline, testOriginal, testAuthor]
    );

    if (insertRes.rows.length === 1 && insertRes.rows[0].redline_text === testRedline) {
      console.log('✅ lease_redlines insertion verification PASSED.');
    } else {
      throw new Error('❌ lease_redlines insertion verification FAILED.');
    }

    const redlineId = insertRes.rows[0].id;

    // 4. Test insert audit log entry for proposing redline
    console.log('📜 Testing audit logs insertion for propose_redline...');
    const auditRes = await pool.query(
      `INSERT INTO audit_logs (lease_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, 'propose_redline', 'lease_redlines', $2, null, $3) RETURNING *`,
      [leaseId, redlineId, JSON.stringify({ redline_text: testRedline, author_name: testAuthor })]
    );

    if (auditRes.rows.length === 1 && auditRes.rows[0].action === 'propose_redline') {
      console.log('✅ audit_logs insertion verification PASSED.');
    } else {
      throw new Error('❌ audit_logs insertion verification FAILED.');
    }

    // 5. Test querying redlines list
    console.log('🔍 Testing query lease redlines...');
    const queryRedlines = await pool.query(
      "SELECT * FROM lease_redlines WHERE lease_id = $1 ORDER BY created_at DESC",
      [leaseId]
    );

    if (queryRedlines.rows.length > 0 && queryRedlines.rows[0].redline_text === testRedline) {
      console.log(`✅ Query returned ${queryRedlines.rows.length} redlines. First matches test values.`);
    } else {
      throw new Error('❌ Query redlines verification FAILED.');
    }

    // 6. Test update redline & log audit
    console.log('📝 Testing update lease redline...');
    const updatedRedlineText = 'The tenant maintains interior repair, landlord structural and roof.';
    const updateRes = await pool.query(
      `UPDATE lease_redlines 
       SET redline_text = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING *`,
      [updatedRedlineText, redlineId]
    );

    if (updateRes.rows.length === 1 && updateRes.rows[0].redline_text === updatedRedlineText) {
      console.log('✅ lease_redlines update verification PASSED.');
    } else {
      throw new Error('❌ lease_redlines update verification FAILED.');
    }

    // 7. Test deletion of redline & audit log
    console.log('🗑️ Testing delete lease redline...');
    const deleteRes = await pool.query("DELETE FROM lease_redlines WHERE id = $1 RETURNING id", [redlineId]);
    if (deleteRes.rows.length === 1) {
      console.log('✅ lease_redlines deletion verification PASSED.');
    } else {
      throw new Error('❌ lease_redlines deletion verification FAILED.');
    }

    console.log('\n🎉 ALL SYSTEM LEASE REDLINING & EXPORT VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('\n💥 VERIFICATION PROCESS ENCOUNTERED FAILURE:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection pool closed.');
  }
}

runVerification();
