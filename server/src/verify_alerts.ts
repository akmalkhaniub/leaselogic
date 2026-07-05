import pool from './db.js';

async function verify() {
  console.log('--- Lease Alerts & Timeline API Verification ---');

  try {
    // 1. Create mock completed lease
    console.log('1. Creating mock lease record...');
    const leaseRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status) 
       VALUES ('alerts_test_lease.pdf', 3048576, 'completed') 
       RETURNING id`
    );
    const leaseId = leaseRes.rows[0].id;

    // 2. Insert mock lease terms
    console.log('2. Inserting commencement, expiration, and break terms...');
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status)
       VALUES 
         ($1, 'commencement_date', 'November 1, 2026', 0.95, 'approved'),
         ($1, 'expiration_date', 'October 31, 2036', 0.95, 'approved'),
         ($1, 'break_clause', 'The Tenant has a break option on October 31, 2031.', 0.95, 'approved')`,
      [leaseId]
    );

    // 3. Request visual timeline API
    console.log('3. Fetching visual timeline events...');
    const timelineRes = await fetch('http://127.0.0.1:5000/api/portfolio/timeline');
    if (timelineRes.status !== 200) {
      console.log('❌ FAIL: Timeline endpoint failed with status:', timelineRes.status);
      process.exit(1);
    }

    const events = (await timelineRes.json()) as any[];
    console.log('Total Timeline Events retrieved:', events.length);

    const leaseEvents = events.filter(evt => evt.lease_id === leaseId);
    console.log('Timeline events for mock lease:', leaseEvents);

    const commencementEvt = leaseEvents.find(evt => evt.event_type === 'commencement');
    const expirationEvt = leaseEvents.find(evt => evt.event_type === 'expiration');
    const breakEvt = leaseEvents.find(evt => evt.event_type === 'break');

    if (commencementEvt && commencementEvt.date === '2026-11-01') {
      console.log('✅ PASS: Commencement date parsed correctly.');
    } else {
      console.log('❌ FAIL: Commencement date mismatch.');
      process.exit(1);
    }

    if (expirationEvt && expirationEvt.date === '2036-10-31') {
      console.log('✅ PASS: Expiration date parsed correctly.');
    } else {
      console.log('❌ FAIL: Expiration date mismatch.');
      process.exit(1);
    }

    if (breakEvt && breakEvt.date === '2031-10-31') {
      console.log('✅ PASS: Break Option date parsed correctly.');
    } else {
      console.log('❌ FAIL: Break Option date mismatch.');
      process.exit(1);
    }

    // 4. Test alerts CRUD operations
    console.log('\n4. Testing Alerts CRUD endpoints...');
    const createRes = await fetch(`http://127.0.0.1:5000/api/leases/${leaseId}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        term_name: 'expiration_date',
        alert_date: '2036-09-30',
        alert_type: 'email',
        recipient: 'verifier@leaselogic.internal'
      })
    });

    if (createRes.status === 201) {
      console.log('✅ PASS: Create alert POST request succeeded.');
    } else {
      console.log('❌ FAIL: Create alert failed with status:', createRes.status);
      process.exit(1);
    }

    const alert = (await createRes.json()) as any;

    // List alerts
    const listRes = await fetch(`http://127.0.0.1:5000/api/leases/${leaseId}/alerts`);
    const alertsList = (await listRes.json()) as any[];
    if (alertsList.length === 1 && alertsList[0].id === alert.id) {
      console.log('✅ PASS: List alerts GET request returned the configured alert.');
    } else {
      console.log('❌ FAIL: List alerts returned invalid results.');
      process.exit(1);
    }

    // Delete alert
    const deleteRes = await fetch(`http://127.0.0.1:5000/api/leases/${leaseId}/alerts/${alert.id}`, {
      method: 'DELETE'
    });

    if (deleteRes.status === 200) {
      console.log('✅ PASS: Delete alert request succeeded.');
    } else {
      console.log('❌ FAIL: Delete alert failed.');
      process.exit(1);
    }

    // List again to verify empty
    const listRes2 = await fetch(`http://127.0.0.1:5000/api/leases/${leaseId}/alerts`);
    const alertsList2 = (await listRes2.json()) as any[];
    if (alertsList2.length === 0) {
      console.log('✅ PASS: Alert successfully deleted.');
    } else {
      console.log('❌ FAIL: Alert still exists after deletion.');
      process.exit(1);
    }

    // 5. Cleanup
    console.log('\n5. Cleaning up verification mock data...');
    await pool.query('DELETE FROM leases WHERE id = $1', [leaseId]);
    console.log('Cleanup completed successfully.');

  } catch (err) {
    console.error('Alerts verification script error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
