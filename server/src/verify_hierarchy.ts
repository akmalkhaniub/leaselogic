import pool from './db.js';

// Automated integration checks for the Multi-Document Lease Relationship & Net Effective Terms feature
async function runVerification() {
  console.log('----------------------------------------------------');
  console.log('🧪 RUNNING SYSTEM LEASE RELATIONSHIPS & MERGE VERIFICATION');
  console.log('----------------------------------------------------');

  try {
    // 1. Create a dummy parent lease
    console.log('📁 Creating dummy parent lease...');
    const parentLeaseRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status, document_type) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['verification_parent_lease.pdf', 1024, 'completed', 'original_lease']
    );
    const parentId = parentLeaseRes.rows[0].id;

    // 2. Create a dummy child amendment lease
    console.log('📄 Creating dummy child amendment lease...');
    const childLeaseRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status, document_type, parent_lease_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['verification_amendment_1.pdf', 512, 'completed', 'amendment', parentId]
    );
    const childId = childLeaseRes.rows[0].id;

    // Clean up helper to prevent leftover test records on exit/failure
    const cleanUp = async () => {
      await pool.query("DELETE FROM lease_terms WHERE lease_id IN ($1, $2)", [parentId, childId]);
      await pool.query("DELETE FROM leases WHERE id IN ($1, $2)", [parentId, childId]);
      await pool.query("DELETE FROM audit_logs WHERE lease_id IN ($1, $2)", [parentId, childId]);
      console.log('🧹 Cleaned up verification database records.');
    };

    // 3. Populate terms for parent (Initial Rent = $5,000, Expiration = 2025-12-31)
    console.log('📝 Populating lease terms for parent...');
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score)
       VALUES 
         ($1, 'initial_rent', '$5,000/month', 0.95),
         ($1, 'expiration_date', 'December 31, 2025', 0.92)`,
      [parentId]
    );

    // 4. Populate overridden terms for child (Expiration extended to 2028-12-31)
    console.log('📝 Populating lease terms for child amendment...');
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score)
       VALUES 
         ($1, 'expiration_date', 'December 31, 2028', 0.98)`,
      [childId]
    );

    // 5. Test relationship update API logic (change doc type and reset parent)
    console.log('🔄 Testing relationship setting DB update...');
    const updateRes = await pool.query(
      `UPDATE leases 
       SET parent_lease_id = $1, document_type = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [parentId, 'addendum', childId]
    );

    if (updateRes.rows.length === 1 && updateRes.rows[0].document_type === 'addendum') {
      console.log('✅ Update relationship DB mapping PASSED.');
    } else {
      await cleanUp();
      throw new Error('❌ Update relationship DB mapping FAILED.');
    }

    // 6. Verify net effective terms merging logic
    console.log('🔍 Running effective terms hierarchy merging calculations...');
    
    // Fetch all leases in hierarchy
    const hierarchyLeasesRes = await pool.query(
      `SELECT id, filename, document_type, created_at
       FROM leases
       WHERE id = $1 OR parent_lease_id = $1
       ORDER BY created_at ASC`,
      [parentId]
    );
    const leasesInHierarchy = hierarchyLeasesRes.rows;
    const leaseIds = leasesInHierarchy.map(l => l.id);

    if (leaseIds.length !== 2) {
      await cleanUp();
      throw new Error(`❌ Hierarchy fetch FAILED. Expected 2 leases, got ${leaseIds.length}`);
    }

    // Fetch terms
    const termsRes = await pool.query(
      `SELECT t.*, l.filename, l.document_type
       FROM lease_terms t
       JOIN leases l ON t.lease_id = l.id
       WHERE t.lease_id = ANY($1)`,
      [leaseIds]
    );
    const allTerms = termsRes.rows;

    // Calculate effective rent (should be parent value since not amended)
    const rentTerm = allTerms.find(t => t.lease_id === parentId && t.term_name === 'initial_rent');
    let effectiveRent = rentTerm ? rentTerm.extracted_value : null;
    let rentSource = parentId;

    leasesInHierarchy.forEach(l => {
      if (l.id !== parentId) {
        const childTerm = allTerms.find(t => t.lease_id === l.id && t.term_name === 'initial_rent');
        if (childTerm && childTerm.extracted_value) {
          effectiveRent = childTerm.extracted_value;
          rentSource = l.id;
        }
      }
    });

    // Calculate effective expiration (should be child value since overridden)
    const parentExpTerm = allTerms.find(t => t.lease_id === parentId && t.term_name === 'expiration_date');
    let effectiveExp = parentExpTerm ? parentExpTerm.extracted_value : null;
    let expSource = parentId;
    let expAmended: boolean = false;

    leasesInHierarchy.forEach(l => {
      if (l.id !== parentId) {
        const childTerm = allTerms.find(t => t.lease_id === l.id && t.term_name === 'expiration_date');
        if (childTerm && childTerm.extracted_value) {
          effectiveExp = childTerm.extracted_value;
          expSource = l.id;
          expAmended = true;
        }
      }
    });

    console.log(`- Rent Effective Value: "${effectiveRent}" (Source ID: ${rentSource})`);
    console.log(`- Expiration Effective Value: "${effectiveExp}" (Source ID: ${expSource}, Amended: ${expAmended})`);

    if (effectiveRent === '$5,000/month' && rentSource === parentId && effectiveExp === 'December 31, 2028' && expSource === childId && expAmended) {
      console.log('✅ Net Effective Term merging calculations PASSED.');
    } else {
      await cleanUp();
      throw new Error('❌ Net Effective Term merging calculations FAILED.');
    }

    // Clean up test records
    await cleanUp();
    console.log('\n🎉 ALL MULTI-DOCUMENT LEASE RELATIONSHIP & MERGE VERIFICATION CHECKS PASSED!');
  } catch (err: any) {
    console.error('\n💥 VERIFICATION PROCESS ENCOUNTERED FAILURE:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection pool closed.');
  }
}

runVerification();
