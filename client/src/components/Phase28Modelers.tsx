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
// Feature 1: Semiconductor EUV Lithography & Advanced Packaging Fab
// =========================================================================
export function SemiconductorFabView({ leaseId, apiBase }: ModelerProps) {
  const [cleanroomSqft, setCleanroomSqft] = useState(120000);
  const [cleanroomRentSqft, setCleanroomRentSqft] = useState(145.0);
  const [euvBays, setEuvBays] = useState(6);
  const [euvPedestalFee, setEuvPedestalFee] = useState(240000);
  const [waferStarts, setWaferStarts] = useState(420000);
  const [waferRoyaltyFee, setWaferRoyaltyFee] = useState(6.5);
  const [upwConcession, setUpwConcession] = useState(1150000);
  const [substationMw, setSubstationMw] = useState(95);
  const [pfasEscrow, setPfasEscrow] = useState(780000);
  const [vcRating, setVcRating] = useState('VC-G');
  const [chips48dPct, setChips48dPct] = useState(100);
  const [capRatePct, setCapRatePct] = useState(6.25);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModeler = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/semiconductor-euv-fab-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanroom_iso1_subfab_sqft: cleanroomSqft,
          cleanroom_base_rent_per_sqft_year_usd: cleanroomRentSqft,
          euv_scanner_bays_count: euvBays,
          euv_vibration_isolated_pedestal_fee_usd: euvPedestalFee,
          annual_wafer_starts_300mm: waferStarts,
          wafer_start_royalty_fee_usd: waferRoyaltyFee,
          upw_ultrapure_water_plant_concession_annual_usd: upwConcession,
          substation_power_capacity_mw: substationMw,
          pfas_fluorinated_gas_abatement_escrow_annual_usd: pfasEscrow,
          vib_isolation_floor_vc_rating: vcRating,
          chips_act_48d_eligible_pct: chips48dPct,
          semiconductor_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Semiconductor modeler error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModeler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  return (
    <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            💎 Semiconductor EUV Lithography & Advanced Packaging Fab Modeler
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Underwrite ISO Class 1/3 vibration-isolated sub-fab cleanrooms (VC-G/H waffle slabs), EUV pedestal fees, 300mm wafer-start royalties, Ultra-Pure Water (UPW) plants, PFAS scrubber escrows, and CHIPS Act §48D qualification.
          </p>
        </div>
        <button onClick={runModeler} disabled={loading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {loading ? 'Underwriting Fab...' : '💎 Model EUV Semiconductor Fab'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>ISO-1 Sub-Fab Cleanroom (sqft)</label>
          <input type="number" value={cleanroomSqft} onChange={(e) => setCleanroomSqft(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Cleanroom Base Rent ($/sqft/yr)</label>
          <input type="number" value={cleanroomRentSqft} onChange={(e) => setCleanroomRentSqft(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>EUV Lithography Bays</label>
          <input type="number" value={euvBays} onChange={(e) => setEuvBays(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pedestal Isolation Fee ($/bay/yr)</label>
          <input type="number" value={euvPedestalFee} onChange={(e) => setEuvPedestalFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Annual 300mm Wafer Starts</label>
          <input type="number" value={waferStarts} onChange={(e) => setWaferStarts(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Wafer Start Royalty ($/wafer)</label>
          <input type="number" step="0.25" value={waferRoyaltyFee} onChange={(e) => setWaferRoyaltyFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>UPW Water Plant Concession ($/yr)</label>
          <input type="number" value={upwConcession} onChange={(e) => setUpwConcession(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Substation Capacity (MW)</label>
          <input type="number" value={substationMw} onChange={(e) => setSubstationMw(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>PFAS & F-Gas Escrow ($/yr)</label>
          <input type="number" value={pfasEscrow} onChange={(e) => setPfasEscrow(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Floor Micro-Vibration Rating</label>
          <select value={vcRating} onChange={(e) => setVcRating(e.target.value)} style={inputStyle}>
            <option value="VC-G">VC-G (High-NA EUV)</option>
            <option value="VC-F">VC-F (Standard EUV)</option>
            <option value="VC-E">VC-E (DUV Immersion)</option>
            <option value="VC-D">VC-D (Packaging Only)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>CHIPS §48D Eligible Basis (%)</label>
          <input type="number" value={chips48dPct} onChange={(e) => setChips48dPct(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Semiconductor Cap Rate (%)</label>
          <input type="number" step="0.05" value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Landlord Revenue</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                ${data.total_landlord_gross_revenue_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Cleanroom + Pedestals + Wafers + UPW</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Operating Income (NOI)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${data.net_operating_income_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Net of ${data.total_environmental_reserves_annual_usd?.toLocaleString()} PFAS escrow</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capitalized Fab Valuation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                ${(data.semiconductor_asset_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Implied @ {data.semiconductor_cap_rate_pct}% Cap Rate</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wafer Start Royalty Stream</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                ${data.annual_wafer_start_royalties_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{data.annual_wafer_starts_300mm?.toLocaleString()} 300mm starts</div>
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 12px 0' }}>Revenue Waterfall Breakdown</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.84rem' }}>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Base Sub-Fab Cleanroom:</span>{' '}
                <strong>${data.annual_base_cleanroom_rent_usd?.toLocaleString()}</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>EUV Pedestal Bays ({data.euv_scanner_bays_count}):</span>{' '}
                <strong>${data.annual_euv_pedestal_fees_usd?.toLocaleString()}</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>UPW Utility Concession:</span>{' '}
                <strong>${data.upw_ultrapure_water_plant_concession_annual_usd?.toLocaleString()}</strong>
              </div>
              <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: '#9f1239' }}>PFAS Scrubber Escrow:</span>{' '}
                <strong style={{ color: '#be123c' }}>-${data.pfas_fluorinated_gas_abatement_escrow_annual_usd?.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {data.semiconductor_compliance_audit && (
            <AuditTable title="🛡️ IEST-RP-CC012, EPA NESHAP & CHIPS Act §48D Engineering Audit" rows={data.semiconductor_compliance_audit} />
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Feature 2: Quantum Computing Cryogenic Dilution Vault & Photonic Node
// =========================================================================
export function QuantumCryogenicView({ leaseId, apiBase }: ModelerProps) {
  const [vaultSqft, setVaultSqft] = useState(18000);
  const [vaultRentSqft, setVaultRentSqft] = useState(165.0);
  const [fridgeBays, setFridgeBays] = useState(12);
  const [fridgeBayFee, setFridgeBayFee] = useState(110000);
  const [he3Concession, setHe3Concession] = useState(640000);
  const [fiberStrands, setFiberStrands] = useState(48);
  const [fiberIruFee, setFiberIruFee] = useState(14500);
  const [stageTempMk, setStageTempMk] = useState(12);
  const [rfAttenuationDb, setRfAttenuationDb] = useState(115);
  const [heReserve, setHeReserve] = useState(320000);
  const [nistEscrow, setNistEscrow] = useState(240000);
  const [capRatePct, setCapRatePct] = useState(6.5);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModeler = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/quantum-cryogenic-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shielded_cryostat_vault_sqft: vaultSqft,
          faraday_vault_base_rent_per_sqft_year_usd: vaultRentSqft,
          dilution_fridge_bays_count: fridgeBays,
          cryostat_bay_vibration_shield_fee_usd: fridgeBayFee,
          helium3_closed_loop_concession_annual_usd: he3Concession,
          photonic_entanglement_fiber_strands: fiberStrands,
          dark_fiber_iru_fee_per_strand_year_usd: fiberIruFee,
          millikelvin_stage_temp_mk: stageTempMk,
          rf_attenuation_db: rfAttenuationDb,
          helium_recovery_cryo_reserve_annual_usd: heReserve,
          nist_pqc_physical_security_escrow_annual_usd: nistEscrow,
          quantum_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Quantum cryogenic modeler error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModeler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  return (
    <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            ❄️ Quantum Computing Cryogenic Dilution Vault & Photonic Node Modeler
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Underwrite mu-metal Faraday-shielded cryostat halls, dilution refrigerator isolation bays, closed-loop Helium-3 concessions, hollow-core photonic IRUs, and NIST SP 800-53 physical security escrows.
          </p>
        </div>
        <button onClick={runModeler} disabled={loading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {loading ? 'Modeling Cryo-Vault...' : '❄️ Model Quantum Vault'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Faraday Vault Footprint (sqft)</label>
          <input type="number" value={vaultSqft} onChange={(e) => setVaultSqft(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Shielded Vault Rent ($/sqft/yr)</label>
          <input type="number" value={vaultRentSqft} onChange={(e) => setVaultRentSqft(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Dilution Fridge Bays</label>
          <input type="number" value={fridgeBays} onChange={(e) => setFridgeBays(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Cryostat Isolation Fee ($/bay/yr)</label>
          <input type="number" value={fridgeBayFee} onChange={(e) => setFridgeBayFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Helium-3 Loop Concession ($/yr)</label>
          <input type="number" value={he3Concession} onChange={(e) => setHe3Concession(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Photonic Fiber Strands</label>
          <input type="number" value={fiberStrands} onChange={(e) => setFiberStrands(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fiber IRU Fee ($/strand/yr)</label>
          <input type="number" value={fiberIruFee} onChange={(e) => setFiberIruFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Mixing Stage Temp (mK)</label>
          <input type="number" value={stageTempMk} onChange={(e) => setStageTempMk(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>RF Attenuation (dB)</label>
          <input type="number" value={rfAttenuationDb} onChange={(e) => setRfAttenuationDb(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>He-3 Recovery Reserve ($/yr)</label>
          <input type="number" value={heReserve} onChange={(e) => setHeReserve(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>NIST SCIF Security Escrow ($/yr)</label>
          <input type="number" value={nistEscrow} onChange={(e) => setNistEscrow(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Quantum Cap Rate (%)</label>
          <input type="number" step="0.05" value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Vault Revenue</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                ${data.total_landlord_gross_revenue_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Vault + Cryo Bays + He-3 + Fiber IRU</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Operating Income (NOI)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${data.net_operating_income_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Net of ${data.total_operating_reserves_annual_usd?.toLocaleString()} reserves</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quantum Node Valuation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                ${(data.quantum_asset_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Implied @ {data.quantum_cap_rate_pct}% Cap Rate</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Photonic Dark-Fiber IRU</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#7e22ce', marginTop: '4px' }}>
                ${data.annual_photonic_fiber_iru_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{data.photonic_entanglement_fiber_strands} hollow-core strands</div>
            </div>
          </div>

          {data.quantum_compliance_audit && (
            <AuditTable title="🛡️ Cryogenic Thermal Stability, MIL-STD-188-125 RF & NIST Physical Security Audit" rows={data.quantum_compliance_audit} />
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Feature 3: Subsea Transoceanic Fiber Cable Landing Station (CLS)
// =========================================================================
export function SubseaClsView({ leaseId, apiBase }: ModelerProps) {
  const [clsSqft, setClsSqft] = useState(32000);
  const [clsRentSqft, setClsRentSqft] = useState(92.0);
  const [boreholesCount, setBoreholesCount] = useState(6);
  const [boreholeFee, setBoreholeFee] = useState(285000);
  const [mmrCrossConnects, setMmrCrossConnects] = useState(450);
  const [crossConnectMrc, setCrossConnectMrc] = useState(325);
  const [pfeCapacityKw, setPfeCapacityKw] = useState(2400);
  const [pfeTariffKwMonth, setPfeTariffKwMonth] = useState(195.0);
  const [stormReserve, setStormReserve] = useState(410000);
  const [blackStartEscrow, setBlackStartEscrow] = useState(275000);
  const [elevationFeet, setElevationFeet] = useState(24);
  const [capRatePct, setCapRatePct] = useState(5.75);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModeler = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/subsea-cable-cls-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cls_facility_sqft: clsSqft,
          cls_base_rent_per_sqft_year_usd: clsRentSqft,
          subsea_borehole_conduits_count: boreholesCount,
          borehole_beach_easement_annual_fee_usd: boreholeFee,
          mmr_cross_connects_count: mmrCrossConnects,
          cross_connect_monthly_mrc_usd: crossConnectMrc,
          pfe_high_voltage_dc_feed_capacity_kw: pfeCapacityKw,
          pfe_rack_tariff_per_kw_month_usd: pfeTariffKwMonth,
          coastal_storm_hardening_reserve_annual_usd: stormReserve,
          diesel_bess_72hr_autonomy_escrow_annual_usd: blackStartEscrow,
          coastal_elevation_above_mhhw_feet: elevationFeet,
          cls_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Subsea CLS modeler error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModeler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  return (
    <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            🌊 Subsea Transoceanic Fiber Cable Landing Station (CLS) & Meet-Me-Room Hub
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Underwrite HDD beach-manhole conduit easements, high-voltage DC Power Feed Equipment (PFE) suites, Carrier-Neutral MMR cross-connects, FEMA Zone VE storm-surge hardening, and FCC §1.767 compliance.
          </p>
        </div>
        <button onClick={runModeler} disabled={loading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {loading ? 'Modeling CLS Hub...' : '🌊 Model Subsea CLS'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>CLS Building Footprint (sqft)</label>
          <input type="number" value={clsSqft} onChange={(e) => setClsSqft(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>CLS Base Rent ($/sqft/yr)</label>
          <input type="number" value={clsRentSqft} onChange={(e) => setClsRentSqft(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Subsea Borehole Conduits</label>
          <input type="number" value={boreholesCount} onChange={(e) => setBoreholesCount(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Beach Conduit Easement ($/yr)</label>
          <input type="number" value={boreholeFee} onChange={(e) => setBoreholeFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>MMR Optical Cross-Connects</label>
          <input type="number" value={mmrCrossConnects} onChange={(e) => setMmrCrossConnects(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Cross-Connect MRC ($/mo)</label>
          <input type="number" value={crossConnectMrc} onChange={(e) => setCrossConnectMrc(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>PFE DC Power Feed (kW)</label>
          <input type="number" value={pfeCapacityKw} onChange={(e) => setPfeCapacityKw(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>PFE Tariff ($/kW/mo)</label>
          <input type="number" value={pfeTariffKwMonth} onChange={(e) => setPfeTariffKwMonth(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Storm Hardening Reserve ($/yr)</label>
          <input type="number" value={stormReserve} onChange={(e) => setStormReserve(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>72h Black-Start Escrow ($/yr)</label>
          <input type="number" value={blackStartEscrow} onChange={(e) => setBlackStartEscrow(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Surge Elevation (+ft MHHW)</label>
          <input type="number" value={elevationFeet} onChange={(e) => setElevationFeet(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>CLS Cap Rate (%)</label>
          <input type="number" step="0.05" value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Terminal Revenue</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                ${data.total_landlord_gross_revenue_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Base + Boreholes + MMR + PFE Power</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Operating Income (NOI)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${data.net_operating_income_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Net of ${data.total_resilience_reserves_annual_usd?.toLocaleString()} storm reserves</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capitalized CLS Valuation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                ${(data.cls_asset_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Implied @ {data.cls_cap_rate_pct}% Cap Rate</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PFE Repeater Feed + MMR</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                ${((data.annual_pfe_power_feed_usd + data.annual_mmr_cross_connect_usd) / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{data.mmr_cross_connects_count} cross-connects active</div>
            </div>
          </div>

          {data.cls_compliance_audit && (
            <AuditTable title="🛡️ FEMA Zone VE Coastal Elevation, FCC §1.767 & 2N PFE Resilience Audit" rows={data.cls_compliance_audit} />
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Feature 4: Satellite Ground-Segment, Phased-Array Teleport & Optical Hub
// =========================================================================
export function SatelliteTeleportView({ leaseId, apiBase }: ModelerProps) {
  const [acres, setAcres] = useState(30);
  const [groundRentAcre, setGroundRentAcre] = useState(29000);
  const [radomesCount, setRadomesCount] = useState(14);
  const [radomeFee, setRadomeFee] = useState(145000);
  const [opticalDomesCount, setOpticalDomesCount] = useState(4);
  const [opticalDomeFee, setOpticalDomeFee] = useState(320000);
  const [passMinutes, setPassMinutes] = useState(1850000);
  const [passRoyaltyRate, setPassRoyaltyRate] = useState(0.85);
  const [rfBufferEasement, setRfBufferEasement] = useState(460000);
  const [fccEscrow, setFccEscrow] = useState(195000);
  const [pedestalReserve, setPedestalReserve] = useState(240000);
  const [opticalAvailPct, setOpticalAvailPct] = useState(96.8);
  const [capRatePct, setCapRatePct] = useState(6.25);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModeler = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/satellite-teleport-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teleport_campus_acres: acres,
          antenna_pad_ground_rent_per_acre_year_usd: groundRentAcre,
          phased_array_radomes_count: radomesCount,
          radome_pad_license_fee_annual_usd: radomeFee,
          optical_fsoc_domes_count: opticalDomesCount,
          optical_dome_concession_annual_usd: opticalDomeFee,
          annual_satellite_pass_minutes: passMinutes,
          downlink_royalty_per_pass_minute_usd: passRoyaltyRate,
          rf_quiet_zone_buffer_easement_annual_usd: rfBufferEasement,
          fcc_ntia_spectrum_coordination_escrow_annual_usd: fccEscrow,
          pedestal_maintenance_deicing_reserve_annual_usd: pedestalReserve,
          clear_sky_optical_availability_pct: opticalAvailPct,
          teleport_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Satellite teleport modeler error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModeler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  return (
    <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            🌌 Satellite Ground-Segment, Phased-Array Teleport & Optical Downlink Campus
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Underwrite phased-array Ka/Q/V radome pads, 1550nm Free-Space Optical (FSOC) laser-comms domes, RF quiet-zone easements, satellite pass-minute royalties, and FCC Part 25 / NTIA spectrum reserves.
          </p>
        </div>
        <button onClick={runModeler} disabled={loading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {loading ? 'Modeling Teleport...' : '🌌 Model Satellite Teleport'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Teleport Campus (Acres)</label>
          <input type="number" value={acres} onChange={(e) => setAcres(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Ground Rent ($/acre/yr)</label>
          <input type="number" value={groundRentAcre} onChange={(e) => setGroundRentAcre(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Phased-Array Radomes</label>
          <input type="number" value={radomesCount} onChange={(e) => setRadomesCount(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Radome Pad Fee ($/yr)</label>
          <input type="number" value={radomeFee} onChange={(e) => setRadomeFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Optical FSOC Domes</label>
          <input type="number" value={opticalDomesCount} onChange={(e) => setOpticalDomesCount(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Optical Dome Fee ($/yr)</label>
          <input type="number" value={opticalDomeFee} onChange={(e) => setOpticalDomeFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Annual Pass Minutes</label>
          <input type="number" value={passMinutes} onChange={(e) => setPassMinutes(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pass Royalty ($/minute)</label>
          <input type="number" step="0.05" value={passRoyaltyRate} onChange={(e) => setPassRoyaltyRate(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>RF Quiet-Zone Easement ($/yr)</label>
          <input type="number" value={rfBufferEasement} onChange={(e) => setRfBufferEasement(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>FCC/NTIA Escrow ($/yr)</label>
          <input type="number" value={fccEscrow} onChange={(e) => setFccEscrow(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>De-Icing Pedestal Reserve ($/yr)</label>
          <input type="number" value={pedestalReserve} onChange={(e) => setPedestalReserve(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Clear-Sky Availability (%)</label>
          <input type="number" step="0.1" value={opticalAvailPct} onChange={(e) => setOpticalAvailPct(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Teleport Cap Rate (%)</label>
          <input type="number" step="0.05" value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Teleport Revenue</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                ${data.total_landlord_gross_revenue_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Ground + Radomes + FSOC + Passes</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Operating Income (NOI)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${data.net_operating_income_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Net of ${data.total_operating_reserves_annual_usd?.toLocaleString()} reserves</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teleport Asset Valuation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                ${(data.teleport_asset_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Implied @ {data.teleport_cap_rate_pct}% Cap Rate</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Downlink Pass Royalty</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                ${data.annual_pass_minute_royalties_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{data.annual_satellite_pass_minutes?.toLocaleString()} mins tracked</div>
            </div>
          </div>

          {data.teleport_compliance_audit && (
            <AuditTable title="🛡️ FCC Part 25, ITU Optical Diversity & RF Quiet-Zone Audit" rows={data.teleport_compliance_audit} />
          )}
        </div>
      )}
    </div>
  );
}
