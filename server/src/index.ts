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
    const { property_name } = req.query;
    let queryText = `
      SELECT l.*, j.status as job_status, j.progress as job_progress, j.error_message as job_error
      FROM leases l
      LEFT JOIN abstraction_jobs j ON l.id = j.lease_id
    `;
    const params: any[] = [];
    if (property_name && typeof property_name === 'string' && property_name.trim() !== '') {
      queryText += ` WHERE l.property_name = $1`;
      params.push(property_name);
    }
    queryText += ` ORDER BY l.created_at DESC`;

    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set or update lease building/property tag
app.put('/api/leases/:id/property', async (req, res) => {
  try {
    const { id } = req.params;
    const { property_name } = req.body;

    const propName = property_name && property_name.trim() !== '' ? property_name.trim() : 'General Portfolio';

    const result = await pool.query(
      `UPDATE leases 
       SET property_name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [propName, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }

    // Create Audit Log entry
    await pool.query(
      `INSERT INTO audit_logs (lease_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, 'leases', $3, $4, $5)`,
      [
        id,
        'update_property',
        id,
        JSON.stringify({}),
        JSON.stringify({ property_name: propName })
      ]
    );

    res.json(result.rows[0]);
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

// 4.76. GET export portfolio critical dates in iCal (.ics) format
app.get('/api/portfolio/critical-dates/ics', async (req, res) => {
  try {
    const leasesRes = await pool.query(
      "SELECT id, filename FROM leases WHERE status = 'completed'"
    );

    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LeaseLogic//Commercial Property Milestone Calendar//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:LeaseLogic Critical Dates\r\n";

    for (const lease of leasesRes.rows) {
      const termsRes = await pool.query(
        "SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1",
        [lease.id]
      );

      const termMap = new Map<string, string>();
      termsRes.rows.forEach(t => termMap.set(t.term_name, t.extracted_value));

      const commencementRaw = termMap.get('commencement_date');
      const expirationRaw = termMap.get('expiration_date');
      const breakRaw = termMap.get('break_clause');

      const addEvent = (title: string, dateStr: string, description: string) => {
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) return;

        const yyyy = parsedDate.getFullYear();
        const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(parsedDate.getDate()).padStart(2, '0');
        const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const dtStart = `${yyyy}${mm}${dd}`;

        icsContent += "BEGIN:VEVENT\r\n";
        icsContent += `UID:leaselogic-${lease.id}-${title.replace(/\s+/g, '-')}-${dtStart}@leaselogic.internal\r\n`;
        icsContent += `DTSTAMP:${dtStamp}\r\n`;
        icsContent += `DTSTART;VALUE=DATE:${dtStart}\r\n`;
        icsContent += `SUMMARY:LeaseLogic: ${title} (${lease.filename})\r\n`;
        icsContent += `DESCRIPTION:${description.replace(/\r?\n/g, ' ')}\r\n`;
        icsContent += "END:VEVENT\r\n";
      };

      if (commencementRaw) {
        const d = extractTimelineDate(commencementRaw);
        if (d) addEvent("Lease Commencement", d, `Commencement date for ${lease.filename}`);
      }

      if (expirationRaw) {
        const d = extractTimelineDate(expirationRaw);
        if (d) addEvent("Lease Expiration", d, `Lease expiration date for ${lease.filename}`);
      }

      if (breakRaw) {
        const d = extractTimelineDate(breakRaw);
        if (d) addEvent("Break Option Notice Deadline", d, `Break option clause: ${breakRaw}`);
      }
    }

    icsContent += "END:VCALENDAR\r\n";

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="LeaseLogic_Critical_Dates.ics"');
    res.send(icsContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.765. GET portfolio risk matrix and clause deviation heatmap
app.get('/api/portfolio/risk-matrix', async (req, res) => {
  try {
    const leasesRes = await pool.query(
      "SELECT id, filename, property_name FROM leases WHERE status = 'completed' ORDER BY created_at DESC"
    );

    const leases = leasesRes.rows;
    const leaseIds = leases.map(l => l.id);

    if (leaseIds.length === 0) {
      res.json({
        summary: { high_risk: 0, medium_risk: 0, low_risk: 0, overall_risk_score: 100 },
        matrix: []
      });
      return;
    }

    const termsRes = await pool.query(
      "SELECT lease_id, term_name, extracted_value FROM lease_terms WHERE lease_id = ANY($1)",
      [leaseIds]
    );

    const termsByLease = new Map<string, Map<string, string>>();
    termsRes.rows.forEach(t => {
      if (!termsByLease.has(t.lease_id)) {
        termsByLease.set(t.lease_id, new Map<string, string>());
      }
      termsByLease.get(t.lease_id)!.set(t.term_name, t.extracted_value);
    });

    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;

    const matrix = leases.map(lease => {
      const termMap = termsByLease.get(lease.id) || new Map<string, string>();

      // 1. Insurance Risk
      const insRaw = termMap.get('indemnity_covenants') || '';
      const insNum = parseFloat(insRaw.replace(/[^0-9.]/g, '')) || 0;
      let insRisk: 'low' | 'medium' | 'high' = 'low';
      let insDesc = 'Standard $5M+ coverage limit';
      if (insNum > 0 && insNum < 5000000) {
        insRisk = 'high';
        insDesc = `Sub-standard limit: $${insNum.toLocaleString()} (Below $5M RICS benchmark)`;
        totalHigh++;
      } else {
        totalLow++;
      }

      // 2. Commitment Expiration Risk
      const expRaw = termMap.get('expiration_date') || '';
      const expYearMatch = expRaw.match(/20\d\d/);
      const expYear = expYearMatch ? parseInt(expYearMatch[0]) : 0;
      let expRisk: 'low' | 'medium' | 'high' = 'low';
      let expDesc = 'Long-term commitment (2028+)';
      if (expYear > 0 && expYear < 2028) {
        expRisk = 'medium';
        expDesc = `Near-term expiry (${expYear}): Renewal risk`;
        totalMedium++;
      } else {
        totalLow++;
      }

      // 3. Break Option Risk
      const breakRaw = termMap.get('break_clause') || '';
      let breakRisk: 'low' | 'medium' | 'high' = 'low';
      let breakDesc = 'Tenant break option active';
      if (!breakRaw || breakRaw.toLowerCase().includes('none') || breakRaw.toLowerCase().includes('no break')) {
        breakRisk = 'medium';
        breakDesc = 'No tenant break clause included';
        totalMedium++;
      } else {
        totalLow++;
      }

      // 4. Structural Repair Risk
      const repairRaw = termMap.get('repair_obligations') || '';
      let repairRisk: 'low' | 'medium' | 'high' = 'low';
      let repairDesc = 'Landlord structural repair responsibility';
      if (repairRaw.toLowerCase().includes('tenant') && (repairRaw.toLowerCase().includes('structural') || repairRaw.toLowerCase().includes('roof') || repairRaw.toLowerCase().includes('exterior'))) {
        repairRisk = 'high';
        repairDesc = 'High Risk: Structural/roof repair assigned to tenant';
        totalHigh++;
      } else {
        totalLow++;
      }

      // Calculate composite score (100 - (high * 25) - (medium * 10))
      let leaseScore = 100;
      if (insRisk === 'high') leaseScore -= 25;
      if (repairRisk === 'high') leaseScore -= 25;
      if (expRisk === 'medium') leaseScore -= 10;
      if (breakRisk === 'medium') leaseScore -= 10;

      return {
        lease_id: lease.id,
        filename: lease.filename,
        property_name: lease.property_name || 'General Portfolio',
        score: Math.max(0, leaseScore),
        risks: {
          insurance: { level: insRisk, description: insDesc, value: insRaw },
          expiration: { level: expRisk, description: expDesc, value: expRaw },
          break_clause: { level: breakRisk, description: breakDesc, value: breakRaw },
          repair: { level: repairRisk, description: repairDesc, value: repairRaw }
        }
      };
    });

    const overallScore = matrix.length > 0 
      ? Math.round(matrix.reduce((acc, curr) => acc + curr.score, 0) / matrix.length)
      : 100;

    res.json({
      summary: {
        high_risk: totalHigh,
        medium_risk: totalMedium,
        low_risk: totalLow,
        overall_risk_score: overallScore
      },
      matrix
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.768. GET property stacking plan and multi-tenant rent roll
app.get('/api/properties/:propertyName/stacking-plan', async (req, res) => {
  try {
    const propertyName = decodeURIComponent(req.params.propertyName);

    let leasesQuery = "SELECT id, filename, property_name FROM leases WHERE status = 'completed'";
    const queryParams: any[] = [];

    if (propertyName && propertyName !== 'all') {
      leasesQuery += " AND property_name = $1";
      queryParams.push(propertyName);
    }
    leasesQuery += " ORDER BY created_at DESC";

    const leasesRes = await pool.query(leasesQuery, queryParams);
    const leases = leasesRes.rows;
    const leaseIds = leases.map(l => l.id);

    if (leaseIds.length === 0) {
      res.json({
        property_name: propertyName === 'all' ? 'All Portfolio Assets' : propertyName,
        total_sqft: 0,
        leased_sqft: 0,
        occupancy_rate: 0,
        total_annual_revenue: 0,
        avg_rent_per_sqft: 0,
        floors: []
      });
      return;
    }

    const termsRes = await pool.query(
      "SELECT lease_id, term_name, extracted_value FROM lease_terms WHERE lease_id = ANY($1)",
      [leaseIds]
    );

    const termsByLease = new Map<string, Map<string, string>>();
    termsRes.rows.forEach(t => {
      if (!termsByLease.has(t.lease_id)) {
        termsByLease.set(t.lease_id, new Map<string, string>());
      }
      termsByLease.get(t.lease_id)!.set(t.term_name, t.extracted_value);
    });

    const floorMap = new Map<string, any[]>();
    ['Floor 4 (Executive)', 'Floor 3 (Commercial)', 'Floor 2 (Commercial)', 'Floor 1 (Ground Retail)'].forEach(f => {
      floorMap.set(f, []);
    });

    let totalPropertySqft = 0;
    let totalLeasedSqft = 0;
    let totalAnnualRev = 0;

    leases.forEach((lease, idx) => {
      const termMap = termsByLease.get(lease.id) || new Map<string, string>();
      const tenantName = termMap.get('tenant_name') || lease.filename.replace('.pdf', '');
      const rentRaw = termMap.get('initial_rent') || '$0';
      const rentNum = parseFloat(rentRaw.replace(/[^0-9.]/g, '')) || 5000 * (idx + 1);

      const annualRent = rentRaw.toLowerCase().includes('month') ? rentNum * 12 : (rentNum < 20000 ? rentNum * 12 : rentNum);

      const floorNames = ['Floor 1 (Ground Retail)', 'Floor 2 (Commercial)', 'Floor 3 (Commercial)', 'Floor 4 (Executive)'];
      const assignedFloor = floorNames[idx % floorNames.length];

      const sqft = 1500 + (idx * 500);
      const rentPerSqft = Math.round(annualRent / sqft);

      const expRaw = termMap.get('expiration_date') || '';
      const expYearMatch = expRaw.match(/20\d\d/);
      const expYear = expYearMatch ? parseInt(expYearMatch[0]) : 0;
      const isExpiringSoon = expYear > 0 && expYear < 2028;

      const suite = {
        lease_id: lease.id,
        filename: lease.filename,
        property_name: lease.property_name || 'General Portfolio',
        tenant_name: tenantName.split(' (Citation:')[0],
        suite_number: `Suite ${101 + idx}`,
        sqft,
        annual_rent: annualRent,
        rent_per_sqft: rentPerSqft,
        status: 'occupied',
        expiration_date: expRaw.split(' (Citation:')[0] || '2030-12-31',
        risk_flag: isExpiringSoon ? 'expiring_soon' : 'standard'
      };

      totalPropertySqft += sqft;
      totalLeasedSqft += sqft;
      totalAnnualRev += annualRent;

      floorMap.get(assignedFloor)!.push(suite);
    });

    const floors = Array.from(floorMap.entries()).map(([floorName, suites]) => {
      const floorSqft = suites.reduce((acc, s) => acc + s.sqft, 0) || 5000;
      const floorRevenue = suites.reduce((acc, s) => acc + s.annual_rent, 0);
      const floorLeasedSqft = suites.reduce((acc, s) => acc + s.sqft, 0);
      const floorOccupancy = suites.length > 0 ? 100 : 0;

      return {
        floor_name: floorName,
        total_sqft: floorSqft,
        leased_sqft: floorLeasedSqft,
        occupancy_rate: floorOccupancy,
        annual_revenue: floorRevenue,
        avg_rent_per_sqft: floorLeasedSqft > 0 ? Math.round(floorRevenue / floorLeasedSqft) : 0,
        suites
      };
    });

    res.json({
      property_name: propertyName === 'all' ? 'All Portfolio Assets' : propertyName,
      total_sqft: totalPropertySqft || 20000,
      leased_sqft: totalLeasedSqft || 20000,
      occupancy_rate: totalPropertySqft > 0 ? Math.round((totalLeasedSqft / totalPropertySqft) * 100) : 100,
      total_annual_revenue: totalAnnualRev,
      avg_rent_per_sqft: totalLeasedSqft > 0 ? Math.round(totalAnnualRev / totalLeasedSqft) : 0,
      floors
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.769. POST compare two leases side-by-side and generate term variance matrix
app.post('/api/leases/compare', async (req, res) => {
  try {
    const { lease_id_1, lease_id_2 } = req.body;

    if (!lease_id_1 || !lease_id_2) {
      res.status(400).json({ error: 'Both lease_id_1 and lease_id_2 are required' });
      return;
    }

    const leasesRes = await pool.query(
      "SELECT id, filename, property_name, document_type FROM leases WHERE id = ANY($1)",
      [[lease_id_1, lease_id_2]]
    );

    if (leasesRes.rows.length < 2) {
      res.status(404).json({ error: 'One or both target leases were not found' });
      return;
    }

    const lease1 = leasesRes.rows.find((l: any) => l.id === lease_id_1);
    const lease2 = leasesRes.rows.find((l: any) => l.id === lease_id_2);

    const terms1Res = await pool.query("SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1", [lease_id_1]);
    const terms2Res = await pool.query("SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1", [lease_id_2]);

    const terms1Map = new Map<string, string>();
    terms1Res.rows.forEach((t: any) => terms1Map.set(t.term_name, t.extracted_value));

    const terms2Map = new Map<string, string>();
    terms2Res.rows.forEach((t: any) => terms2Map.set(t.term_name, t.extracted_value));

    const allTermKeys = Array.from(new Set([...Array.from(terms1Map.keys()), ...Array.from(terms2Map.keys())]));

    let modifiedCount = 0;
    let addedCount = 0;
    let removedCount = 0;
    let identicalCount = 0;

    const diffMatrix = allTermKeys.map(key => {
      const val1 = terms1Map.get(key) || null;
      const val2 = terms2Map.get(key) || null;

      let status: 'identical' | 'modified' | 'added' | 'removed' = 'identical';
      let deltaSummary = 'No change in term provision';

      if (!val1 && val2) {
        status = 'added';
        deltaSummary = 'New covenant provision introduced';
        addedCount++;
      } else if (val1 && !val2) {
        status = 'removed';
        deltaSummary = 'Covenant provision omitted';
        removedCount++;
      } else if (val1 && val2 && val1.trim() !== val2.trim()) {
        status = 'modified';
        modifiedCount++;

        const num1 = parseFloat(val1.replace(/[^0-9.]/g, ''));
        const num2 = parseFloat(val2.replace(/[^0-9.]/g, ''));
        if (num1 > 0 && num2 > 0) {
          const diffPct = (((num2 - num1) / num1) * 100).toFixed(1);
          deltaSummary = `Value shift: ${diffPct.startsWith('-') ? '' : '+'}${diffPct}% variance`;
        } else {
          deltaSummary = 'Clause language modified';
        }
      } else {
        identicalCount++;
      }

      return {
        term_name: key,
        status,
        lease_1_value: val1 ? val1.split(' (Citation:')[0] : 'N/A',
        lease_2_value: val2 ? val2.split(' (Citation:')[0] : 'N/A',
        delta_summary: deltaSummary
      };
    });

    const totalTerms = diffMatrix.length || 1;
    const varianceScore = Math.round(((modifiedCount + addedCount + removedCount) / totalTerms) * 100);

    res.json({
      lease_1: { id: lease1.id, filename: lease1.filename, property_name: lease1.property_name },
      lease_2: { id: lease2.id, filename: lease2.filename, property_name: lease2.property_name },
      summary: {
        total_terms_compared: totalTerms,
        identical_count: identicalCount,
        modified_count: modifiedCount,
        added_count: addedCount,
        removed_count: removedCount,
        commercial_variance_score: varianceScore
      },
      diff_matrix: diffMatrix
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.770. POST audit tenant CAM and service charge reconciliation
app.post('/api/leases/:id/cam-audit', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      total_building_opex = 500000, 
      building_gross_area_sqft = 50000, 
      tenant_leased_area_sqft = 5000, 
      cap_percentage = 5, 
      cap_type = 'non_cumulative' 
    } = req.body;

    const leaseRes = await pool.query("SELECT id, filename, property_name FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const lease = leaseRes.rows[0];

    const termsRes = await pool.query(
      "SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1",
      [id]
    );
    const termMap = new Map<string, string>();
    termsRes.rows.forEach((t: any) => termMap.set(t.term_name, t.extracted_value));

    const proRataShare = building_gross_area_sqft > 0 
      ? (tenant_leased_area_sqft / building_gross_area_sqft) 
      : 0.10;

    const uncappedTenantShare = Math.round(total_building_opex * proRataShare);
    const priorYearOpex = Math.round(total_building_opex * 0.90);
    const priorYearTenantShare = Math.round(priorYearOpex * proRataShare);

    const maxCapMultiplier = 1 + (cap_percentage / 100);
    const maxAllowedShare = Math.round(priorYearTenantShare * maxCapMultiplier);

    const isOverbilled = uncappedTenantShare > maxAllowedShare;
    const anomalyAmount = isOverbilled ? (uncappedTenantShare - maxAllowedShare) : 0;

    const lineItems = [
      { category: 'Janitorial & Cleaning', building_cost: Math.round(total_building_opex * 0.25), tenant_share: Math.round(uncappedTenantShare * 0.25) },
      { category: 'HVAC & Utilities', building_cost: Math.round(total_building_opex * 0.30), tenant_share: Math.round(uncappedTenantShare * 0.30) },
      { category: 'Property Security & Management', building_cost: Math.round(total_building_opex * 0.20), tenant_share: Math.round(uncappedTenantShare * 0.20) },
      { category: 'Repairs & Common Maintenance', building_cost: Math.round(total_building_opex * 0.15), tenant_share: Math.round(uncappedTenantShare * 0.15) },
      { category: 'Building Insurance', building_cost: Math.round(total_building_opex * 0.10), tenant_share: Math.round(uncappedTenantShare * 0.10) }
    ];

    res.json({
      lease_id: lease.id,
      filename: lease.filename,
      property_name: lease.property_name || 'General Portfolio',
      audit_status: isOverbilled ? 'OVERBILLING_ANOMALY_DETECTED' : 'AUDIT_PASSED',
      pro_rata_share_pct: parseFloat((proRataShare * 100).toFixed(2)),
      building_gross_area_sqft,
      tenant_leased_area_sqft,
      total_building_opex,
      uncapped_tenant_share: uncappedTenantShare,
      prior_year_tenant_share: priorYearTenantShare,
      cap_rule: `${cap_percentage}% ${cap_type}`,
      max_allowed_share: maxAllowedShare,
      overbilled_anomaly_amount: anomalyAmount,
      line_items: lineItems
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.771. POST multi-currency conversion and CPI inflation rent adjuster
app.post('/api/leases/:id/fx-cpi-adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { target_currency = 'EUR', cpi_annual_rate = 3.5 } = req.body;

    const leaseRes = await pool.query("SELECT id, filename, property_name FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const lease = leaseRes.rows[0];

    const termsRes = await pool.query("SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1", [id]);
    const termMap = new Map<string, string>();
    termsRes.rows.forEach((t: any) => termMap.set(t.term_name, t.extracted_value));

    const rentRaw = termMap.get('initial_rent') || '$10,000/month';
    const rentNum = parseFloat(rentRaw.replace(/[^0-9.]/g, '')) || 10000;
    const annualUsdRent = rentRaw.toLowerCase().includes('month') ? rentNum * 12 : (rentNum < 20000 ? rentNum * 12 : rentNum);

    const fxRates: Record<string, { symbol: string, rate: number }> = {
      USD: { symbol: '$', rate: 1.0 },
      EUR: { symbol: '€', rate: 0.92 },
      GBP: { symbol: '£', rate: 0.78 },
      JPY: { symbol: '¥', rate: 155.0 },
      AUD: { symbol: 'A$', rate: 1.52 }
    };

    const targetFx = fxRates[target_currency] || fxRates['EUR'];
    const convertedAnnualRent = Math.round(annualUsdRent * targetFx.rate);
    const convertedMonthlyRent = Math.round((annualUsdRent / 12) * targetFx.rate);

    const currentYear = new Date().getFullYear();
    const cpiMultiplier = 1 + (cpi_annual_rate / 100);
    const cpiTimeline = [];
    let runningRent = convertedAnnualRent;

    for (let i = 0; i < 10; i++) {
      const yr = currentYear + i;
      cpiTimeline.push({
        year: yr,
        annual_rent: Math.round(runningRent),
        currency: target_currency,
        currency_symbol: targetFx.symbol,
        cpi_rate: i === 0 ? 0 : cpi_annual_rate,
        cumulative_growth_pct: parseFloat((((runningRent - convertedAnnualRent) / convertedAnnualRent) * 100).toFixed(1))
      });
      runningRent = runningRent * cpiMultiplier;
    }

    res.json({
      lease_id: lease.id,
      filename: lease.filename,
      property_name: lease.property_name || 'General Portfolio',
      base_currency: 'USD',
      target_currency,
      currency_symbol: targetFx.symbol,
      fx_rate: targetFx.rate,
      converted_initial_annual_rent: convertedAnnualRent,
      converted_initial_monthly_rent: convertedMonthlyRent,
      cpi_annual_rate,
      ten_year_projected_total: Math.round(cpiTimeline.reduce((acc, curr) => acc + curr.annual_rent, 0)),
      cpi_timeline: cpiTimeline
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.772. GET audit ESG and Green Lease environmental compliance
app.get('/api/leases/:id/esg-audit', async (req, res) => {
  try {
    const { id } = req.params;

    const leaseRes = await pool.query("SELECT id, filename, property_name FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const lease = leaseRes.rows[0];

    const termsRes = await pool.query("SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1", [id]);
    const termMap = new Map<string, string>();
    termsRes.rows.forEach((t: any) => termMap.set(t.term_name, t.extracted_value));

    const repairRaw = termMap.get('repair_obligations') || '';
    const useRaw = termMap.get('use_clause') || '';
    const covenantsRaw = termMap.get('indemnity_covenants') || '';
    const combinedText = (repairRaw + ' ' + useRaw + ' ' + covenantsRaw).toLowerCase();

    // 1. Energy Efficiency
    const hasEnergy = combinedText.includes('led') || combinedText.includes('hvac') || combinedText.includes('epc') || combinedText.includes('energy');
    const energyScore = hasEnergy ? 25 : 10;
    const energyStatus = hasEnergy ? 'COMPLIANT' : 'MISSING_COVENANT';

    // 2. Renewable Energy
    const hasRenewable = combinedText.includes('renewable') || combinedText.includes('solar') || combinedText.includes('green tariff') || combinedText.includes('carbon');
    const renewableScore = hasRenewable ? 25 : 5;
    const renewableStatus = hasRenewable ? 'COMPLIANT' : 'MISSING_COVENANT';

    // 3. Waste Management
    const hasWaste = combinedText.includes('waste') || combinedText.includes('recycle') || combinedText.includes('disposal');
    const wasteScore = hasWaste ? 25 : 15;
    const wasteStatus = hasWaste ? 'COMPLIANT' : 'PARTIAL_COMPLIANT';

    // 4. Sustainable Materials
    const hasMaterials = combinedText.includes('sustainable') || combinedText.includes('eco') || combinedText.includes('breeam') || combinedText.includes('leed');
    const materialsScore = hasMaterials ? 25 : 10;
    const materialsStatus = hasMaterials ? 'COMPLIANT' : 'MISSING_COVENANT';

    const totalScore = energyScore + renewableScore + wasteScore + materialsScore;
    let esgGrade = 'F';
    if (totalScore >= 90) esgGrade = 'A+';
    else if (totalScore >= 75) esgGrade = 'A';
    else if (totalScore >= 60) esgGrade = 'B';
    else if (totalScore >= 45) esgGrade = 'C';

    const recommendations = [];
    if (!hasEnergy) recommendations.push('Add Energy Performance Certificate (EPC B+) rating covenant mandate.');
    if (!hasRenewable) recommendations.push('Insert Green Electricity Tariff & 100% renewable power procurement clause.');
    if (!hasWaste) recommendations.push('Include mandatory zero-waste-to-landfill tenant recycling covenants.');
    if (!hasMaterials) recommendations.push('Require SKA / BREEAM Refurbishment certified sustainable fit-out materials.');

    res.json({
      lease_id: lease.id,
      filename: lease.filename,
      property_name: lease.property_name || 'General Portfolio',
      esg_score: totalScore,
      esg_grade: esgGrade,
      compliance_categories: {
        energy_efficiency: { score: energyScore, max: 25, status: energyStatus, detail: 'Energy Performance & HVAC Efficiency' },
        renewable_power: { score: renewableScore, max: 25, status: renewableStatus, detail: 'Renewable Electricity & Carbon Tariff' },
        waste_recycling: { score: wasteScore, max: 25, status: wasteStatus, detail: 'Waste Diversion & Recycling Mandate' },
        sustainable_fitout: { score: materialsScore, max: 25, status: materialsStatus, detail: 'Eco-Certified Alteration Materials' }
      },
      recommendations
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.773. POST generate AI lease negotiation script and counter-offer proposals
app.post('/api/leases/:id/generate-counter-offer', async (req, res) => {
  try {
    const { id } = req.params;
    const { target_risk_level = 'moderate' } = req.body;

    const leaseRes = await pool.query("SELECT id, filename, property_name FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const lease = leaseRes.rows[0];

    const termsRes = await pool.query("SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1", [id]);
    const termMap = new Map<string, string>();
    termsRes.rows.forEach((t: any) => termMap.set(t.term_name, t.extracted_value));

    const indemnity = termMap.get('indemnity_covenants') || 'Full tenant indemnity required';
    const rent = termMap.get('initial_rent') || '$10,000/month';
    const breakClause = termMap.get('break_clause') || 'No break clause specified';

    const proposals = [
      {
        covenant_name: 'Liability & Tenant Indemnity',
        original_value: indemnity,
        counter_proposal_text: 'Tenant liability shall be capped at $5,000,000 per occurrence with a mutual indemnity clause protecting tenant against pre-existing landlord defaults.',
        negotiation_strategy: 'Cite commercial market standards. Landlords in Tier-1 assets regularly accept mutual $5M caps backed by primary insurance policies.'
      },
      {
        covenant_name: 'Break Clause & Exit Flexibility',
        original_value: breakClause,
        counter_proposal_text: 'Tenant shall hold an unconditional break option exercisable at Month 36 upon giving 6 months prior written notice, subject to a 1-month rent penalty.',
        negotiation_strategy: 'Protect business agility. If landlord resists, offer a 2-month rent penalty in exchange for early exit rights.'
      },
      {
        covenant_name: 'Rent & Annual Escalations',
        original_value: rent,
        counter_proposal_text: 'Annual rent escalations shall be tied to CPI but capped at a maximum of 3.0% per annum, non-compounded.',
        negotiation_strategy: 'Hedge inflation volatility. Demonstrate to landlord that 3% cap aligns with long-term commercial yield expectations.'
      }
    ];

    res.json({
      lease_id: lease.id,
      filename: lease.filename,
      property_name: lease.property_name || 'General Portfolio',
      target_risk_level,
      total_proposals: proposals.length,
      counter_proposals: proposals
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.774. POST evaluate sublease rights and secondary space monetization income
app.post('/api/leases/:id/sublease-analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const { unutilized_sqft = 2500, estimated_market_rate_sqft = 45 } = req.body;

    const leaseRes = await pool.query("SELECT id, filename, property_name FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const lease = leaseRes.rows[0];

    const termsRes = await pool.query("SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1", [id]);
    const termMap = new Map<string, string>();
    termsRes.rows.forEach((t: any) => termMap.set(t.term_name, t.extracted_value));

    const useClause = (termMap.get('use_clause') || '').toLowerCase();
    const isSublettingProhibited = useClause.includes('no subletting') || useClause.includes('prohibited');
    const sublettingStatus = isSublettingProhibited ? 'PROHIBITED' : 'PERMITTED_WITH_CONSENT';
    const landlordProfitSharePct = 50;

    const grossAnnualSubleaseIncome = unutilized_sqft * estimated_market_rate_sqft;
    const grossMonthlySubleaseIncome = Math.round(grossAnnualSubleaseIncome / 12);

    const primeAnnualRentPerSqft = 35;
    const excessProfitPerSqft = Math.max(0, estimated_market_rate_sqft - primeAnnualRentPerSqft);
    const landlordAnnualProfitShare = Math.round(unutilized_sqft * excessProfitPerSqft * (landlordProfitSharePct / 100));
    const tenantNetRetainedIncome = grossAnnualSubleaseIncome - landlordAnnualProfitShare;

    res.json({
      lease_id: lease.id,
      filename: lease.filename,
      property_name: lease.property_name || 'General Portfolio',
      subletting_status: sublettingStatus,
      landlord_consent_required: true,
      landlord_consent_sla_days: 30,
      landlord_profit_share_pct: landlordProfitSharePct,
      unutilized_sqft,
      estimated_market_rate_sqft,
      gross_annual_sublease_income: grossAnnualSubleaseIncome,
      gross_monthly_sublease_income: grossMonthlySubleaseIncome,
      landlord_annual_profit_share: landlordAnnualProfitShare,
      tenant_net_retained_annual_income: tenantNetRetainedIncome,
      governance_notes: isSublettingProhibited 
        ? '⚠️ Direct assignment/subletting prohibited in current text. Negotiation required to insert standard reasonable consent clause.' 
        : '✅ Subletting permitted subject to prior written Landlord consent not to be unreasonably withheld or delayed.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.775. GET export lease abstract data to Enterprise ERP XML/JSON schemas (Yardi, MRI Software)
app.get('/api/leases/:id/export-erp', async (req, res) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || 'yardi';

    const leaseRes = await pool.query("SELECT id, filename, property_name, document_type, created_at FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const lease = leaseRes.rows[0];

    const termsRes = await pool.query("SELECT term_name, extracted_value, reviewer_status FROM lease_terms WHERE lease_id = $1", [id]);
    const termMap = new Map<string, string>();
    termsRes.rows.forEach((t: any) => termMap.set(t.term_name, t.extracted_value));

    const tenantName = termMap.get('tenant_name') || 'TechCorp Solutions';
    const rent = termMap.get('initial_rent') || '$10,000/month';
    const expiration = termMap.get('expiration_date') || '2032-12-31';

    if (format === 'yardi') {
      const yardiXml = `<?xml version="1.0" encoding="UTF-8"?>
<YardiPropertyManagementExport xmlns="http://www.yardi.com/Voyager/LeaseExport">
  <Header>
    <ExportTimestamp>${new Date().toISOString()}</ExportTimestamp>
    <SystemOrigin>LeaseLogic AI</SystemOrigin>
  </Header>
  <LeaseRecord id="${lease.id}">
    <PropertyName>${lease.property_name || 'General Portfolio'}</PropertyName>
    <DocumentName>${lease.filename}</DocumentName>
    <TenantName>${tenantName}</TenantName>
    <Financials>
      <InitialRent>${rent}</InitialRent>
      <ExpirationDate>${expiration}</ExpirationDate>
    </Financials>
  </LeaseRecord>
</YardiPropertyManagementExport>`;

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="yardi_lease_${lease.id}.xml"`);
      res.send(yardiXml);
      return;
    } else if (format === 'mri') {
      const mriXml = `<?xml version="1.0" encoding="UTF-8"?>
<MRISoftwareAbstractImport>
  <LeaseHeader>
    <LeaseID>${lease.id}</LeaseID>
    <BuildingCode>${(lease.property_name || 'GEN').substring(0, 5).toUpperCase()}</BuildingCode>
    <TenantReference>${tenantName}</TenantReference>
  </LeaseHeader>
  <TermsSummary>
    <MonthlyRent>${rent}</MonthlyRent>
    <LeaseEndDate>${expiration}</LeaseEndDate>
  </TermsSummary>
</MRISoftwareAbstractImport>`;

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="mri_lease_${lease.id}.xml"`);
      res.send(mriXml);
      return;
    } else {
      res.json({
        system: 'LeaseLogic ERP Adapter',
        format: 'JSON',
        exported_at: new Date().toISOString(),
        lease_id: lease.id,
        filename: lease.filename,
        property_name: lease.property_name || 'General Portfolio',
        tenant_name: tenantName,
        initial_rent: rent,
        expiration_date: expiration,
        terms: Array.from(termMap.entries()).map(([k, v]) => ({ term_name: k, extracted_value: v }))
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.776. GET scan portfolio-wide for data discrepancies and covenant anomalies
app.get('/api/portfolio/audit-anomalies', async (req, res) => {
  try {
    const leasesRes = await pool.query("SELECT id, filename, property_name FROM leases ORDER BY created_at DESC");
    const leases = leasesRes.rows;

    const anomalies: any[] = [];
    let highSeverityCount = 0;
    let mediumSeverityCount = 0;

    for (const lease of leases) {
      const termsRes = await pool.query("SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1", [lease.id]);
      const termMap = new Map<string, string>();
      termsRes.rows.forEach((t: any) => termMap.set(t.term_name, t.extracted_value));

      const rent = termMap.get('initial_rent');
      const expiration = termMap.get('expiration_date');
      const tenant = termMap.get('tenant_name');
      const indemnity = (termMap.get('indemnity_covenants') || '').toLowerCase();
      const breakClause = termMap.get('break_clause');

      if (!rent || !expiration || !tenant) {
        highSeverityCount++;
        anomalies.push({
          lease_id: lease.id,
          filename: lease.filename,
          property_name: lease.property_name || 'General Portfolio',
          severity: 'high',
          issue_type: 'MISSING_CRITICAL_TERMS',
          description: 'Key financial or identity terms (Rent, Expiration, Tenant Name) are unextracted or incomplete.'
        });
      }

      if (indemnity.includes('full') || indemnity.includes('unlimited') || indemnity.includes('without cap')) {
        highSeverityCount++;
        anomalies.push({
          lease_id: lease.id,
          filename: lease.filename,
          property_name: lease.property_name || 'General Portfolio',
          severity: 'high',
          issue_type: 'UNCAPPED_LIABILITY_RISK',
          description: 'Indemnity covenant specifies uncapped tenant liability without standard $5M ceiling.'
        });
      }

      if (!breakClause) {
        mediumSeverityCount++;
        anomalies.push({
          lease_id: lease.id,
          filename: lease.filename,
          property_name: lease.property_name || 'General Portfolio',
          severity: 'medium',
          issue_type: 'NO_BREAK_OPTION',
          description: 'Long-term commitment lacks early break option or exit flexibility clause.'
        });
      }
    }

    const healthScore = Math.max(0, 100 - (highSeverityCount * 15 + mediumSeverityCount * 5));

    res.json({
      total_leases_audited: leases.length,
      portfolio_health_score: healthScore,
      high_severity_anomalies: highSeverityCount,
      medium_severity_anomalies: mediumSeverityCount,
      anomalies
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.777. POST portfolio rent roll stress-testing and economic vacancy scenario simulator
app.post('/api/portfolio/stress-test', async (req, res) => {
  try {
    const { default_rate_pct = 15, vacancy_rate_pct = 10, inflation_surge_pct = 5 } = req.body;

    const termsRes = await pool.query("SELECT extracted_value FROM lease_terms WHERE term_name = 'initial_rent'");
    let baselineGrossRevenue = 0;

    termsRes.rows.forEach((t: any) => {
      const rentRaw = t.extracted_value || '';
      const rentNum = parseFloat(rentRaw.replace(/[^0-9.]/g, '')) || 10000;
      const annualRent = rentRaw.toLowerCase().includes('month') ? rentNum * 12 : (rentNum < 20000 ? rentNum * 12 : rentNum);
      baselineGrossRevenue += annualRent;
    });

    if (baselineGrossRevenue === 0) baselineGrossRevenue = 1200000;

    const baselineOpex = Math.round(baselineGrossRevenue * 0.35);
    const baselineNoi = baselineGrossRevenue - baselineOpex;
    const debtServiceAnnual = Math.round(baselineGrossRevenue * 0.50);
    const baselineDscr = parseFloat((baselineNoi / debtServiceAnnual).toFixed(2));

    const defaultLoss = baselineGrossRevenue * (default_rate_pct / 100);
    const vacancyLoss = baselineGrossRevenue * (vacancy_rate_pct / 100);
    const stressRevenue = Math.max(0, baselineGrossRevenue - defaultLoss - vacancyLoss);

    const stressOpex = Math.round(baselineOpex * (1 + inflation_surge_pct / 100));
    const stressNoi = Math.round(stressRevenue - stressOpex);
    const stressDscr = parseFloat((stressNoi / debtServiceAnnual).toFixed(2));

    let solvencyStatus = 'SAFE';
    if (stressDscr < 1.0) solvencyStatus = 'CRITICAL_DEFAULT_RISK';
    else if (stressDscr < 1.25) solvencyStatus = 'MODERATE_RISK';

    res.json({
      baseline: {
        annual_gross_revenue: Math.round(baselineGrossRevenue),
        operating_expenses: baselineOpex,
        net_operating_income: baselineNoi,
        annual_debt_service: debtServiceAnnual,
        dscr: baselineDscr
      },
      stress_test: {
        default_rate_pct,
        vacancy_rate_pct,
        inflation_surge_pct,
        stress_annual_revenue: Math.round(stressRevenue),
        stress_operating_expenses: stressOpex,
        stress_net_operating_income: stressNoi,
        stress_dscr: stressDscr,
        noi_variance_pct: parseFloat((((stressNoi - baselineNoi) / baselineNoi) * 100).toFixed(1)),
        solvency_status: solvencyStatus
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.778. GET tenant concentration risk and Herfindahl-Hirschman Index (HHI) analysis
app.get('/api/portfolio/tenant-concentration', async (req, res) => {
  try {
    const leasesRes = await pool.query("SELECT id, filename, property_name FROM leases");
    const leases = leasesRes.rows;

    const tenantRevenueMap = new Map<string, { total_annual_rent: number, lease_count: number, properties: string[] }>();
    let totalPortfolioRevenue = 0;

    for (const lease of leases) {
      const termsRes = await pool.query("SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1", [lease.id]);
      const termMap = new Map<string, string>();
      termsRes.rows.forEach((t: any) => termMap.set(t.term_name, t.extracted_value));

      const tenantName = termMap.get('tenant_name') || 'Unassigned Corporate Tenant';
      const rentRaw = termMap.get('initial_rent') || '$10,000/month';
      const rentNum = parseFloat(rentRaw.replace(/[^0-9.]/g, '')) || 10000;
      const annualRent = rentRaw.toLowerCase().includes('month') ? rentNum * 12 : (rentNum < 20000 ? rentNum * 12 : rentNum);

      totalPortfolioRevenue += annualRent;

      const existing = tenantRevenueMap.get(tenantName) || { total_annual_rent: 0, lease_count: 0, properties: [] };
      existing.total_annual_rent += annualRent;
      existing.lease_count += 1;
      if (lease.property_name && !existing.properties.includes(lease.property_name)) {
        existing.properties.push(lease.property_name);
      }
      tenantRevenueMap.set(tenantName, existing);
    }

    if (totalPortfolioRevenue === 0) totalPortfolioRevenue = 120000;

    let hhiScore = 0;
    const tenants: any[] = [];

    tenantRevenueMap.forEach((val, key) => {
      const sharePct = parseFloat(((val.total_annual_rent / totalPortfolioRevenue) * 100).toFixed(1));
      hhiScore += Math.pow(sharePct, 2);

      tenants.push({
        tenant_name: key,
        total_annual_rent: val.total_annual_rent,
        revenue_share_pct: sharePct,
        lease_count: val.lease_count,
        properties: val.properties.length > 0 ? val.properties : ['General Portfolio']
      });
    });

    tenants.sort((a, b) => b.total_annual_rent - a.total_annual_rent);

    const top3SharePct = tenants.slice(0, 3).reduce((acc, curr) => acc + curr.revenue_share_pct, 0);

    let concentrationCategory = 'LOW_CONCENTRATION';
    if (hhiScore > 2500) concentrationCategory = 'HIGH_CONCENTRATION_RISK';
    else if (hhiScore >= 1500) concentrationCategory = 'MODERATE_CONCENTRATION_RISK';

    res.json({
      total_portfolio_annual_revenue: totalPortfolioRevenue,
      hhi_index: Math.round(hhiScore),
      concentration_category: concentrationCategory,
      top_3_tenant_revenue_share_pct: parseFloat(top3SharePct.toFixed(1)),
      tenants
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.779. GET export custom branded white-label PDF/HTML printable lease abstract document
app.get('/api/leases/:id/export-abstract-pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const leaseRes = await pool.query("SELECT id, filename, property_name, document_type, created_at FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const lease = leaseRes.rows[0];

    const termsRes = await pool.query("SELECT term_name, extracted_value, reviewer_status, confidence_score FROM lease_terms WHERE lease_id = $1 ORDER BY term_name ASC", [id]);
    const termMap = new Map<string, any>();
    termsRes.rows.forEach((t: any) => termMap.set(t.term_name, t));

    const tenantName = termMap.get('tenant_name')?.extracted_value || 'TechCorp Solutions';
    const rent = termMap.get('initial_rent')?.extracted_value || '$10,000/month';
    const expiration = termMap.get('expiration_date')?.extracted_value || 'December 31, 2032';

    const pdfHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LeaseLogic Abstract - ${lease.filename}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.5; margin: 0; padding: 20px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 25px; }
    .logo { font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
    .doc-meta { text-align: right; font-size: 12px; color: #64748b; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .metric-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .metric-val { font-size: 16px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 10px; text-transform: uppercase; background: #e2e8f0; color: #475569; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">⚡ LeaseLogic AI | Institutional Abstract</div>
    <div class="doc-meta">
      <div><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</div>
      <div><strong>Lease Ref ID:</strong> #${lease.id}</div>
    </div>
  </div>

  <div class="summary-card">
    <div>
      <div class="metric-label">Property Asset</div>
      <div class="metric-val">${lease.property_name || 'General Commercial Portfolio'}</div>
    </div>
    <div>
      <div class="metric-label">Corporate Tenant</div>
      <div class="metric-val">${tenantName}</div>
    </div>
    <div>
      <div class="metric-label">Initial Rent Parameter</div>
      <div class="metric-val" style="color: #10b981;">${rent}</div>
    </div>
    <div>
      <div class="metric-label">Lease Expiration</div>
      <div class="metric-val" style="color: #ef4444;">${expiration}</div>
    </div>
  </div>

  <h3 style="font-size: 14px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Extracted Commercial Provisions</h3>
  <table>
    <thead>
      <tr>
        <th>Term Provision</th>
        <th>Extracted Clause Summary</th>
        <th>Confidence Score</th>
        <th>Review Status</th>
      </tr>
    </thead>
    <tbody>
      ${termsRes.rows.map((t: any) => `
        <tr>
          <td style="font-weight: 700; text-transform: capitalize;">${t.term_name.replace(/_/g, ' ')}</td>
          <td>${t.extracted_value}</td>
          <td><span style="font-weight: 700;">${Math.round((t.confidence_score || 0.90) * 100)}%</span></td>
          <td><span class="status-badge">${t.reviewer_status || 'unverified'}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div>Generated automatically by LeaseLogic Enterprise Real Estate AI Engine</div>
    <div>Page 1 of 1</div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(pdfHtml);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.780. POST IFRS 16 / ASC 842 lease accounting and balance sheet calculator
app.post('/api/leases/:id/lease-accounting', async (req, res) => {
  try {
    const { id } = req.params;
    const { discount_rate_pct = 4.5, lease_term_months = 60 } = req.body;

    const termsRes = await pool.query("SELECT extracted_value FROM lease_terms WHERE lease_id = $1 AND term_name = 'initial_rent'", [id]);
    let monthlyRent = 15000;
    if (termsRes.rows.length > 0) {
      const raw = termsRes.rows[0].extracted_value || '';
      const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 15000;
      monthlyRent = raw.toLowerCase().includes('annual') || raw.toLowerCase().includes('/yr') ? num / 12 : (num > 50000 ? num / 12 : num);
    }

    const r = (discount_rate_pct / 100) / 12;
    let presentValue = 0;
    for (let t = 1; t <= lease_term_months; t++) {
      presentValue += monthlyRent / Math.pow(1 + r, t);
    }

    const rouAssetInitial = Math.round(presentValue);
    const leaseLiabilityInitial = Math.round(presentValue);
    const monthlyDepreciation = Math.round(rouAssetInitial / lease_term_months);

    // Build 12-Month Amortization Schedule
    const schedule: any[] = [];
    let currentLiability = leaseLiabilityInitial;
    let currentRou = rouAssetInitial;

    for (let month = 1; month <= 12; month++) {
      const interestExpense = Math.round(currentLiability * r);
      const principalReduction = monthlyRent - interestExpense;
      const endingLiability = Math.max(0, Math.round(currentLiability - principalReduction));
      currentRou = Math.max(0, Math.round(currentRou - monthlyDepreciation));

      schedule.push({
        month,
        beginning_liability: currentLiability,
        payment: Math.round(monthlyRent),
        interest_expense: interestExpense,
        principal_reduction: Math.round(principalReduction),
        ending_liability: endingLiability,
        rou_asset_balance: currentRou
      });

      currentLiability = endingLiability;
    }

    res.json({
      discount_rate_pct,
      lease_term_months,
      monthly_rent: Math.round(monthlyRent),
      rou_asset_initial: rouAssetInitial,
      lease_liability_initial: leaseLiabilityInitial,
      annual_first_year_interest: schedule.reduce((acc, curr) => acc + curr.interest_expense, 0),
      monthly_depreciation: monthlyDepreciation,
      schedule
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.781. POST AI lease renewal vs relocation strategy decision matrix
app.post('/api/leases/:id/renewal-strategy', async (req, res) => {
  try {
    const { id } = req.params;
    const { market_rent_sqft = 48, fitout_capex_sqft = 35, lease_sqft = 5000 } = req.body;

    const termsRes = await pool.query("SELECT extracted_value FROM lease_terms WHERE lease_id = $1 AND term_name = 'initial_rent'", [id]);
    let currentAnnualRent = 180000;
    if (termsRes.rows.length > 0) {
      const raw = termsRes.rows[0].extracted_value || '';
      const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 15000;
      currentAnnualRent = raw.toLowerCase().includes('month') ? num * 12 : (num < 20000 ? num * 12 : num);
    }

    // 5-Year Renewal Model (+3% escalation per year)
    let totalRenewalCost = 0;
    let yearRent = currentAnnualRent;
    for (let y = 1; y <= 5; y++) {
      totalRenewalCost += yearRent;
      yearRent *= 1.03;
    }
    totalRenewalCost = Math.round(totalRenewalCost);

    // 5-Year Relocation Model
    const annualMarketRent = market_rent_sqft * lease_sqft;
    const totalMarketRent5Yr = annualMarketRent * 5;
    const fitoutCapexTotal = fitout_capex_sqft * lease_sqft;
    const movingLegalCost = 15000;
    const totalRelocationCost = Math.round(totalMarketRent5Yr + fitoutCapexTotal + movingLegalCost);

    const netSavings = Math.abs(totalRenewalCost - totalRelocationCost);
    const recommendRenewal = totalRenewalCost <= totalRelocationCost;
    const verdict = recommendRenewal ? 'RECOMMEND_RENEWAL' : 'RECOMMEND_RELOCATION';

    const reasoning = recommendRenewal
      ? `Staying & renewing saves $${netSavings.toLocaleString()} over 5 years by avoiding upfront fit-out CAPEX ($${fitoutCapexTotal.toLocaleString()}) and relocation downtime.`
      : `Relocating saves $${netSavings.toLocaleString()} over 5 years despite fit-out CAPEX due to lower market rent rates ($${market_rent_sqft}/sqft vs current rate).`;

    res.json({
      lease_sqft,
      current_annual_rent: Math.round(currentAnnualRent),
      market_rent_sqft,
      fitout_capex_sqft,
      renewal_5yr_total: totalRenewalCost,
      relocation_5yr_total: totalRelocationCost,
      fitout_capex_total: fitoutCapexTotal,
      net_savings_5yr: netSavings,
      verdict,
      reasoning
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.782. GET geo-spatial micro-market location analytics & rent benchmarks
app.get('/api/leases/:id/spatial-analytics', async (req, res) => {
  try {
    const { id } = req.params;

    const leaseRes = await pool.query("SELECT id, filename, property_name FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const lease = leaseRes.rows[0];

    const termsRes = await pool.query("SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1 AND term_name = 'initial_rent'", [id]);
    let currentRentSqft = 45.0;
    if (termsRes.rows.length > 0) {
      const raw = termsRes.rows[0].extracted_value || '';
      const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 225000;
      const annual = raw.toLowerCase().includes('month') ? num * 12 : (num < 20000 ? num * 12 : num);
      currentRentSqft = parseFloat((annual / 5000).toFixed(2));
    }

    const submarketRentBenchmark = 49.50;
    const variancePct = parseFloat((((currentRentSqft - submarketRentBenchmark) / submarketRentBenchmark) * 100).toFixed(1));

    res.json({
      property_name: lease.property_name || 'General Commercial Asset',
      submarket_zone: 'Central Business District (Prime Financial Hub)',
      current_rent_sqft: currentRentSqft,
      submarket_benchmark_rent_sqft: submarketRentBenchmark,
      variance_vs_market_pct: variancePct,
      variance_status: variancePct <= 0 ? 'BELOW_MARKET_FAVORABLE' : 'ABOVE_MARKET_PREMIUM',
      transit_score: 94,
      walk_score: 91,
      submarket_vacancy_rate_pct: 6.4,
      nearby_transit_nodes: ['Bank Station (0.2 mi)', 'Cannon Street (0.3 mi)', 'Liverpool Street (0.5 mi)']
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.783. POST multi-lease portfolio cross-document term search and natural language query
app.post('/api/portfolio/cross-query', async (req, res) => {
  try {
    const { query = '' } = req.body;
    const lowerQuery = query.toLowerCase();

    const leasesRes = await pool.query("SELECT id, filename, property_name, created_at FROM leases ORDER BY created_at DESC");
    const leases = leasesRes.rows;

    const matchedLeases: any[] = [];

    for (const lease of leases) {
      const termsRes = await pool.query("SELECT term_name, extracted_value, confidence_score FROM lease_terms WHERE lease_id = $1", [lease.id]);
      const matches: any[] = [];

      termsRes.rows.forEach((t: any) => {
        const val = (t.extracted_value || '').toLowerCase();
        const name = (t.term_name || '').toLowerCase();

        if (lowerQuery === '' || val.includes(lowerQuery) || name.includes(lowerQuery) || (lease.property_name && lease.property_name.toLowerCase().includes(lowerQuery))) {
          matches.push({
            term_name: t.term_name,
            extracted_value: t.extracted_value,
            confidence_score: t.confidence_score
          });
        }
      });

      if (matches.length > 0 || lowerQuery === '') {
        matchedLeases.push({
          lease_id: lease.id,
          filename: lease.filename,
          property_name: lease.property_name || 'General Commercial Asset',
          match_count: matches.length,
          matched_terms: matches
        });
      }
    }

    const aiSummary = lowerQuery.length > 0
      ? `Found ${matchedLeases.length} matching lease agreement(s) across your portfolio matching criteria "${query}".`
      : `Displaying all ${matchedLeases.length} indexed lease agreement(s) across portfolio.`;

    res.json({
      query,
      total_matches: matchedLeases.length,
      ai_summary: aiSummary,
      results: matchedLeases
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.784. GET lease approval workflow & multi-party e-signature log
app.get('/api/leases/:id/approval-workflow', async (req, res) => {
  try {
    const { id } = req.params;

    let result = await pool.query("SELECT * FROM lease_approvals WHERE lease_id = $1 ORDER BY created_at ASC", [id]);
    if (result.rows.length === 0) {
      // Seed default 3-stage approval workflow
      const defaultStages = [
        { stage_name: 'Legal Review & Compliance Risk', approver_name: 'Chief Legal Officer' },
        { stage_name: 'Finance Audit & Rent Budgeting', approver_name: 'Head of Financial Control' },
        { stage_name: 'Executive & Board Sign-off', approver_name: 'Managing Director' }
      ];

      for (const st of defaultStages) {
        await pool.query(
          "INSERT INTO lease_approvals (lease_id, stage_name, approver_name, status) VALUES ($1, $2, $3, 'pending')",
          [id, st.stage_name, st.approver_name]
        );
      }
      result = await pool.query("SELECT * FROM lease_approvals WHERE lease_id = $1 ORDER BY created_at ASC", [id]);
    }

    const rows = result.rows;
    const approvedCount = rows.filter((r: any) => r.status === 'approved').length;
    const overallStatus = approvedCount === rows.length ? 'FULLY_APPROVED' : approvedCount > 0 ? 'IN_PROGRESS' : 'PENDING_REVIEW';

    res.json({
      lease_id: id,
      overall_status: overallStatus,
      approved_stages: approvedCount,
      total_stages: rows.length,
      stages: rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.785. POST update approval stage status and log e-signature
app.post('/api/leases/:id/approval-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage_id, status = 'approved', approver_name = 'Authorized Signatory' } = req.body;

    const sigHash = `SIG-SHA256-${Date.now()}-${Math.floor(Math.random() * 899999 + 100000)}`;

    const updateRes = await pool.query(
      `UPDATE lease_approvals 
       SET status = $1, approver_name = $2, signature_hash = $3, approved_at = CURRENT_TIMESTAMP 
       WHERE id = $4 AND lease_id = $5 RETURNING *`,
      [status, approver_name, sigHash, stage_id, id]
    );

    if (updateRes.rows.length === 0) {
      res.status(404).json({ error: 'Approval stage not found' });
      return;
    }

    // Log audit log
    await pool.query(
      "INSERT INTO audit_logs (lease_id, user_name, action_type, description) VALUES ($1, $2, $3, $4)",
      [id, approver_name, 'APPROVAL_SIGNATURE', `Signed approval stage '${updateRes.rows[0].stage_name}' with digital hash ${sigHash}`]
    );

    res.json({ success: true, stage: updateRes.rows[0] });
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

// 4.86. GET proposed redlines for a specific lease
app.get('/api/leases/:id/redlines', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM lease_redlines WHERE lease_id = $1 ORDER BY created_at DESC",
      [id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.87. POST propose or update a redline for a clause
app.post('/api/leases/:id/clauses/:clauseId/redlines', async (req, res) => {
  try {
    const { id, clauseId } = req.params;
    const { redline_text, original_text, author_name } = req.body;

    if (!redline_text || !original_text) {
      res.status(400).json({ error: 'redline_text and original_text are required.' });
      return;
    }

    const author = author_name || 'Legal Advisor';

    // Check if redline already exists for this clause and lease
    const checkExist = await pool.query(
      "SELECT id, redline_text FROM lease_redlines WHERE lease_id = $1 AND clause_id = $2",
      [id, clauseId]
    );

    let result;
    if (checkExist.rows.length > 0) {
      // Update existing redline
      const oldText = checkExist.rows[0].redline_text;
      result = await pool.query(
        `UPDATE lease_redlines 
         SET redline_text = $1, author_name = $2, updated_at = CURRENT_TIMESTAMP
         WHERE lease_id = $3 AND clause_id = $4
         RETURNING *`,
        [redline_text, author, id, clauseId]
      );

      // Create Audit Log entry
      await pool.query(
        `INSERT INTO audit_logs (lease_id, action, table_name, record_id, old_values, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          'update_redline',
          'lease_redlines',
          result.rows[0].id,
          JSON.stringify({ redline_text: oldText }),
          JSON.stringify({ redline_text, author_name: author })
        ]
      );
    } else {
      // Insert new redline
      result = await pool.query(
        `INSERT INTO lease_redlines (lease_id, clause_id, redline_text, original_text, author_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, clauseId, redline_text, original_text, author]
      );

      // Create Audit Log entry
      await pool.query(
        `INSERT INTO audit_logs (lease_id, action, table_name, record_id, old_values, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          'propose_redline',
          'lease_redlines',
          result.rows[0].id,
          JSON.stringify({}),
          JSON.stringify({ redline_text, author_name: author })
        ]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.88. DELETE proposed redline
app.delete('/api/redlines/:redlineId', async (req, res) => {
  try {
    const { redlineId } = req.params;

    // Get lease_id before deletion to log it
    const redlineRes = await pool.query(
      "SELECT id, lease_id, redline_text FROM lease_redlines WHERE id = $1",
      [redlineId]
    );

    if (redlineRes.rows.length === 0) {
      res.status(404).json({ error: 'Redline proposal not found' });
      return;
    }

    const { lease_id, redline_text } = redlineRes.rows[0];

    await pool.query(
      "DELETE FROM lease_redlines WHERE id = $1",
      [redlineId]
    );

    // Create Audit Log entry
    await pool.query(
      `INSERT INTO audit_logs (lease_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        lease_id,
        'delete_redline',
        'lease_redlines',
        redlineId,
        JSON.stringify({ redline_text }),
        JSON.stringify({})
      ]
    );

    res.json({ success: true, message: 'Redline draft successfully removed.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.89. GET export lease document with proposed redlines compiled
app.get('/api/leases/:id/export-redlines', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch lease filename
    const leaseRes = await pool.query("SELECT filename FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const leaseFilename = leaseRes.rows[0].filename;

    // 2. Fetch all clauses
    const clausesRes = await pool.query(
      `SELECT id, clause_number, clause_title, text_content, page_number 
       FROM clauses 
       WHERE lease_id = $1 
       ORDER BY page_number ASC, clause_number ASC`,
      [id]
    );
    const clauses = clausesRes.rows;

    // 3. Fetch all redlines
    const redlinesRes = await pool.query(
      `SELECT lr.*, c.clause_number, c.clause_title, c.page_number
       FROM lease_redlines lr
       JOIN clauses c ON lr.clause_id = c.id
       WHERE lr.lease_id = $1 AND lr.status = 'draft'`,
      [id]
    );
    const redlines = redlinesRes.rows;

    // Create redline mapping by clause_id
    const redlineMap = new Map();
    redlines.forEach(r => redlineMap.set(r.clause_id, r));

    // 4. Build Markdown content
    let md = `# LEASE AGREEMENT DRAFT: ${leaseFilename.replace(/\\.[^/.]+$/, "")}\\n`;
    md += `*Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*\\n`;
    md += `*Document Status: Draft including Proposed Legal Redlines*\\n\\n`;

    md += `## SECTION 1: PROPOSED LEGAL REDLINES SUMMARY\\n\\n`;
    if (redlines.length === 0) {
      md += `*No active redlines or amendments proposed on this lease draft.*\\n\\n`;
    } else {
      md += `| Section / Page Reference | Original Provision Text | Proposed Redlined Amendment | Author | Status |\\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\\n`;
      redlines.forEach(r => {
        const refStr = `Page ${r.page_number}${r.clause_number ? ` - Sec ${r.clause_number}` : ''}${r.clause_title ? ` (${r.clause_title})` : ''}`;
        const cleanOrig = r.original_text.replace(/\\r?\\n/g, ' ').slice(0, 100) + (r.original_text.length > 100 ? '...' : '');
        const cleanRed = r.redline_text.replace(/\\r?\\n/g, ' ').slice(0, 100) + (r.redline_text.length > 100 ? '...' : '');
        md += `| ${refStr} | ${cleanOrig} | **${cleanRed}** | ${r.author_name} | ${r.status.toUpperCase()} |\\n`;
      });
      md += `\\n`;
    }

    md += `---\\n\\n`;
    md += `## SECTION 2: FULL AMENDED LEASE TEXT DRAFT\\n\\n`;

    clauses.forEach(c => {
      const titleStr = `${c.clause_number ? `Section ${c.clause_number}` : ''}${c.clause_title ? ` ${c.clause_title}` : ''}`;
      if (titleStr.trim()) {
        md += `### ${titleStr} (Page ${c.page_number})\\n\\n`;
      } else {
        md += `### Page ${c.page_number} - Unmarked Segment\\n\\n`;
      }

      const redline = redlineMap.get(c.id);
      if (redline) {
        md += `**[AMENDED PROVISION PROPOSED BY ${redline.author_name.toUpperCase()}]:**\\n`;
        md += `> *${redline.redline_text}*\\n\\n`;
        md += `*(Original text: "${redline.original_text.trim()}")*\\n\\n`;
      } else {
        md += `${c.text_content.trim()}\\n\\n`;
      }
    });

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="Amended_Lease_${leaseFilename.replace(/\.[^/.]+$/, "")}.md"`);
    res.send(md);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.95. GET export executive one-pager investment summary memo
app.get('/api/leases/:id/export-memo', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch lease info
    const leaseRes = await pool.query("SELECT * FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    const lease = leaseRes.rows[0];

    // 2. Fetch lease terms
    const termsRes = await pool.query(
      "SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1",
      [id]
    );

    const termMap = new Map<string, string>();
    termsRes.rows.forEach(t => termMap.set(t.term_name, t.extracted_value));

    const initialRent = termMap.get('initial_rent') || 'Not Extracted';
    const commencement = termMap.get('commencement_date') || 'Not Extracted';
    const expiration = termMap.get('expiration_date') || 'Not Extracted';
    const breakClause = termMap.get('break_clause') || 'None / Not Extracted';
    const insurance = termMap.get('indemnity_covenants') || 'Not Extracted';
    const repair = termMap.get('repair_obligations') || 'Not Extracted';

    // 3. Format Executive Investment Memo (Markdown)
    let md = `# EXECUTIVE LEASE INVESTMENT MEMO\n\n`;
    md += `**Document Name**: ${lease.filename}\n`;
    md += `**Building Asset / Property**: ${lease.property_name || 'General Portfolio'}\n`;
    md += `**Document Type**: ${(lease.document_type || 'original_lease').replace('_', ' ').toUpperCase()}\n`;
    md += `**Date Generated**: ${new Date().toLocaleDateString()}\n\n`;

    md += `---\n\n`;
    md += `## 1. Commercial Summary & Financial Commitments\n\n`;
    md += `| Parameter | Summary Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Initial Rent** | ${initialRent.split(' (Citation:')[0]} |\n`;
    md += `| **Commencement Date** | ${commencement.split(' (Citation:')[0]} |\n`;
    md += `| **Expiration Date** | ${expiration.split(' (Citation:')[0]} |\n`;
    md += `| **Tenant Break Option** | ${breakClause.split(' (Citation:')[0]} |\n\n`;

    md += `## 2. Risk Assessment & Legal Obligations\n\n`;
    md += `- **Liability Insurance**: ${insurance.split(' (Citation:')[0]}\n`;
    md += `- **Maintenance & Repair**: ${repair.split(' (Citation:')[0]}\n\n`;

    md += `## 3. Executive Assessment & Action Items\n\n`;
    if (insurance.toLowerCase().includes('tenant') || parseFloat(insurance.replace(/[^0-9.]/g, '')) < 5000000) {
      md += `> ⚠️ **Risk Flag**: Confirm insurance coverage meets institutional requirements ($5M+).\n\n`;
    }
    if (repair.toLowerCase().includes('tenant') && repair.toLowerCase().includes('structural')) {
      md += `> ⚠️ **Critical Risk Flag**: Tenant is assigned structural/roof repair obligations.\n\n`;
    }
    md += `- Review upcoming critical milestone dates in the LeaseLogic Smart Hub.\n`;
    md += `- Verify ground citations in Document Explorer prior to final execution.\n\n`;

    md += `---\n*Generated automatically by LeaseLogic AI Lease Abstraction Platform*\n`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="Executive_Memo_${lease.filename.replace(/\.[^/.]+$/, "")}.md"`);
    res.send(md);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.90. PUT set/clear parent-child relationship of a lease
app.put('/api/leases/:id/relationship', async (req, res) => {
  try {
    const { id } = req.params;
    const { parent_lease_id, document_type } = req.body;

    // Verify lease exists
    const leaseCheck = await pool.query("SELECT id, filename, parent_lease_id FROM leases WHERE id = $1", [id]);
    if (leaseCheck.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }

    const oldParentId = leaseCheck.rows[0].parent_lease_id;
    const docType = document_type || 'original_lease';
    const targetParentId = parent_lease_id === '' || parent_lease_id === null ? null : parent_lease_id;

    // Prevent self-reference
    if (targetParentId === id) {
      res.status(400).json({ error: 'A lease cannot reference itself as a parent.' });
      return;
    }

    // Update relationship
    const result = await pool.query(
      `UPDATE leases 
       SET parent_lease_id = $1, document_type = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [targetParentId, docType, id]
    );

    // Log in audit logs
    const actionName = targetParentId ? 'link_parent' : 'unlink_parent';
    await pool.query(
      `INSERT INTO audit_logs (lease_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, 'leases', $3, $4, $5)`,
      [
        id,
        actionName,
        'leases',
        id,
        JSON.stringify({ parent_lease_id: oldParentId }),
        JSON.stringify({ parent_lease_id: targetParentId, document_type: docType })
      ]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4.91. GET calculated effective terms for a lease hierarchy
app.get('/api/leases/:id/effective-terms', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch this lease
    const leaseRes = await pool.query("SELECT id, filename, parent_lease_id FROM leases WHERE id = $1", [id]);
    if (leaseRes.rows.length === 0) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }

    const lease = leaseRes.rows[0];

    // Find the root parent lease
    let rootParentId = lease.parent_lease_id || lease.id;
    let currentId = lease.parent_lease_id;
    
    // Loop to follow parent pointers to root
    while (currentId) {
      const pRes = await pool.query("SELECT id, parent_lease_id FROM leases WHERE id = $1", [currentId]);
      if (pRes.rows.length > 0 && pRes.rows[0].parent_lease_id && pRes.rows[0].parent_lease_id !== currentId) {
        rootParentId = pRes.rows[0].parent_lease_id;
        currentId = pRes.rows[0].parent_lease_id;
      } else {
        break;
      }
    }

    // 2. Fetch all leases in the hierarchy
    const hierarchyLeasesRes = await pool.query(
      `SELECT id, filename, document_type, created_at
       FROM leases
       WHERE id = $1 OR parent_lease_id = $1
       ORDER BY created_at ASC`,
      [rootParentId]
    );
    const leasesInHierarchy = hierarchyLeasesRes.rows;
    const leaseIds = leasesInHierarchy.map(l => l.id);

    // 3. Fetch all lease terms for all leases in hierarchy
    const termsRes = await pool.query(
      `SELECT t.*, l.filename, l.document_type
       FROM lease_terms t
       JOIN leases l ON t.lease_id = l.id
       WHERE t.lease_id = ANY($1)`,
      [leaseIds]
    );
    const allTerms = termsRes.rows;

    // Map of term definitions
    const standardTermNames = [
      'tenant_name',
      'landlord_name',
      'commencement_date',
      'expiration_date',
      'initial_rent',
      'break_clause',
      'indemnity_covenants',
      'repair_obligations'
    ];

    const effectiveTerms = standardTermNames.map(termName => {
      const parentLease = leasesInHierarchy.find(l => l.id === rootParentId);
      const parentTerm = allTerms.find(t => t.lease_id === rootParentId && t.term_name === termName);
      const originalValue = parentTerm ? parentTerm.extracted_value : null;

      // Build history of this term across the hierarchy chronologically
      const history = leasesInHierarchy.map(l => {
        const term = allTerms.find(t => t.lease_id === l.id && t.term_name === termName);
        return {
          lease_id: l.id,
          filename: l.filename,
          document_type: l.document_type,
          value: term ? term.extracted_value : null,
          reviewer_status: term ? term.reviewer_status : null,
          confidence_score: term ? term.confidence_score : null
        };
      }).filter(h => h.value !== null);

      let effectiveValue = originalValue;
      let sourceLeaseId = rootParentId;
      let sourceFilename = parentLease ? parentLease.filename : 'Parent Lease';
      let isAmended = false;

      // Apply children overrides chronologically
      leasesInHierarchy.forEach(l => {
        if (l.id !== rootParentId) {
          const childTerm = allTerms.find(t => t.lease_id === l.id && t.term_name === termName);
          if (childTerm && childTerm.extracted_value && childTerm.extracted_value.trim() !== '') {
            effectiveValue = childTerm.extracted_value;
            sourceLeaseId = l.id;
            sourceFilename = l.filename;
            isAmended = true;
          }
        }
      });

      return {
        term_name: termName,
        original_value: originalValue,
        effective_value: effectiveValue,
        is_amended: isAmended,
        source_lease_id: sourceLeaseId,
        source_filename: sourceFilename,
        history
      };
    });

    res.json({
      root_parent_id: rootParentId,
      leases: leasesInHierarchy,
      effective_terms: effectiveTerms
    });
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
      ALTER TABLE leases 
      ADD COLUMN IF NOT EXISTS parent_lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'original_lease';
      
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

    // Create lease_redlines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lease_redlines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
          clause_id UUID REFERENCES clauses(id) ON DELETE CASCADE,
          redline_text TEXT NOT NULL,
          original_text TEXT NOT NULL,
          author_name VARCHAR(255) DEFAULT 'Legal Advisor',
          status VARCHAR(50) DEFAULT 'draft',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create lease_approvals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lease_approvals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
          stage_name VARCHAR(255) NOT NULL,
          approver_name VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          signature_hash VARCHAR(255),
          approved_at TIMESTAMP WITH TIME ZONE,
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

    // Add property_name column to leases table if it does not exist
    await pool.query(`
      ALTER TABLE leases 
      ADD COLUMN IF NOT EXISTS property_name VARCHAR(255) DEFAULT 'General Portfolio';
    `);

    console.log('Database migrations verified/completed successfully.');
  } catch (err) {
    console.error('Error running self-healing migrations:', err);
  }

  startWorker();
});
