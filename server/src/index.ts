import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pool from './db.js';
import { startWorker } from './worker.js';
import { openai, anthropic } from './ai.js';
import { runLandRegistryAutomation } from './automation.js';
import { runPortfolioAudit } from './compliance.js';
import { getRentProjection } from './rent_projection.js';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Multer Config
const upload = multer({ dest: 'uploads/' });

// Create dummy landing page for Playwright automation
app.get('/mock-registry', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Land Registry Portal</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: #f0f2f5; }
          .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h2 { color: #333; }
          .form-group { margin-bottom: 15px; }
          label { display: block; font-weight: bold; margin-bottom: 5px; }
          input, textarea { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
          button { background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
          .success { color: green; font-weight: bold; display: none; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Official Land Registry - Abstract Submission</h2>
          <form id="registryForm" onsubmit="event.preventDefault(); document.getElementById('successMsg').style.display='block';">
            <div class="form-group">
              <label for="tenantName">Tenant Name</label>
              <input type="text" id="tenantName" required />
            </div>
            <div class="form-group">
              <label for="landlordName">Landlord Name</label>
              <input type="text" id="landlordName" required />
            </div>
            <div class="form-group">
              <label for="commencementDate">Commencement Date</label>
              <input type="text" id="commencementDate" required />
            </div>
            <div class="form-group">
              <label for="expirationDate">Expiration Date</label>
              <input type="text" id="expirationDate" required />
            </div>
            <div class="form-group">
              <label for="rentAmount">Initial Rent</label>
              <input type="text" id="rentAmount" required />
            </div>
            <div class="form-group">
              <label for="notes">Obligations Summary</label>
              <textarea id="notes" rows="4"></textarea>
            </div>
            <button type="submit" id="submitBtn">Submit Submission</button>
          </form>
          <div id="successMsg" class="success">Lease successfully registered with Land Registry!</div>
        </div>
      </body>
    </html>
  `);
});

// 1. Upload Lease API
app.post('/api/leases/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { filename, size } = req.file;
    const originalName = req.file.originalname;

    // Create lease record
    const leaseRes = await pool.query(
      `INSERT INTO leases (filename, file_size, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING *`,
      [originalName, size]
    );

    const lease = leaseRes.rows[0];

    // Rename file to its UUID
    const oldPath = req.file.path;
    const newPath = path.join('uploads', `${lease.id}.pdf`);
    fs.renameSync(oldPath, newPath);

    // Queue abstraction job
    await pool.query(
      `INSERT INTO abstraction_jobs (lease_id, status) 
       VALUES ($1, 'queued')`,
      [lease.id]
    );

    res.status(201).json({ lease });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. List Leases API
app.get('/api/leases', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, j.status as job_status, j.progress as job_progress, j.error_message as job_error
      FROM leases l
      LEFT JOIN abstraction_jobs j ON l.id = j.lease_id
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get Lease Abstract Terms
app.get('/api/leases/:id/abstract', async (req, res) => {
  try {
    const { id } = req.params;
    const terms = await pool.query(
      `SELECT * FROM lease_terms WHERE lease_id = $1 ORDER BY term_name ASC`,
      [id]
    );
    res.json(terms.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.5. Get Rent Projection Schedule
app.get('/api/leases/:id/rent-projection', async (req, res) => {
  try {
    const { id } = req.params;
    const projection = await getRentProjection(id);
    res.json(projection);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Lease Clauses API
app.get('/api/leases/:id/clauses', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, clause_number, clause_title, text_content, page_number 
       FROM clauses 
       WHERE lease_id = $1 
       ORDER BY page_number ASC, clause_number ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Lease Term (Reviewer approval/edits with Audit Log)
app.put('/api/leases/:id/terms/:termId', async (req, res) => {
  try {
    const { id: leaseId, termId } = req.params;
    const { extracted_value, reviewer_status } = req.body;

    // Fetch original values for audit logging
    const originalRes = await pool.query(
      `SELECT * FROM lease_terms WHERE id = $1 AND lease_id = $2`,
      [termId, leaseId]
    );

    if (originalRes.rowCount === 0) {
      res.status(404).json({ error: 'Lease term not found' });
      return;
    }

    const original = originalRes.rows[0];

    // Determine if the value was modified
    const isEdited = original.is_edited || (extracted_value !== original.extracted_value);

    // Update term
    const updatedRes = await pool.query(
      `UPDATE lease_terms
       SET extracted_value = $1, reviewer_status = $2, is_edited = $3, updated_at = NOW()
       WHERE id = $4 AND lease_id = $5
       RETURNING *`,
      [extracted_value, reviewer_status, isEdited, termId, leaseId]
    );

    // Create Audit Log entry
    await pool.query(
      `INSERT INTO audit_logs (lease_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        leaseId,
        'update_term',
        'lease_terms',
        termId,
        JSON.stringify({ extracted_value: original.extracted_value, reviewer_status: original.reviewer_status }),
        JSON.stringify({ extracted_value, reviewer_status })
      ]
    );

    res.json(updatedRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.1. Update Lease Term Grounding Mappings (Manual Reference Linking)
app.put('/api/leases/:id/terms/:termId/grounding', async (req, res) => {
  try {
    const { id: leaseId, termId } = req.params;
    const { source_clause_ids } = req.body;

    // Fetch original values for audit logging
    const originalRes = await pool.query(
      `SELECT * FROM lease_terms WHERE id = $1 AND lease_id = $2`,
      [termId, leaseId]
    );

    if (originalRes.rowCount === 0) {
      res.status(404).json({ error: 'Lease term not found' });
      return;
    }

    const original = originalRes.rows[0];

    // Update grounding references
    const updatedRes = await pool.query(
      `UPDATE lease_terms
       SET source_clause_ids = $1, is_edited = TRUE, updated_at = NOW()
       WHERE id = $2 AND lease_id = $3
       RETURNING *`,
      [source_clause_ids, termId, leaseId]
    );

    // Create Audit Log entry
    await pool.query(
      `INSERT INTO audit_logs (lease_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        leaseId,
        'update_grounding',
        'lease_terms',
        termId,
        JSON.stringify({ source_clause_ids: original.source_clause_ids }),
        JSON.stringify({ source_clause_ids })
      ]
    );

    res.json(updatedRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.5. Get Observability Stats
app.get('/api/observability/stats', async (req, res) => {
  try {
    // A. Count total leases
    const leasesCountRes = await pool.query('SELECT COUNT(*) FROM leases');
    const totalLeases = parseInt(leasesCountRes.rows[0].count || '0');

    // B. Total Cost from abstraction_jobs
    const costRes = await pool.query("SELECT SUM(api_cost) as total_cost FROM abstraction_jobs");
    const totalCost = parseFloat(costRes.rows[0].total_cost || '0.0');

    // C. Average Latency
    const latencyRes = await pool.query(
      "SELECT AVG(processing_time_ms) as avg_latency FROM abstraction_jobs WHERE status = 'completed'"
    );
    const avgLatencyMs = parseFloat(latencyRes.rows[0].avg_latency || '0');

    // D. Accuracy Rate
    const accuracyRes = await pool.query(`
      SELECT 
        COUNT(CASE WHEN reviewer_status = 'approved' AND is_edited = FALSE THEN 1 END) as approved_unedited,
        COUNT(CASE WHEN reviewer_status = 'approved' THEN 1 END) as total_approved
      FROM lease_terms
    `);
    const approvedUnedited = parseInt(accuracyRes.rows[0].approved_unedited || '0');
    const totalApproved = parseInt(accuracyRes.rows[0].total_approved || '0');
    const accuracyRate = totalApproved > 0 ? (approvedUnedited / totalApproved) * 100 : 100.0;

    // E. Cost by Lease
    const costByLeaseRes = await pool.query(`
      SELECT l.filename, COALESCE(j.api_cost, 0.0) as cost, COALESCE(j.processing_time_ms, 0) as latency_ms
      FROM leases l
      LEFT JOIN abstraction_jobs j ON l.id = j.lease_id
      ORDER BY l.created_at DESC
    `);

    // F. Audit Logs
    const auditLogsRes = await pool.query(`
      SELECT a.*, l.filename
      FROM audit_logs a
      LEFT JOIN leases l ON a.lease_id = l.id
      ORDER BY a.timestamp DESC
      LIMIT 50
    `);

    res.json({
      total_leases: totalLeases,
      total_cost: totalCost,
      avg_latency_ms: avgLatencyMs,
      accuracy_rate: accuracyRate,
      cost_by_lease: costByLeaseRes.rows,
      audit_logs: auditLogsRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.6. Compare terms across leases
app.get('/api/leases/compare/terms/:termName', async (req, res) => {
  try {
    const { termName } = req.params;
    
    // Query all terms matching the specified name
    const termsRes = await pool.query(
      `SELECT t.id, t.lease_id, t.term_name, t.extracted_value, t.reviewer_status, t.source_clause_ids, l.filename
       FROM lease_terms t
       JOIN leases l ON t.lease_id = l.id
       WHERE t.term_name = $1
       ORDER BY l.created_at DESC`,
      [termName]
    );

    const compareData = [];
    for (const term of termsRes.rows) {
      let sourceClauses: any[] = [];
      if (term.source_clause_ids && term.source_clause_ids.length > 0) {
        const clausesRes = await pool.query(
          `SELECT id, clause_number, clause_title, text_content, page_number
           FROM clauses
           WHERE id = ANY($1)`,
          [term.source_clause_ids]
        );
        sourceClauses = clausesRes.rows;
      }
      compareData.push({
        ...term,
        clauses: sourceClauses
      });
    }

    res.json(compareData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.7. Get compliance risk audit report
app.get('/api/compliance/audit', async (req, res) => {
  try {
    const auditReport = await runPortfolioAudit();
    res.json(auditReport);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.75. Export all portfolio terms to CSV
app.get('/api/portfolio/export/csv', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.filename, t.term_name, t.extracted_value 
      FROM leases l
      LEFT JOIN lease_terms t ON l.id = t.lease_id
      WHERE l.status = 'completed'
      ORDER BY l.filename ASC, t.term_name ASC
    `);

    const leaseDataMap = new Map<string, Record<string, string>>();
    const allTermNames = new Set<string>();

    for (const row of result.rows) {
      if (!leaseDataMap.has(row.filename)) {
        leaseDataMap.set(row.filename, {});
      }
      if (row.term_name) {
        const cleanVal = (row.extracted_value || '').split(' (Citation:')[0];
        leaseDataMap.get(row.filename)![row.term_name] = cleanVal;
        allTermNames.add(row.term_name);
      }
    }

    const termNamesArray = Array.from(allTermNames).sort();
    
    let csvContent = 'Lease Filename,' + termNamesArray.map(name => {
      return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }).join(',') + '\n';

    for (const [filename, terms] of leaseDataMap.entries()) {
      const rowValues = [filename];
      for (const termName of termNamesArray) {
        let val = terms[termName] || '';
        val = val.replace(/"/g, '""');
        rowValues.push(`"${val}"`);
      }
      csvContent += rowValues.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leases_portfolio.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Timezone-safe date string formatter
function toLocalDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper function to extract dates for timeline
function extractTimelineDate(text: string, commencement?: Date): string | null {
  const clean = text.split(' (Citation:')[0].trim();
  if (!clean || clean.toLowerCase() === 'none' || clean.toLowerCase() === 'n/a') return null;

  const dateMatch = clean.match(/([a-zA-Z]+ \d{1,2},? \d{4})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const d = new Date(dateMatch[0]);
    if (!isNaN(d.getTime())) return toLocalDateString(d);
  }

  const yrMatch = clean.match(/(\d+)\s*(?:years?|anniversary)/i);
  if (yrMatch && commencement) {
    const years = parseInt(yrMatch[1]);
    const d = new Date(commencement.getTime());
    d.setFullYear(d.getFullYear() + years);
    return toLocalDateString(d);
  }

  const yearOnly = clean.match(/\b(202\d|203\d)\b/);
  if (yearOnly) {
    const yr = parseInt(yearOnly[1]);
    const month = commencement ? commencement.getMonth() : 5;
    const day = commencement ? commencement.getDate() : 1;
    const d = new Date(yr, month, day);
    if (!isNaN(d.getTime())) return toLocalDateString(d);
  }

  return null;
}

// 4.76. Get visual timeline events across portfolio leases
app.get('/api/portfolio/timeline', async (req, res) => {
  try {
    const leasesRes = await pool.query("SELECT id, filename FROM leases WHERE status = 'completed'");
    const events: any[] = [];

    for (const lease of leasesRes.rows) {
      const termsRes = await pool.query(
        "SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1",
        [lease.id]
      );
      const termsMap = new Map<string, string>();
      for (const row of termsRes.rows) {
        termsMap.set(row.term_name, row.extracted_value || '');
      }

      const commencementRaw = termsMap.get('commencement_date') || '';
      const expirationRaw = termsMap.get('expiration_date') || '';
      const breakRaw = termsMap.get('break_clause') || '';

      const commencementDate = commencementRaw ? new Date(commencementRaw.split(' (Citation:')[0]) : null;
      const validCommencement = commencementDate && !isNaN(commencementDate.getTime()) ? commencementDate : null;

      if (validCommencement) {
        events.push({
          lease_id: lease.id,
          filename: lease.filename,
          event_type: 'commencement',
          event_title: 'Lease Commencement',
          date: toLocalDateString(validCommencement),
          description: `Lease starts for ${lease.filename}`
        });
      }

      const expirationStr = validCommencement ? extractTimelineDate(expirationRaw, validCommencement) : extractTimelineDate(expirationRaw);
      if (expirationStr) {
        events.push({
          lease_id: lease.id,
          filename: lease.filename,
          event_type: 'expiration',
          event_title: 'Lease Expiration',
          date: expirationStr,
          description: `Lease expires for ${lease.filename}`
        });
      }

      const breakStr = validCommencement ? extractTimelineDate(breakRaw, validCommencement) : extractTimelineDate(breakRaw);
      if (breakStr) {
        events.push({
          lease_id: lease.id,
          filename: lease.filename,
          event_type: 'break',
          event_title: 'Break Clause Option',
          date: breakStr,
          description: `Early termination option: ${breakRaw.split(' (Citation:')[0]}`
        });
      }

      // Add rent escalations from the rent projection schedule
      try {
        const projection = await getRentProjection(lease.id);
        if (projection && projection.schedule && projection.schedule.length > 1) {
          // Add Year 2+ schedule events
          for (let i = 1; i < projection.schedule.length; i++) {
            const period = projection.schedule[i];
            events.push({
              lease_id: lease.id,
              filename: lease.filename,
              event_type: 'escalation',
              event_title: `Rent Step Up (Year ${period.year})`,
              date: period.start_date,
              description: `Rent increases to ${projection.currency}${period.annual_rent.toLocaleString()} / year`
            });
          }
        }
      } catch (err) {
        console.warn(`Could not add rent escalation events for ${lease.filename}:`, err);
      }
    }

    // Sort by date ascending
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.77. GET all alerts for a specific lease
app.get('/api/leases/:id/alerts', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM lease_alerts WHERE lease_id = $1 ORDER BY alert_date ASC",
      [id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.78. POST create a new alert for a lease
app.post('/api/leases/:id/alerts', async (req, res) => {
  try {
    const { id } = req.params;
    const { term_name, alert_date, alert_type, recipient } = req.body;
    if (!term_name || !alert_date || !recipient) {
      res.status(400).json({ error: 'term_name, alert_date, and recipient are required.' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO lease_alerts (lease_id, term_name, alert_date, alert_type, recipient, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [id, term_name, alert_date, alert_type || 'email', recipient]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.79. DELETE an alert configuration
app.delete('/api/leases/:id/alerts/:alertId', async (req, res) => {
  try {
    const { id, alertId } = req.params;
    await pool.query(
      "DELETE FROM lease_alerts WHERE id = $1 AND lease_id = $2",
      [alertId, id]
    );
    res.json({ success: true, message: 'Alert deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.81. GET benchmark runs for a specific lease
app.get('/api/leases/:id/benchmarks', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM benchmark_runs WHERE lease_id = $1 ORDER BY created_at DESC",
      [id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.82. POST trigger a benchmark run for a lease and term
app.post('/api/leases/:id/benchmarks/run', async (req, res) => {
  try {
    const { id } = req.params;
    const { model, prompt_template, term_name } = req.body;

    if (!model || !prompt_template || !term_name) {
      res.status(400).json({ error: 'model, prompt_template, and term_name are required.' });
      return;
    }

    // 1. Fetch lease clauses
    const clausesRes = await pool.query(
      "SELECT text_content FROM clauses WHERE lease_id = $1 ORDER BY page_number ASC, clause_number ASC",
      [id]
    );
    const fullText = clausesRes.rows.map(r => r.text_content).join('\n\n');

    if (!fullText) {
      res.status(404).json({ error: 'No text clauses found for this lease.' });
      return;
    }

    // Replace {term_name} parameter in the prompt template
    const formattedPrompt = prompt_template.replace(/{term_name}/g, term_name);
    const finalPrompt = `${formattedPrompt}\n\nFull Lease Text:\n${fullText.substring(0, 12000)}\n\nTask: Extract the requested term and section citation. You MUST respond with ONLY a raw JSON object matching this schema: {"value": "extracted value", "citation": "clause section reference"}`;

    const startTime = Date.now();
    let responseText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cost = 0;

    const isOpenAIAvailable = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-api-key');
    const isClaudeAvailable = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-api-key');

    if (model === 'gpt-4o-mini' && isOpenAIAvailable) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: finalPrompt }],
        response_format: { type: 'json_object' }
      });
      responseText = completion.choices[0]?.message?.content || '{}';
      inputTokens = completion.usage?.prompt_tokens || 0;
      outputTokens = completion.usage?.completion_tokens || 0;
      cost = (inputTokens / 1000000) * 0.15 + (outputTokens / 1000000) * 0.60;
    } else if (model === 'claude-3-5-sonnet' && isClaudeAvailable) {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        messages: [{ role: 'user', content: finalPrompt }]
      });
      responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
      inputTokens = message.usage?.input_tokens || 0;
      outputTokens = message.usage?.output_tokens || 0;
      cost = (inputTokens / 1000000) * 3.0 + (outputTokens / 1000000) * 15.0;
    } else {
      // Simulation / Mock mode if API keys are missing
      const isClaude = model === 'claude-3-5-sonnet';
      const delay = isClaude ? Math.floor(Math.random() * 1200) + 900 : Math.floor(Math.random() * 500) + 400;
      await new Promise(r => setTimeout(r, delay));

      // Fetch completed lease term to mimic output value
      const termRes = await pool.query(
        "SELECT extracted_value FROM lease_terms WHERE lease_id = $1 AND term_name = $2",
        [id, term_name]
      );
      const dbVal = termRes.rows[0]?.extracted_value || 'Not Extracted';
      const cleanVal = dbVal.split(' (Citation:')[0];
      const cleanCit = dbVal.split(' (Citation:')[1]?.replace(')', '') || 'Section 1.1';

      responseText = JSON.stringify({ value: cleanVal, citation: cleanCit });
      inputTokens = 1200 + Math.floor(Math.random() * 150);
      outputTokens = 40 + Math.floor(Math.random() * 20);
      cost = isClaude 
        ? (inputTokens / 1000000) * 3.0 + (outputTokens / 1000000) * 15.0
        : (inputTokens / 1000000) * 0.15 + (outputTokens / 1000000) * 0.60;
    }

    const duration = Date.now() - startTime;

    // Save benchmark run to database
    const insertRes = await pool.query(
      `INSERT INTO benchmark_runs (lease_id, model, prompt_template, extracted_value, term_name, processing_time_ms, input_tokens, output_tokens, api_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, model, prompt_template, responseText, term_name, duration, inputTokens, outputTokens, cost]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4.83. GET comments for a lease term
app.get('/api/leases/:id/terms/:termName/comments', async (req, res) => {
  try {
    const { id, termName } = req.params;
    const result = await pool.query(
      "SELECT * FROM reviewer_comments WHERE lease_id = $1 AND term_name = $2 ORDER BY created_at ASC",
      [id, termName]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.84. POST create a new comment on a lease term
app.post('/api/leases/:id/terms/:termName/comments', async (req, res) => {
  try {
    const { id, termName } = req.params;
    const { reviewer_name, comment_text } = req.body;
    if (!reviewer_name || !comment_text) {
      res.status(400).json({ error: 'reviewer_name and comment_text are required.' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO reviewer_comments (lease_id, term_name, reviewer_name, comment_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, termName, reviewer_name, comment_text]
    );

    // Create Audit Log entry
    await pool.query(
      `INSERT INTO audit_logs (lease_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        'add_comment',
        'reviewer_comments',
        result.rows[0].id,
        JSON.stringify({}),
        JSON.stringify({ term_name: termName, reviewer_name, comment_text })
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.85. GET audit logs for a specific lease
app.get('/api/leases/:id/audit-logs', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM audit_logs WHERE lease_id = $1 ORDER BY created_at DESC",
      [id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.8. Get all compliance rules
app.get('/api/compliance/rules', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_rules ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.9. Create a new compliance rule
app.post('/api/compliance/rules', async (req, res) => {
  try {
    const { rule_name, term_name, operator, value_limit, severity, message_template } = req.body;
    if (!rule_name || !term_name || !operator || !value_limit || !message_template) {
      res.status(400).json({ error: 'All fields (rule_name, term_name, operator, value_limit, message_template) are required' });
      return;
    }
    const ruleCode = `rule_${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO compliance_rules (rule_code, rule_name, term_name, operator, value_limit, severity, message_template)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [ruleCode, rule_name, term_name, operator, value_limit, severity || 'fail', message_template]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.10. Update a compliance rule
app.put('/api/compliance/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rule_name, term_name, operator, value_limit, severity, message_template } = req.body;
    if (!rule_name || !term_name || !operator || !value_limit || !message_template) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }
    const result = await pool.query(
      `UPDATE compliance_rules
       SET rule_name = $1, term_name = $2, operator = $3, value_limit = $4, severity = $5, message_template = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [rule_name, term_name, operator, value_limit, severity, message_template, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.11. Delete a compliance rule
app.delete('/api/compliance/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM compliance_rules WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    res.json({ message: 'Rule deleted successfully', rule: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 5. Search Clauses (pgvector similarity search)
app.post('/api/leases/search', async (req, res) => {
  try {
    const { query, leaseId, limit = 5 } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    // Embed search query using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    const embedding = embeddingResponse.data[0].embedding;
    const embeddingStr = `[${embedding.join(',')}]`;

    // Query pgvector for cosine similarity
    let sql = `
      SELECT c.id, c.clause_number, c.clause_title, c.text_content, c.page_number, c.lease_id, l.filename,
             (1 - (c.embedding <=> $1::vector)) AS similarity
      FROM clauses c
      JOIN leases l ON c.lease_id = l.id
    `;
    const params: any[] = [embeddingStr];

    if (leaseId) {
      sql += ` WHERE c.lease_id = $2 ORDER BY c.embedding <=> $1::vector LIMIT $3`;
      params.push(leaseId, limit);
    } else {
      sql += ` ORDER BY c.embedding <=> $1::vector LIMIT $2`;
      params.push(limit);
    }

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Streaming Compliance Q&A API (SSE)
app.get('/api/chat/stream', async (req, res) => {
  const query = req.query.q as string;
  const leaseId = req.query.leaseId as string;

  if (!query) {
    res.status(400).json({ error: 'Query is required' });
    return;
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // A. Embed query to search for grounding context
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    const embedding = embeddingResponse.data[0].embedding;
    const embeddingStr = `[${embedding.join(',')}]`;

    // B. Search database for matching clauses
    let sql = `
      SELECT c.clause_number, c.clause_title, c.text_content, l.filename
      FROM clauses c
      JOIN leases l ON c.lease_id = l.id
    `;
    const params: any[] = [embeddingStr];

    if (leaseId && leaseId !== 'all') {
      sql += ` WHERE c.lease_id = $2 ORDER BY c.embedding <=> $1::vector LIMIT 6`;
      params.push(leaseId);
    } else {
      sql += ` ORDER BY c.embedding <=> $1::vector LIMIT 6`;
    }

    const dbRes = await pool.query(sql, params);
    const clauses = dbRes.rows;

    // C. Construct context grounding
    let contextText = '';
    clauses.forEach((c, idx) => {
      contextText += `[Source ${idx + 1}] Lease File: "${c.filename}", Clause: ${c.clause_number || ''} ${c.clause_title || ''}\nContent:\n${c.text_content}\n\n`;
    });

    // D. Stream response from LLM
    const prompt = `
You are an expert commercial real estate lease compliance analyst. Answering the user question grounded ONLY in the lease context below.

Question:
${query}

Grounding Context:
${contextText || 'No relevant lease clauses found.'}

Instructions:
1. Ground your answer strictly in the provided sources.
2. Cite the source files (e.g. [Source 1]) when referencing specific clauses.
3. Be clear, concise, and structured.
4. If the context does not contain the answer, explain that you couldn't find the answer in the active leases.
`;

    const isAnthropicFake = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('xxx') || process.env.ANTHROPIC_API_KEY === '';

    if (!isAnthropicFake) {
      try {
        const stream = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta && 'text' in chunk.delta) {
            res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      } catch (err: any) {
        console.warn(`Claude streaming failed, falling back to OpenAI: ${err.message}`);
      }
    }

    // OpenAI streaming fallback
    console.log("Streaming chat response using OpenAI gpt-4o-mini...");
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// 7. Automation Land Registry Trigger
app.post('/api/automation/registry', async (req, res) => {
  try {
    const { leaseId } = req.body;
    if (!leaseId) {
      res.status(400).json({ error: 'leaseId is required' });
      return;
    }

    const result = await runLandRegistryAutomation(leaseId);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  
  // Run self-healing DB migrations for observability fields and compliance rules
  try {
    console.log('Running self-healing database migrations...');
    await pool.query(`
      ALTER TABLE abstraction_jobs 
      ADD COLUMN IF NOT EXISTS input_tokens INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS output_tokens INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS processing_time_ms INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS api_cost NUMERIC(8,6) DEFAULT 0.000000;
      
      ALTER TABLE lease_terms 
      ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
    `);

    // Create compliance_rules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS compliance_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          rule_code VARCHAR(100) UNIQUE NOT NULL,
          rule_name VARCHAR(255) NOT NULL,
          term_name VARCHAR(100) NOT NULL,
          operator VARCHAR(50) NOT NULL,
          value_limit VARCHAR(255) NOT NULL,
          severity VARCHAR(20) DEFAULT 'fail',
          message_template TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create lease_alerts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lease_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
          term_name VARCHAR(100) NOT NULL,
          alert_date DATE NOT NULL,
          alert_type VARCHAR(50) DEFAULT 'email',
          recipient VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create benchmark_runs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS benchmark_runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
          model VARCHAR(100) NOT NULL,
          prompt_template TEXT NOT NULL,
          extracted_value TEXT NOT NULL,
          term_name VARCHAR(100) NOT NULL,
          processing_time_ms INT NOT NULL,
          input_tokens INT NOT NULL,
          output_tokens INT NOT NULL,
          api_cost NUMERIC(8,6) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create reviewer_comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviewer_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
          term_name VARCHAR(100) NOT NULL,
          reviewer_name VARCHAR(255) NOT NULL,
          comment_text TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default rules if empty
    const checkRules = await pool.query('SELECT COUNT(*) FROM compliance_rules');
    const rulesCount = parseInt(checkRules.rows[0].count || '0');
    if (rulesCount === 0) {
      console.log('Seeding default compliance rules...');
      await pool.query(`
        INSERT INTO compliance_rules (rule_code, rule_name, term_name, operator, value_limit, severity, message_template)
        VALUES 
          (
            'min_insurance', 
            'Minimum Public Liability Insurance ($5M)', 
            'indemnity_covenants', 
            'min_value', 
            '5000000', 
            'fail', 
            'Insurance coverage limit ({actual}) is below the required minimum of $5,000,000.'
          ),
          (
            'expiry_check', 
            'Lease Long-term Commitment (Expiry >= 2028)', 
            'expiration_date', 
            'min_year', 
            '2028', 
            'fail', 
            'Lease expires in {actual}, which violates the requirement to remain active until at least 2028.'
          ),
          (
            'break_clause', 
            'Tenant Break Clause Flexibility', 
            'break_clause', 
            'not_contains', 
            'none,no break,n/a', 
            'warn', 
            'No tenant break clause found. The tenant has no early termination rights.'
          ),
          (
            'repair_responsibility', 
            'Landlord External/Structural Repairs', 
            'repair_obligations', 
            'tenant_structural_repair', 
            'tenant', 
            'fail', 
            'High Risk: Tenant is assigned responsibility for structural, external, or roof repairs.'
          );
      `);
      console.log('Default compliance rules seeded successfully.');
    }

    console.log('Database migrations verified/completed successfully.');
  } catch (err) {
    console.error('Error running self-healing migrations:', err);
  }

  startWorker();
});
