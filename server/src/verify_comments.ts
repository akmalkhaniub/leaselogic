import pool from './db.js';

// We can run these assertions against the database directly to test table schema and data mapping
async function runVerification() {
  console.log('----------------------------------------------------');
  console.log('🧪 RUNNING SYSTEM REVIEWER COMMENTS & AUDIT TRAIL VERIFICATION');
  console.log('----------------------------------------------------');

  try {
    // 1. Get or create a dummy lease
    let leaseId: number;
    const leasesRes = await pool.query("SELECT id FROM leases LIMIT 1");
    if (leasesRes.rows.length > 0) {
      leaseId = leasesRes.rows[0].id;
      console.log(`✅ Using existing lease ID: ${leaseId}`);
    } else {
      const insertLease = await pool.query(
        "INSERT INTO leases (filename, file_size, status) VALUES ($1, $2, $3) RETURNING id",
        ['verification_test_lease.pdf', 1024, 'completed']
      );
      leaseId = insertLease.rows[0].id;
      console.log(`✅ Created dummy lease ID: ${leaseId}`);
    }

    const testTermName = 'verification_test_term_name';
    const testReviewer = 'Automated Verification Agent';
    const testComment = 'Verifying that Comments and Audit Trail flow correctly.';

    // Clear any previous test comments/audit logs for this lease
    await pool.query("DELETE FROM reviewer_comments WHERE lease_id = $1", [leaseId]);
    await pool.query("DELETE FROM audit_logs WHERE lease_id = $1 AND action = $2", [leaseId, 'add_comment']);
    console.log('🧹 Cleaned up any old test data.');

    // 2. Test reviewer comments table insertion
    console.log('📝 Testing DB insertion into reviewer_comments...');
    const commentInsertRes = await pool.query(
      `INSERT INTO reviewer_comments (lease_id, term_name, reviewer_name, comment_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [leaseId, testTermName, testReviewer, testComment]
    );

    if (commentInsertRes.rows.length === 1 && commentInsertRes.rows[0].comment_text === testComment) {
      console.log('✅ reviewer_comments insertion verification PASSED.');
    } else {
      throw new Error('❌ reviewer_comments insertion verification FAILED.');
    }

    const commentId = commentInsertRes.rows[0].id;

    // 3. Test audit_logs table insertion mapping
    console.log('📜 Testing DB insertion into audit_logs...');
    const auditInsertRes = await pool.query(
      `INSERT INTO audit_logs (lease_id, table_name, record_id, action, old_values, new_values)
       VALUES ($1, 'reviewer_comments', $2, 'add_comment', null, $3) RETURNING *`,
      [leaseId, commentId, JSON.stringify({ reviewer_name: testReviewer, term_name: testTermName, comment_text: testComment })]
    );

    if (auditInsertRes.rows.length === 1 && auditInsertRes.rows[0].action === 'add_comment') {
      console.log('✅ audit_logs insertion verification PASSED.');
    } else {
      throw new Error('❌ audit_logs insertion verification FAILED.');
    }

    // 4. Test querying comments list
    console.log('🔍 Testing comments query endpoint logic...');
    const queryComments = await pool.query(
      "SELECT * FROM reviewer_comments WHERE lease_id = $1 AND term_name = $2 ORDER BY created_at DESC",
      [leaseId, testTermName]
    );

    if (queryComments.rows.length > 0 && queryComments.rows[0].reviewer_name === testReviewer) {
      console.log(`✅ Query returned ${queryComments.rows.length} comments. First comment matches test values.`);
    } else {
      throw new Error('❌ Query comments verification FAILED.');
    }

    // 5. Test querying audit logs list
    console.log('🔍 Testing audit logs query endpoint logic...');
    const queryAudit = await pool.query(
      "SELECT * FROM audit_logs WHERE lease_id = $1 ORDER BY id DESC",
      [leaseId]
    );

    if (queryAudit.rows.length > 0) {
      console.log(`✅ Query returned ${queryAudit.rows.length} audit logs. Latest action: ${queryAudit.rows[0].action}`);
    } else {
      throw new Error('❌ Query audit logs verification FAILED.');
    }

    console.log('\n🎉 ALL SYSTEM REVIEWER COMMENTS & AUDIT TRAIL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('\n💥 VERIFICATION PROCESS ENCOUNTERED FAILURE:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection pool closed.');
  }
}

runVerification();
