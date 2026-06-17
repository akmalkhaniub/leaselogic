import pool from './db.js';

export interface AuditResult {
  lease_id: string;
  filename: string;
  rule_id: string;
  rule_name: string;
  status: 'pass' | 'fail' | 'warn';
  term_value: string;
  message: string;
}

export async function runPortfolioAudit(): Promise<AuditResult[]> {
  const leasesRes = await pool.query("SELECT id, filename FROM leases WHERE status = 'completed'");
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

    // Rule 1: Minimum Liability Insurance ($5,000,000)
    const insuranceData = termsMap.get('indemnity_covenants');
    if (insuranceData) {
      const insuranceVal = insuranceData.value;
      const cleanVal = insuranceVal.replace(/,/g, '');
      const millionMatch = cleanVal.match(/(\d+)\s*(m|million)/i);
      let maxLimit = 0;
      if (millionMatch) {
        maxLimit = parseInt(millionMatch[1]) * 1000000;
      } else {
        const standardMatches = cleanVal.match(/\b\d{5,10}\b/g);
        if (standardMatches) {
          maxLimit = Math.max(...standardMatches.map(Number));
        }
      }

      if (maxLimit === 0) {
        results.push({
          lease_id: lease.id,
          filename: lease.filename,
          rule_id: 'min_insurance',
          rule_name: 'Minimum Public Liability Insurance ($5M)',
          status: 'warn',
          term_value: insuranceVal.split(' (Citation:')[0],
          message: 'Unable to parse explicit insurance limit. Review manually.'
        });
      } else if (maxLimit < 5000000) {
        results.push({
          lease_id: lease.id,
          filename: lease.filename,
          rule_id: 'min_insurance',
          rule_name: 'Minimum Public Liability Insurance ($5M)',
          status: 'fail',
          term_value: insuranceVal.split(' (Citation:')[0],
          message: `Insurance coverage limit ($${maxLimit.toLocaleString()}) is below the required minimum of $5,000,000.`
        });
      } else {
        results.push({
          lease_id: lease.id,
          filename: lease.filename,
          rule_id: 'min_insurance',
          rule_name: 'Minimum Public Liability Insurance ($5M)',
          status: 'pass',
          term_value: insuranceVal.split(' (Citation:')[0],
          message: `Passed: Insurance limit ($${maxLimit.toLocaleString()}) meets the $5,000,000 requirement.`
        });
      }
    }

    // Rule 2: Long-term Expiry Check (must not expire before 2028)
    const expiryData = termsMap.get('expiration_date');
    if (expiryData) {
      const expiryVal = expiryData.value;
      const yearMatch = expiryVal.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year < 2028) {
          results.push({
            lease_id: lease.id,
            filename: lease.filename,
            rule_id: 'expiry_check',
            rule_name: 'Lease Long-term Commitment (Expiry >= 2028)',
            status: 'fail',
            term_value: expiryVal.split(' (Citation:')[0],
            message: `Lease expires in ${year}, which violates the requirement to remain active until at least 2028.`
          });
        } else {
          results.push({
            lease_id: lease.id,
            filename: lease.filename,
            rule_id: 'expiry_check',
            rule_name: 'Lease Long-term Commitment (Expiry >= 2028)',
            status: 'pass',
            term_value: expiryVal.split(' (Citation:')[0],
            message: `Passed: Lease expires in ${year}, meeting the long-term requirement.`
          });
        }
      } else {
        results.push({
          lease_id: lease.id,
          filename: lease.filename,
          rule_id: 'expiry_check',
          rule_name: 'Lease Long-term Commitment (Expiry >= 2028)',
          status: 'warn',
          term_value: expiryVal.split(' (Citation:')[0],
          message: 'Could not parse expiry year. Review manually.'
        });
      }
    }

    // Rule 3: Break Clause Availability
    const breakData = termsMap.get('break_clause');
    if (breakData) {
      const breakVal = breakData.value;
      const isNone = breakVal.toLowerCase().includes('none') || breakVal.toLowerCase().includes('no break') || breakVal.toLowerCase().includes('n/a');
      if (isNone) {
        results.push({
          lease_id: lease.id,
          filename: lease.filename,
          rule_id: 'break_clause',
          rule_name: 'Tenant Break Clause Flexibility',
          status: 'warn',
          term_value: breakVal.split(' (Citation:')[0],
          message: 'No tenant break clause found. The tenant has no early termination rights.'
        });
      } else {
        results.push({
          lease_id: lease.id,
          filename: lease.filename,
          rule_id: 'break_clause',
          rule_name: 'Tenant Break Clause Flexibility',
          status: 'pass',
          term_value: breakVal.split(' (Citation:')[0],
          message: 'Passed: Early break clause option is available to the tenant.'
        });
      }
    }

    // Rule 4: Structural Repair Responsibility
    const repairData = termsMap.get('repair_obligations');
    if (repairData) {
      const repairVal = repairData.value;
      const tenantStructural = repairVal.toLowerCase().includes('tenant') && (repairVal.toLowerCase().includes('structural') || repairVal.toLowerCase().includes('roof') || repairVal.toLowerCase().includes('external'));
      if (tenantStructural) {
        results.push({
          lease_id: lease.id,
          filename: lease.filename,
          rule_id: 'repair_responsibility',
          rule_name: 'Landlord External/Structural Repairs',
          status: 'fail',
          term_value: repairVal.split(' (Citation:')[0],
          message: 'High Risk: Tenant is assigned responsibility for structural, external, or roof repairs.'
        });
      } else {
        results.push({
          lease_id: lease.id,
          filename: lease.filename,
          rule_id: 'repair_responsibility',
          rule_name: 'Landlord External/Structural Repairs',
          status: 'pass',
          term_value: repairVal.split(' (Citation:')[0],
          message: 'Passed: Tenant is only responsible for internal, non-structural maintenance.'
        });
      }
    }
  }

  return results;
}
