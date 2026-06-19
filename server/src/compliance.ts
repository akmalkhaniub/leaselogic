import pool from './db.js';

export interface AuditResult {
  lease_id: string;
  filename: string;
  rule_id: string; // Returns rule_code for frontend and test compatibility
  rule_name: string;
  term_name: string; // The target lease term name
  status: 'pass' | 'fail' | 'warn';
  term_value: string;
  message: string;
}

export async function runPortfolioAudit(): Promise<AuditResult[]> {
  const leasesRes = await pool.query("SELECT id, filename FROM leases WHERE status = 'completed'");
  
  // Fetch compliance rules from the database
  const rulesRes = await pool.query("SELECT * FROM compliance_rules ORDER BY created_at ASC");
  const rules = rulesRes.rows;

  const results: AuditResult[] = [];

  for (const lease of leasesRes.rows) {
    const termsRes = await pool.query(
      "SELECT id, term_name, extracted_value FROM lease_terms WHERE lease_id = $1",
      [lease.id]
    );

    const termsMap = new Map<string, { id: string; value: string }>();
    for (const term of termsRes.rows) {
      termsMap.set(term.term_name, { id: term.id, value: term.extracted_value || '' });
    }

    for (const rule of rules) {
      const termData = termsMap.get(rule.term_name);
      if (!termData) continue;

      const termVal = termData.value;
      const cleanTermVal = termVal.split(' (Citation:')[0]; // Clean out citation from display term

      let status: 'pass' | 'fail' | 'warn' = 'pass';
      let message = '';

      if (rule.operator === 'min_value') {
        const threshold = parseFloat(rule.value_limit);
        // parse numeric value from termVal
        const cleanVal = termVal.replace(/,/g, '');
        const millionMatch = cleanVal.match(/(\d+(?:\.\d+)?)\s*(m|million)/i);
        let parsedNum = 0;
        if (millionMatch) {
          parsedNum = parseFloat(millionMatch[1]) * 1000000;
        } else {
          const standardMatches = cleanVal.match(/\b\d{5,10}\b/g);
          if (standardMatches) {
            parsedNum = Math.max(...standardMatches.map(Number));
          }
        }

        if (parsedNum === 0) {
          status = 'warn';
          message = `Unable to parse numeric limit for ${rule.rule_name}. Review manually.`;
        } else if (parsedNum < threshold) {
          status = rule.severity as 'pass' | 'fail' | 'warn';
          message = rule.message_template
            .replace('{actual}', `$${parsedNum.toLocaleString()}`)
            .replace('{limit}', `$${threshold.toLocaleString()}`);
        } else {
          status = 'pass';
          message = `Passed: ${rule.rule_name} meets the limit (Value: $${parsedNum.toLocaleString()}).`;
        }
      } 
      else if (rule.operator === 'min_year') {
        const thresholdYear = parseInt(rule.value_limit);
        const yearMatch = termVal.match(/\b(20\d{2})\b/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          if (year < thresholdYear) {
            status = rule.severity as 'pass' | 'fail' | 'warn';
            message = rule.message_template
              .replace('{actual}', year.toString())
              .replace('{limit}', thresholdYear.toString());
          } else {
            status = 'pass';
            message = `Passed: ${rule.rule_name} (Year: ${year}).`;
          }
        } else {
          status = 'warn';
          message = `Could not parse year for ${rule.rule_name}. Review manually.`;
        }
      } 
      else if (rule.operator === 'not_contains') {
        // value_limit contains comma-separated keywords to alert on
        const keywords = rule.value_limit.split(',').map((k: string) => k.trim().toLowerCase());
        const lowercaseVal = termVal.toLowerCase();
        const foundKeyword = keywords.find((k: string) => lowercaseVal.includes(k));
        
        if (foundKeyword) {
          status = rule.severity as 'pass' | 'fail' | 'warn';
          message = rule.message_template
            .replace('{actual}', cleanTermVal)
            .replace('{keyword}', foundKeyword)
            .replace('{limit}', rule.value_limit);
        } else {
          status = 'pass';
          message = `Passed: ${rule.rule_name} is compliant.`;
        }
      } 
      else if (rule.operator === 'tenant_structural_repair') {
        // Special logic for repair obligations
        const lowercaseVal = termVal.toLowerCase();
        const tenantStructural = lowercaseVal.includes('tenant') && 
          (lowercaseVal.includes('structural') || lowercaseVal.includes('roof') || lowercaseVal.includes('external'));
        
        if (tenantStructural) {
          status = rule.severity as 'pass' | 'fail' | 'warn';
          message = rule.message_template.replace('{actual}', cleanTermVal);
        } else {
          status = 'pass';
          message = `Passed: ${rule.rule_name} is compliant.`;
        }
      }

      results.push({
        lease_id: lease.id,
        filename: lease.filename,
        rule_id: rule.rule_code,
        rule_name: rule.rule_name,
        term_name: rule.term_name,
        status,
        term_value: cleanTermVal,
        message
      });
    }
  }

  return results;
}
