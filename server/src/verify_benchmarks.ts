import pool from './db.js';

async function verify() {
  console.log('--- Model Benchmarking API Verification ---');

  try {
    // 1. Create mock lease
    console.log('1. Creating mock completed lease...');
    const leaseRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status) 
       VALUES ('benchmark_test_lease.pdf', 1048576, 'completed') 
       RETURNING id`
    );
    const leaseId = leaseRes.rows[0].id;

    // 2. Create mock clauses
    console.log('2. Inserting mock clauses...');
    await pool.query(
      `INSERT INTO clauses (lease_id, clause_number, clause_title, text_content, page_number, chunk_strategy)
       VALUES ($1, 'Section 2.1', 'Initial Rent Schedule', 'The Initial Rent payable under this Lease shall be Ten Thousand Pounds (£10,000) per annum.', 1, 'clause-boundary')`,
      [leaseId]
    );

    // 3. Create mock lease term sheet
    console.log('3. Inserting mock lease terms baseline...');
    await pool.query(
      `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, reviewer_status)
       VALUES ($1, 'initial_rent', '£10,000 (Citation: Section 2.1)', 0.95, 'approved')`,
      [leaseId]
    );

    // 4. Request benchmark runs list (verify empty)
    console.log('4. Checking initial benchmark runs...');
    const initialRes = await fetch(`http://127.0.0.1:5000/api/leases/${leaseId}/benchmarks`);
    if (initialRes.status !== 200) {
      console.log('❌ FAIL: Benchmark list endpoint failed with status:', initialRes.status);
      process.exit(1);
    }
    const initialList = (await initialRes.json()) as any[];
    if (initialList.length === 0) {
      console.log('✅ PASS: Initial benchmark run list is empty.');
    } else {
      console.log('❌ FAIL: Expected empty list, found runs.');
      process.exit(1);
    }

    // 5. POST run benchmarking
    console.log('5. Triggering benchmark run request for initial_rent...');
    const runRes = await fetch(`http://127.0.0.1:5000/api/leases/${leaseId}/benchmarks/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        prompt_template: 'Extract target term {term_name} from lease.',
        term_name: 'initial_rent'
      })
    });

    if (runRes.status === 201) {
      console.log('✅ PASS: Trigger benchmark run request succeeded.');
    } else {
      console.log('❌ FAIL: Trigger benchmark run request failed with status:', runRes.status);
      process.exit(1);
    }

    const run = (await runRes.json()) as any;
    console.log('Benchmark Run Record:', run);

    if (run.model === 'gpt-4o-mini' && run.term_name === 'initial_rent') {
      console.log('✅ PASS: Saved correct model and term name attributes.');
    } else {
      console.log('❌ FAIL: Mismatch in saved model/term metadata.');
      process.exit(1);
    }

    if (run.processing_time_ms > 0 && run.input_tokens > 0 && run.output_tokens > 0) {
      console.log('✅ PASS: Metrics (latency, input/output tokens) logged successfully.');
    } else {
      console.log('❌ FAIL: Performance metrics not calculated/logged.');
      process.exit(1);
    }

    const parsedVal = JSON.parse(run.extracted_value);
    if (parsedVal.value && parsedVal.citation) {
      console.log('✅ PASS: Structured value and citation JSON extracted.');
      console.log('Extracted Value:', parsedVal.value);
      console.log('Extracted Citation:', parsedVal.citation);
    } else {
      console.log('❌ FAIL: Extracted value payload schema invalid.');
      process.exit(1);
    }

    // 6. Request visual benchmark runs listing again
    console.log('6. Checking benchmark runs list after trigger...');
    const finalRes = await fetch(`http://127.0.0.1:5000/api/leases/${leaseId}/benchmarks`);
    const finalList = (await finalRes.json()) as any[];
    if (finalList.length === 1 && finalList[0].id === run.id) {
      console.log('✅ PASS: Visual runs listing retrieves the executed benchmark run.');
    } else {
      console.log('❌ FAIL: Listing does not match executed run.');
      process.exit(1);
    }

    // 7. Cleanup
    console.log('7. Cleaning up verification mock data...');
    await pool.query('DELETE FROM leases WHERE id = $1', [leaseId]);
    console.log('Cleanup completed successfully.');

  } catch (err) {
    console.error('Benchmarking verification script error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
