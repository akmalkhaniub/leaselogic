import pool from './db.js';

export interface RentPeriod {
  year: number;
  start_date: string;
  end_date: string;
  annual_rent: number;
  monthly_rent: number;
  cumulative_rent: number;
}

export interface RentProjection {
  currency: string;
  commencement_date: string;
  expiration_date: string;
  duration_years: number;
  initial_rent_annual: number;
  escalation_value: string;
  escalation_type: 'percent' | 'flat' | 'none';
  escalation_rate: number;
  schedule: RentPeriod[];
  total_rent_cumulative: number;
}

export async function getRentProjection(leaseId: string): Promise<RentProjection> {
  const termsRes = await pool.query(
    "SELECT term_name, extracted_value FROM lease_terms WHERE lease_id = $1",
    [leaseId]
  );

  const termValues = new Map<string, string>();
  for (const row of termsRes.rows) {
    termValues.set(row.term_name, row.extracted_value || '');
  }

  // 1. Currency & Initial Rent parsing
  const initialRentRaw = termValues.get('initial_rent') || '';
  let currency = '£';
  if (initialRentRaw.includes('$')) currency = '$';
  else if (initialRentRaw.includes('€')) currency = '€';

  let cleanRent = initialRentRaw.replace(/,/g, '');
  let annualMatch = cleanRent.match(/(\d+(?:\.\d+)?)\s*(?:per\s*)?(?:annum|annual|year)/i);
  let monthlyMatch = cleanRent.match(/(\d+(?:\.\d+)?)\s*(?:per\s*)?(?:month|monthly)/i);
  let rentAmount = 0;

  if (annualMatch) {
    rentAmount = parseFloat(annualMatch[1]);
  } else if (monthlyMatch) {
    rentAmount = parseFloat(monthlyMatch[1]) * 12;
  } else {
    // Look for any standard large numbers in the text
    const numbers = cleanRent.match(/\b\d{4,9}\b/g);
    if (numbers && numbers.length > 0) {
      rentAmount = Math.max(...numbers.map(Number));
    }
  }
  if (!rentAmount || isNaN(rentAmount)) {
    rentAmount = 100000; // sensible fallback
  }

  // 2. Dates & Duration calculation
  const commencementDateRaw = termValues.get('commencement_date') || '';
  const expirationDateRaw = termValues.get('expiration_date') || '';

  let commDate = new Date(commencementDateRaw);
  let expDate = new Date(expirationDateRaw);

  if (isNaN(commDate.getTime())) {
    commDate = new Date();
  }
  if (isNaN(expDate.getTime())) {
    // Default to 5 years later
    expDate = new Date(commDate.getTime());
    expDate.setFullYear(commDate.getFullYear() + 5);
  }

  // Calculate years duration
  let durationYears = expDate.getFullYear() - commDate.getFullYear();
  const monthsDiff = expDate.getMonth() - commDate.getMonth();
  if (monthsDiff > 6) {
    durationYears += 1;
  } else if (monthsDiff < -6) {
    durationYears -= 1;
  }
  if (durationYears <= 0 || durationYears > 50) {
    durationYears = 5; // fallback
  }

  // 3. Escalation parsing
  const escalationRaw = termValues.get('rent_escalation') || '';
  let cleanEsc = escalationRaw.replace(/,/g, '');
  let rate = 0;
  let type: 'percent' | 'flat' | 'none' = 'none';

  const percentMatch = cleanEsc.match(/(\d+(?:\.\d+)?)\s*%/);
  const flatMatch = cleanEsc.match(/increase[s]?\s*by\s*(?:exactly\s*)?(?:£|\$|€)?\s*(\d+(?:\.\d+)?)/i);

  if (percentMatch) {
    rate = parseFloat(percentMatch[1]);
    type = 'percent';
  } else if (flatMatch) {
    rate = parseFloat(flatMatch[1]);
    type = 'flat';
  }

  // 4. Generate schedule
  const schedule: RentPeriod[] = [];
  let currentRent = rentAmount;
  let cumulative = 0;

  for (let i = 1; i <= durationYears; i++) {
    // Calculate year boundary dates
    const yearStart = new Date(commDate.getTime());
    yearStart.setFullYear(commDate.getFullYear() + i - 1);

    const yearEnd = new Date(commDate.getTime());
    yearEnd.setFullYear(commDate.getFullYear() + i);
    yearEnd.setDate(yearEnd.getDate() - 1);

    // Apply escalation after Year 1
    if (i > 1) {
      if (type === 'percent') {
        currentRent = currentRent * (1 + rate / 100);
      } else if (type === 'flat') {
        currentRent = currentRent + rate;
      }
    }

    // Keep precision to 2 decimals
    const roundedAnnual = Math.round(currentRent * 100) / 100;
    const roundedMonthly = Math.round((currentRent / 12) * 100) / 100;
    cumulative += roundedAnnual;

    schedule.push({
      year: i,
      start_date: yearStart.toISOString().split('T')[0],
      end_date: yearEnd.toISOString().split('T')[0],
      annual_rent: roundedAnnual,
      monthly_rent: roundedMonthly,
      cumulative_rent: Math.round(cumulative * 100) / 100,
    });
  }

  return {
    currency,
    commencement_date: commDate.toISOString().split('T')[0],
    expiration_date: expDate.toISOString().split('T')[0],
    duration_years: durationYears,
    initial_rent_annual: rentAmount,
    escalation_value: escalationRaw,
    escalation_type: type,
    escalation_rate: rate,
    schedule,
    total_rent_cumulative: Math.round(cumulative * 100) / 100,
  };
}
