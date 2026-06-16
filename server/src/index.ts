import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pool from './db.js';
import { startWorker } from './worker.js';
import { openai, anthropic } from './ai.js';
import { runLandRegistryAutomation } from './automation.js';

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
  
  // Run self-healing DB migrations for observability fields
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
    console.log('Database migrations verified/completed successfully.');
  } catch (err) {
    console.error('Error running self-healing migrations:', err);
  }

  startWorker();
});
