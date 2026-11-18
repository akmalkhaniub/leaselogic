'use client';

import React, { useEffect, useState } from 'react';

interface ModelerProps {
  leaseId: string;
  apiBase: string;
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  borderRadius: '10px',
  padding: '16px',
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
};

const kpiGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: '14px'
};

const inputPanelStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
  gap: '14px',
  background: '#f8fafc',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid rgba(15, 23, 42, 0.06)'
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: '4px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(15, 23, 42, 0.14)',
  borderRadius: '6px',
  padding: '8px 10px',
  fontSize: '0.85rem',
  background: '#ffffff',
  color: 'var(--foreground)'
};

function AuditTable({
  title,
  rows
}: {
  title: string;
  rows: Array<{ metric: string; status: string; standard: string; finding: string }>;
}) {
  return (
    <div style={cardStyle}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--foreground)' }}>
        {title}
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(15,23,42,0.08)', textAlign: 'left', color: 'var(--text-muted)' }}>
            <th style={{ padding: '8px 10px' }}>Engineering / Regulatory Dimension</th>
            <th style={{ padding: '8px 10px' }}>Status</th>
            <th style={{ padding: '8px 10px' }}>Standard</th>
            <th style={{ padding: '8px 10px' }}>Underwriting Verification</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, idx) => {
            const passed = item.status.startsWith('PASS');
            return (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                <td style={{ padding: '10px', fontWeight: 600, color: 'var(--foreground)' }}>{item.metric}</td>
                <td style={{ padding: '10px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: passed ? '#dcfce7' : '#fef3c7',
                      color: passed ? '#15803d' : '#b45309'
                    }}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{item.standard}</td>
                <td style={{ padding: '10px', color: 'var(--foreground)' }}>{item.finding}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =========================================================================
// Feature 1: Enhanced Geothermal Systems (EGS) Baseload Power Campus
// =========================================================================
export function EgsGeothermalPowerView({ leaseId, apiBase }: ModelerProps) {
  const [wellpadAcres, setWellpadAcres] = useState(55);
  const [groundRentPerAcre, setGroundRentPerAcre] = useState(26000);
  const [grossPowerMwe, setGrossPowerMwe] = useState(80);
  const [capacityFactorPct, setCapacityFactorPct] = useState(92.0);
  const [ppaPriceMwh, setPpaPriceMwh] = useState(98.0);
  const [thermalRoyaltyPct, setThermalRoyaltyPct] = useState(4.0);
  const [steamConcession, setSteamConcession] = useState(1150000);
  const [dleLithiumTpy, setDleLithiumTpy] = useState(4500);
  const [dleRoyaltyPerTon, setDleRoyaltyPerTon] = useState(420);
  const [seismicityEscrow, setSeismicityEscrow] = useState(380000);
  const [wellPaReserve, setWellPaReserve] = useState(490000);
  const [capRatePct, setCapRatePct] = useState(6.0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/leases/${leaseId}/egs-geothermal-power-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wellpad_acres: wellpadAcres,
          ground_rent_per_acre_year_usd: groundRentPerAcre,
          gross_power_capacity_mwe: grossPowerMwe,
          capacity_factor_pct: capacityFactorPct,
          ppa_price_per_mwh_usd: ppaPriceMwh,
          thermal_royalty_pct: thermalRoyaltyPct,
          steam_offtake_concession_annual_usd: steamConcession,
          dle_lithium_carbonate_tpy: dleLithiumTpy,
          dle_royalty_per_ton_usd: dleRoyaltyPerTon,
          induced_seismicity_monitoring_escrow_annual_usd: seismicityEscrow,
          well_plugging_abandonment_reserve_annual_usd: wellPaReserve,
          egs_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground)' }}>
            🔥 Enhanced Geothermal Systems (EGS) &amp; Deep Hot-Dry-Rock Power Campus
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            24/7 firm baseload MWe stimulation doublets, Direct Lithium Extraction (DLE) brine co-royalties, induced seismicity TLP &amp; BLM P&amp;A escrows.
          </p>
        </div>
        <button
          onClick={runModel}
          disabled={loading}
          style={{
            background: '#ea580c',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Recalculating...' : 'Re-Run EGS Model'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Wellpad Acres</label>
          <input type="number" style={inputStyle} value={wellpadAcres} onChange={(e) => setWellpadAcres(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Ground Rent ($/Acre/Yr)</label>
          <input type="number" style={inputStyle} value={groundRentPerAcre} onChange={(e) => setGroundRentPerAcre(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Baseload Capacity (MWe)</label>
          <input type="number" style={inputStyle} value={grossPowerMwe} onChange={(e) => setGrossPowerMwe(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Capacity Factor (%)</label>
          <input type="number" step="0.5" style={inputStyle} value={capacityFactorPct} onChange={(e) => setCapacityFactorPct(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>PPA Rate ($/MWh)</label>
          <input type="number" style={inputStyle} value={ppaPriceMwh} onChange={(e) => setPpaPriceMwh(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Thermal Royalty (%)</label>
          <input type="number" step="0.25" style={inputStyle} value={thermalRoyaltyPct} onChange={(e) => setThermalRoyaltyPct(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Process Steam Concession ($/Yr)</label>
          <input type="number" style={inputStyle} value={steamConcession} onChange={(e) => setSteamConcession(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>DLE Lithium Output (tpy)</label>
          <input type="number" style={inputStyle} value={dleLithiumTpy} onChange={(e) => setDleLithiumTpy(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>DLE Royalty ($/Ton)</label>
          <input type="number" style={inputStyle} value={dleRoyaltyPerTon} onChange={(e) => setDleRoyaltyPerTon(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Seismicity TLP Escrow ($/Yr)</label>
          <input type="number" style={inputStyle} value={seismicityEscrow} onChange={(e) => setSeismicityEscrow(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Well P&amp;A Reserve ($/Yr)</label>
          <input type="number" style={inputStyle} value={wellPaReserve} onChange={(e) => setWellPaReserve(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>EGS Cap Rate (%)</label>
          <input type="number" step="0.25" style={inputStyle} value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} />
        </div>
      </div>

      {data && (
        <>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL GROSS REVENUE</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                ${(data.total_landlord_gross_revenue_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {data.annual_net_generation_mwh.toLocaleString()} MWh baseload
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>THERMAL + DLE ROYALTIES</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>
                ${((data.annual_thermal_ppa_royalty_usd + data.annual_dle_lithium_royalty_usd) / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                PPA: ${(data.annual_thermal_ppa_royalty_usd / 1e6).toFixed(2)}M · DLE: ${(data.annual_dle_lithium_royalty_usd / 1e6).toFixed(2)}M
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>NET OPERATING INCOME</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                ${(data.net_operating_income_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Reserves: ${(data.total_operating_reserves_annual_usd / 1e3).toFixed(0)}K/yr
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>EGS CAMPUS VALUATION</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
                ${(data.egs_campus_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                @ {data.egs_cap_rate_pct}% Capitalization Rate
              </div>
            </div>
          </div>

          <AuditTable title="DOE Enhanced Geothermal & Mineral Co-Title Compliance Audit" rows={data.egs_compliance_audit || []} />
        </>
      )}
    </div>
  );
}

// =========================================================================
// Feature 2: Green Steel H2-DRI & Electric Arc Furnace (EAF) Mill
// =========================================================================
export function GreenSteelDriView({ leaseId, apiBase }: ModelerProps) {
  const [millAcres, setMillAcres] = useState(140);
  const [groundRentPerAcre, setGroundRentPerAcre] = useState(32000);
  const [oreDockConcession, setOreDockConcession] = useState(1850000);
  const [steelMetricTons, setSteelMetricTons] = useState(1600000);
  const [tonnageRoyalty, setTonnageRoyalty] = useState(2.75);
  const [eafMva, setEafMva] = useState(220);
  const [substationPerMva, setSubstationPerMva] = useState(6500);
  const [baghouseEscrow, setBaghouseEscrow] = useState(720000);
  const [h2SafetyReserve, setH2SafetyReserve] = useState(410000);
  const [capRatePct, setCapRatePct] = useState(6.5);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/leases/${leaseId}/green-steel-dri-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mill_site_acres: millAcres,
          ground_rent_per_acre_year_usd: groundRentPerAcre,
          ore_dock_rail_concession_annual_usd: oreDockConcession,
          annual_green_steel_metric_tons: steelMetricTons,
          landlord_tonnage_royalty_usd: tonnageRoyalty,
          eaf_substation_mva: eafMva,
          substation_lease_per_mva_year_usd: substationPerMva,
          baghouse_refractory_escrow_annual_usd: baghouseEscrow,
          h2_mill_safety_reserve_annual_usd: h2SafetyReserve,
          steel_mill_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground)' }}>
            🏗️ Green Steel H2-DRI &amp; Electric Arc Furnace (EAF) Zero-Carbon Mill
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Hydrogen Direct Reduced Iron mill ground lease, heavy-haul ore rail concession, green steel tonnage royalties, 220 MVA EAF substation &amp; EU CBAM audit.
          </p>
        </div>
        <button
          onClick={runModel}
          disabled={loading}
          style={{
            background: '#0f766e',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Recalculating...' : 'Re-Run Green Steel Model'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Mill Site Acres</label>
          <input type="number" style={inputStyle} value={millAcres} onChange={(e) => setMillAcres(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Ground Rent ($/Acre/Yr)</label>
          <input type="number" style={inputStyle} value={groundRentPerAcre} onChange={(e) => setGroundRentPerAcre(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Ore Dock / Rail Concession ($/Yr)</label>
          <input type="number" style={inputStyle} value={oreDockConcession} onChange={(e) => setOreDockConcession(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Green Steel Output (MT/Yr)</label>
          <input type="number" style={inputStyle} value={steelMetricTons} onChange={(e) => setSteelMetricTons(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Tonnage Royalty ($/MT)</label>
          <input type="number" step="0.25" style={inputStyle} value={tonnageRoyalty} onChange={(e) => setTonnageRoyalty(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>EAF Substation (MVA)</label>
          <input type="number" style={inputStyle} value={eafMva} onChange={(e) => setEafMva(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Substation Lease ($/MVA/Yr)</label>
          <input type="number" style={inputStyle} value={substationPerMva} onChange={(e) => setSubstationPerMva(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Baghouse Escrow ($/Yr)</label>
          <input type="number" style={inputStyle} value={baghouseEscrow} onChange={(e) => setBaghouseEscrow(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>H2 Shaft Safety Reserve ($/Yr)</label>
          <input type="number" style={inputStyle} value={h2SafetyReserve} onChange={(e) => setH2SafetyReserve(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Mill Cap Rate (%)</label>
          <input type="number" step="0.25" style={inputStyle} value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} />
        </div>
      </div>

      {data && (
        <>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL GROSS REVENUE</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                ${(data.total_landlord_gross_revenue_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Ground: ${(data.annual_mill_ground_rent_usd / 1e6).toFixed(2)}M · Rail: ${(data.ore_dock_rail_concession_annual_usd / 1e6).toFixed(2)}M
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TONNAGE + EAF SUBSTATION</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>
                ${((data.annual_green_steel_royalties_usd + data.annual_eaf_substation_lease_usd) / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {(data.annual_green_steel_metric_tons / 1e6).toFixed(2)}M MT/yr · {data.eaf_substation_mva} MVA
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>NET OPERATING INCOME</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                ${(data.net_operating_income_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Reserves: ${(data.total_operating_reserves_annual_usd / 1e6).toFixed(2)}M/yr
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ZERO-CARBON MILL VALUATION</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
                ${(data.green_steel_mill_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                @ {data.steel_mill_cap_rate_pct}% Capitalization Rate
              </div>
            </div>
          </div>

          <AuditTable title="EU CBAM, IEEE 1453 & EPA NESHAP Steel Mill Compliance Audit" rows={data.steel_compliance_audit || []} />
        </>
      )}
    </div>
  );
}

// =========================================================================
// Feature 3: Precision Fermentation & Cultivated Protein Bioreactor Campus
// =========================================================================
export function PrecisionFermentationView({ leaseId, apiBase }: ModelerProps) {
  const [hallSqft, setHallSqft] = useState(85000);
  const [hallRentSqft, setHallRentSqft] = useState(78.0);
  const [capacityLiters, setCapacityLiters] = useState(1200000);
  const [tariffPerLiter, setTariffPerLiter] = useState(1.85);
  const [packagingSqft, setPackagingSqft] = useState(35000);
  const [packagingRentSqft, setPackagingRentSqft] = useState(46.0);
  const [biogasConcession, setBiogasConcession] = useState(680000);
  const [cipSipReserve, setCipSipReserve] = useState(540000);
  const [biosafetyEscrow, setBiosafetyEscrow] = useState(310000);
  const [capRatePct, setCapRatePct] = useState(6.25);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/leases/${leaseId}/precision-fermentation-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bioreactor_hall_sqft: hallSqft,
          hall_rent_per_sqft_year_usd: hallRentSqft,
          total_fermentation_capacity_liters: capacityLiters,
          capacity_tariff_per_liter_year_usd: tariffPerLiter,
          downstream_packaging_sqft: packagingSqft,
          packaging_rent_per_sqft_year_usd: packagingRentSqft,
          biogas_wastewater_concession_annual_usd: biogasConcession,
          cip_sip_sterile_reserve_annual_usd: cipSipReserve,
          biosafety_compliance_escrow_annual_usd: biosafetyEscrow,
          fermentation_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground)' }}>
            🧬 Synthetic Biology Precision Fermentation &amp; Bioreactor Campus
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Food-grade ISO-7 stainless bioreactor suite, vessel liter CIP/SIP utility tariff, downstream cold-chain spray-drying &amp; anaerobic biogas recovery.
          </p>
        </div>
        <button
          onClick={runModel}
          disabled={loading}
          style={{
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Recalculating...' : 'Re-Run Fermentation Model'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Bioreactor Hall (SqFt)</label>
          <input type="number" style={inputStyle} value={hallSqft} onChange={(e) => setHallSqft(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Hall Rent ($/SqFt/Yr)</label>
          <input type="number" style={inputStyle} value={hallRentSqft} onChange={(e) => setHallRentSqft(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Vessel Volume (Liters)</label>
          <input type="number" style={inputStyle} value={capacityLiters} onChange={(e) => setCapacityLiters(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Capacity Tariff ($/L/Yr)</label>
          <input type="number" step="0.05" style={inputStyle} value={tariffPerLiter} onChange={(e) => setTariffPerLiter(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Packaging Wing (SqFt)</label>
          <input type="number" style={inputStyle} value={packagingSqft} onChange={(e) => setPackagingSqft(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Packaging Rent ($/SqFt/Yr)</label>
          <input type="number" style={inputStyle} value={packagingRentSqft} onChange={(e) => setPackagingRentSqft(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Biogas Concession ($/Yr)</label>
          <input type="number" style={inputStyle} value={biogasConcession} onChange={(e) => setBiogasConcession(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>CIP/SIP Sterile Reserve ($/Yr)</label>
          <input type="number" style={inputStyle} value={cipSipReserve} onChange={(e) => setCipSipReserve(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Biosafety Escrow ($/Yr)</label>
          <input type="number" style={inputStyle} value={biosafetyEscrow} onChange={(e) => setBiosafetyEscrow(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Campus Cap Rate (%)</label>
          <input type="number" step="0.25" style={inputStyle} value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} />
        </div>
      </div>

      {data && (
        <>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL GROSS REVENUE</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                ${(data.total_landlord_gross_revenue_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hall: ${(data.annual_bioreactor_hall_rent_usd / 1e6).toFixed(2)}M · Packaging: ${(data.annual_downstream_packaging_rent_usd / 1e6).toFixed(2)}M
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>VESSEL + BIOGAS UTILITY</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
                ${((data.annual_vessel_capacity_tariff_usd + data.biogas_wastewater_concession_annual_usd) / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {(data.total_fermentation_capacity_liters / 1e6).toFixed(2)}M Liters Installed
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>NET OPERATING INCOME</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                ${(data.net_operating_income_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Reserves: ${(data.total_operating_reserves_annual_usd / 1e3).toFixed(0)}K/yr
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>BIOREACTOR CAMPUS VALUATION</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
                ${(data.fermentation_campus_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                @ {data.fermentation_cap_rate_pct}% Capitalization Rate
              </div>
            </div>
          </div>

          <AuditTable title="FDA GRAS, USDA-FSIS & ASME BPE Sterility Compliance Audit" rows={data.fermentation_compliance_audit || []} />
        </>
      )}
    </div>
  );
}

// =========================================================================
// Feature 4: Sovereign AI Inference Edge Micro-Data Center Pod Network
// =========================================================================
export function SovereignAiEdgeView({ leaseId, apiBase }: ModelerProps) {
  const [podSites, setPodSites] = useState(24);
  const [siteLicensePerPod, setSiteLicensePerPod] = useState(185000);
  const [edgeItLoadKw, setEdgeItLoadKw] = useState(18000);
  const [edgeKwTariff, setEdgeKwTariff] = useState(215.0);
  const [crossConnects, setCrossConnects] = useState(960);
  const [crossConnectMrc, setCrossConnectMrc] = useState(275);
  const [wasteHeatRevenue, setWasteHeatRevenue] = useState(920000);
  const [cduReserve, setCduReserve] = useState(1250000);
  const [securityEscrow, setSecurityEscrow] = useState(680000);
  const [capRatePct, setCapRatePct] = useState(5.75);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/leases/${leaseId}/sovereign-ai-edge-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edge_pod_sites_count: podSites,
          annual_site_license_per_pod_usd: siteLicensePerPod,
          total_edge_it_load_kw: edgeItLoadKw,
          edge_kw_tariff_per_kw_month_usd: edgeKwTariff,
          metro_cross_connects_count: crossConnects,
          cross_connect_mrc_usd: crossConnectMrc,
          waste_heat_export_revenue_annual_usd: wasteHeatRevenue,
          cdu_liquid_cooling_reserve_annual_usd: cduReserve,
          sovereign_security_escrow_annual_usd: securityEscrow,
          edge_network_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground)' }}>
            ⚡ Sovereign AI Inference Edge Micro-Data Center &amp; Liquid-Cooled Pod Network
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Distributed urban sub-2ms inference pods, ASHRAE W45 direct-to-chip liquid cooling, sovereign IXP optical cross-connects &amp; municipal waste-heat export.
          </p>
        </div>
        <button
          onClick={runModel}
          disabled={loading}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Recalculating...' : 'Re-Run Sovereign Edge Model'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Urban Edge Pods</label>
          <input type="number" style={inputStyle} value={podSites} onChange={(e) => setPodSites(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Site License ($/Pod/Yr)</label>
          <input type="number" style={inputStyle} value={siteLicensePerPod} onChange={(e) => setSiteLicensePerPod(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Total Edge IT Load (kW)</label>
          <input type="number" style={inputStyle} value={edgeItLoadKw} onChange={(e) => setEdgeItLoadKw(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Edge Power Tariff ($/kW/Mo)</label>
          <input type="number" style={inputStyle} value={edgeKwTariff} onChange={(e) => setEdgeKwTariff(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Metro Cross-Connects</label>
          <input type="number" style={inputStyle} value={crossConnects} onChange={(e) => setCrossConnects(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Cross-Connect MRC ($/Mo)</label>
          <input type="number" style={inputStyle} value={crossConnectMrc} onChange={(e) => setCrossConnectMrc(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>District Heat Export ($/Yr)</label>
          <input type="number" style={inputStyle} value={wasteHeatRevenue} onChange={(e) => setWasteHeatRevenue(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>CDU Cooling Reserve ($/Yr)</label>
          <input type="number" style={inputStyle} value={cduReserve} onChange={(e) => setCduReserve(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Sovereign HSM Escrow ($/Yr)</label>
          <input type="number" style={inputStyle} value={securityEscrow} onChange={(e) => setSecurityEscrow(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Network Cap Rate (%)</label>
          <input type="number" step="0.25" style={inputStyle} value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} />
        </div>
      </div>

      {data && (
        <>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL GROSS REVENUE</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                ${(data.total_landlord_gross_revenue_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                IT Load: ${(data.annual_edge_it_load_tariff_usd / 1e6).toFixed(2)}M ({(data.total_edge_it_load_kw / 1000).toFixed(1)} MW)
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>POD LICENSES + OPTICAL IXP</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                ${((data.annual_edge_site_licenses_usd + data.annual_metro_cross_connects_usd) / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {data.edge_pod_sites_count} Pods · {data.metro_cross_connects_count} IXP Links
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>NET OPERATING INCOME</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                ${(data.net_operating_income_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Reserves: ${(data.total_operating_reserves_annual_usd / 1e6).toFixed(2)}M/yr
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SOVEREIGN NETWORK VALUATION</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
                ${(data.edge_network_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                @ {data.edge_network_cap_rate_pct}% Capitalization Rate
              </div>
            </div>
          </div>

          <AuditTable title="FedRAMP High / Gaia-X & ASHRAE W45 Liquid-Cooling Audit" rows={data.edge_compliance_audit || []} />
        </>
      )}
    </div>
  );
}

// =========================================================================
// Feature 5: Autonomous Electric Inland Barge Hub & Shore-Power Terminal
// =========================================================================
export function ElectricBargeTerminalView({ leaseId, apiBase }: ModelerProps) {
  const [riverfrontAcres, setRiverfrontAcres] = useState(60);
  const [riverfrontRent, setRiverfrontRent] = useState(34000);
  const [bargeCalls, setBargeCalls] = useState(1400);
  const [berthAmpFee, setBerthAmpFee] = useState(2450);
  const [shortTons, setShortTons] = useState(4200000);
  const [wharfagePerTon, setWharfagePerTon] = useState(0.95);
  const [swapCycles, setSwapCycles] = useState(6500);
  const [swapFee, setSwapFee] = useState(190);
  const [dredgingReserve, setDredgingReserve] = useState(640000);
  const [vtsEscrow, setVtsEscrow] = useState(290000);
  const [capRatePct, setCapRatePct] = useState(6.0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/leases/${leaseId}/electric-barge-terminal-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminal_riverfront_acres: riverfrontAcres,
          riverfront_rent_per_acre_year_usd: riverfrontRent,
          annual_barge_calls: bargeCalls,
          berth_amp_fee_per_call_usd: berthAmpFee,
          annual_short_tons_throughput: shortTons,
          wharfage_tariff_per_ton_usd: wharfagePerTon,
          battery_swap_cycles_annual: swapCycles,
          swap_fee_per_cycle_usd: swapFee,
          channel_dredging_scour_reserve_annual_usd: dredgingReserve,
          uscg_maritime_vts_escrow_annual_usd: vtsEscrow,
          barge_terminal_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground)' }}>
            🚢 Autonomous Electric Inland Barge Hub &amp; Shore-Power River Terminal
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Electrified inland riverfront bulkhead lease, IEC 80005-1 HVSC shore-power berth fees, swappable maritime battery containers &amp; USACE channel dredging escrow.
          </p>
        </div>
        <button
          onClick={runModel}
          disabled={loading}
          style={{
            background: '#0369a1',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Recalculating...' : 'Re-Run Barge Terminal Model'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Riverfront Acres</label>
          <input type="number" style={inputStyle} value={riverfrontAcres} onChange={(e) => setRiverfrontAcres(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Bulkhead Rent ($/Acre/Yr)</label>
          <input type="number" style={inputStyle} value={riverfrontRent} onChange={(e) => setRiverfrontRent(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Annual Barge Calls</label>
          <input type="number" style={inputStyle} value={bargeCalls} onChange={(e) => setBargeCalls(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Berth + AMP Fee ($/Call)</label>
          <input type="number" style={inputStyle} value={berthAmpFee} onChange={(e) => setBerthAmpFee(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Cargo Throughput (Tons/Yr)</label>
          <input type="number" style={inputStyle} value={shortTons} onChange={(e) => setShortTons(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Wharfage Tariff ($/Ton)</label>
          <input type="number" step="0.05" style={inputStyle} value={wharfagePerTon} onChange={(e) => setWharfagePerTon(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Battery Swap Cycles/Yr</label>
          <input type="number" style={inputStyle} value={swapCycles} onChange={(e) => setSwapCycles(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Swap Fee ($/Cycle)</label>
          <input type="number" style={inputStyle} value={swapFee} onChange={(e) => setSwapFee(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>USACE Dredging Reserve ($/Yr)</label>
          <input type="number" style={inputStyle} value={dredgingReserve} onChange={(e) => setDredgingReserve(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>USCG VTS Cyber Escrow ($/Yr)</label>
          <input type="number" style={inputStyle} value={vtsEscrow} onChange={(e) => setVtsEscrow(Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Terminal Cap Rate (%)</label>
          <input type="number" step="0.25" style={inputStyle} value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} />
        </div>
      </div>

      {data && (
        <>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL GROSS REVENUE</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                ${(data.total_landlord_gross_revenue_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Bulkhead: ${(data.annual_riverfront_ground_rent_usd / 1e6).toFixed(2)}M · Wharfage: ${(data.annual_wharfage_throughput_usd / 1e6).toFixed(2)}M
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>AMP SHORE-POWER + SWAPS</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                ${((data.annual_berth_amp_fees_usd + data.annual_battery_swap_concession_usd) / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {data.annual_barge_calls.toLocaleString()} Calls · {data.battery_swap_cycles_annual.toLocaleString()} Swaps
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>NET OPERATING INCOME</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                ${(data.net_operating_income_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Reserves: ${(data.total_operating_reserves_annual_usd / 1e3).toFixed(0)}K/yr
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>RIVER TERMINAL VALUATION</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
                ${(data.barge_terminal_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                @ {data.barge_terminal_cap_rate_pct}% Capitalization Rate
              </div>
            </div>
          </div>

          <AuditTable title="IEC 80005-1 HVSC, USACE Channel & IMO MASS Compliance Audit" rows={data.barge_compliance_audit || []} />
        </>
      )}
    </div>
  );
}
