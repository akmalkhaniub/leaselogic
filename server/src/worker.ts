import fs from 'fs';
import path from 'path';
import pool from './db.js';
import { anthropic, openai } from './ai.js';

let isRunning = false;

export function startWorker() {
  console.log('PostgreSQL queue worker started...');
  setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await processNextJob();
    } catch (err) {
      console.error('Error in worker loop:', err);
    } finally {
      isRunning = false;
    }
  }, 5000);
}

async function processNextJob() {
  // Lock next job using SELECT FOR UPDATE SKIP LOCKED
  const queryResult = await pool.query(`
    UPDATE abstraction_jobs
    SET status = 'processing', locked_at = NOW(), attempts = attempts + 1, started_at = NOW()
    WHERE id = (
        SELECT id FROM abstraction_jobs
        WHERE status = 'queued' AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '15 minutes')
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `);

  if (queryResult.rowCount === 0) {
    return;
  }

  const job = queryResult.rows[0];
  const leaseId = job.lease_id;
  console.log(`Processing job ${job.id} for lease ${leaseId}...`);

  try {
    // 1. Fetch lease metadata
    const leaseRes = await pool.query('SELECT filename FROM leases WHERE id = $1', [leaseId]);
    if (leaseRes.rowCount === 0) {
      throw new Error(`Lease ${leaseId} not found`);
    }
    const filename = leaseRes.rows[0].filename;
    const filePath = path.join('uploads', `${leaseId}.pdf`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Update progress
    await updateJobProgress(job.id, 10);

    // 2. Call FastAPI parser service
    console.log(`Sending lease ${leaseId} to FastAPI parser...`);
    const parserUrl = `${process.env.PARSER_URL || 'http://localhost:8000'}/parse`;
    
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', fileBlob, filename);

    const parserResponse = await fetch(parserUrl, {
      method: 'POST',
      body: formData,
    });

    if (!parserResponse.ok) {
      const errorText = await parserResponse.text();
      throw new Error(`FastAPI parser failed: ${errorText}`);
    }

    const parserData = (await parserResponse.json()) as {
      text: string;
      chunks: {
        text: string;
        clause_number?: string;
        clause_title?: string;
        page_number?: number;
      }[];
    };

    console.log(`Parser returned ${parserData.chunks.length} chunks.`);
    await updateJobProgress(job.id, 40);

    // 3. Generate embeddings and save chunks
    const chunkIds: string[] = [];
    for (let i = 0; i < parserData.chunks.length; i++) {
      const chunk = parserData.chunks[i];
      
      // Call OpenAI to embed the text
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk.text,
      });

      const embedding = embeddingResponse.data[0].embedding;
      const embeddingStr = `[${embedding.join(',')}]`;

      const insertRes = await pool.query(
        `INSERT INTO clauses (lease_id, clause_number, clause_title, text_content, page_number, chunk_strategy, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
         RETURNING id`,
        [
          leaseId,
          chunk.clause_number || null,
          chunk.clause_title || null,
          chunk.text,
          chunk.page_number || null,
          'clause-boundary',
          embeddingStr
        ]
      );

      chunkIds.push(insertRes.rows[0].id);
    }

    console.log(`Saved ${chunkIds.length} clauses with embeddings.`);
    await updateJobProgress(job.id, 70);

    // 4. Extract terms with Claude using Tool Use
    console.log(`Extracting terms for lease ${leaseId} using Claude...`);
    const systemPrompt = `You are a legal lease abstraction AI. Extract structured terms from the lease document text. Ground every extracted term in a citation referring to specific sections, clauses, or headings in the lease text. Make sure your extraction is accurate.`;
    
    // Combine full lease text or top chunks if too long. Let's send the full text since Claude 3.5 Sonnet supports 200k context.
    const extractionResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the full text of the lease agreement:\n\n${parserData.text}\n\nExtract the lease terms using the extract_lease_terms tool.`
        }
      ],
      tools: [
        {
          name: 'extract_lease_terms',
          description: 'Extract key terms and citation clauses from a commercial lease.',
          input_schema: {
            type: 'object',
            properties: {
              tenant_name: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              },
              landlord_name: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              },
              commencement_date: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              },
              expiration_date: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              },
              initial_rent: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              },
              rent_escalation: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              },
              break_clause: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              },
              renewal_option: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              },
              repair_obligations: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              },
              indemnity_covenants: {
                type: 'object',
                properties: { value: { type: 'string' }, citation: { type: 'string' } },
                required: ['value', 'citation']
              }
            },
            required: [
              'tenant_name',
              'landlord_name',
              'commencement_date',
              'expiration_date',
              'initial_rent',
              'rent_escalation',
              'break_clause',
              'renewal_option',
              'repair_obligations',
              'indemnity_covenants'
            ]
          }
        }
      ],
      tool_choice: { type: 'tool', name: 'extract_lease_terms' }
    });

    const toolUseBlock = extractionResponse.content.find(block => block.type === 'tool_use');
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      throw new Error('Claude did not use the extract_lease_terms tool');
    }

    const extractedTerms = toolUseBlock.input as Record<string, { value: string; citation: string }>;
    console.log('Extracted terms from Claude successfully.');

    // Save terms to database
    for (const [termName, termData] of Object.entries(extractedTerms)) {
      // Find matching clause IDs for citation using vector search or direct queries
      let sourceClauseIds: string[] = [];
      if (termData.citation) {
        // Query clauses with text similarity or title match
        const searchRes = await pool.query(
          `SELECT id FROM clauses 
           WHERE lease_id = $1 
           AND (
             clause_number ILIKE $2 
             OR clause_title ILIKE $2 
             OR text_content ILIKE $3
           )
           LIMIT 3`,
          [leaseId, `%${termData.citation}%`, `%${termData.value.substring(0, 30)}%`]
        );
        sourceClauseIds = searchRes.rows.map(row => row.id);
      }

      await pool.query(
        `INSERT INTO lease_terms (lease_id, term_name, extracted_value, confidence_score, source_clause_ids, reviewer_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          leaseId,
          termName,
          `${termData.value} (Citation: ${termData.citation || 'None'})`,
          0.90, // Baseline confidence score
          sourceClauseIds.length > 0 ? sourceClauseIds : null,
          'unreviewed'
        ]
      );
    }

    await updateJobProgress(job.id, 100);

    // Complete Job and update Lease status
    await pool.query(
      `UPDATE abstraction_jobs 
       SET status = 'completed', completed_at = NOW() 
       WHERE id = $1`,
      [job.id]
    );

    await pool.query(
      `UPDATE leases 
       SET status = 'completed', updated_at = NOW() 
       WHERE id = $1`,
      [leaseId]
    );

    console.log(`Lease ${leaseId} abstraction job completed successfully!`);

  } catch (err: any) {
    console.error(`Failed to process job ${job.id}:`, err);
    
    await pool.query(
      `UPDATE abstraction_jobs 
       SET status = 'failed', error_message = $2, completed_at = NOW() 
       WHERE id = $1`,
      [job.id, err?.message || String(err)]
    );

    await pool.query(
      `UPDATE leases 
       SET status = 'failed', updated_at = NOW() 
       WHERE id = $1`,
      [leaseId]
    );
  }
}

async function updateJobProgress(jobId: string, progress: number) {
  await pool.query(
    `UPDATE abstraction_jobs 
     SET progress = $1, updated_at = NOW() 
     WHERE id = $2`,
    [progress, jobId]
  );
}
