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
// Feature 1: Orbital Space Launch Complex, Test Stand & Pad Ground Lease
// =========================================================================
export function OrbitalSpaceLaunchView({ leaseId, apiBase }: ModelerProps) {
  const [padAcres, setPadAcres] = useState(65);
  const [padGroundRent, setPadGroundRent] = useState(38000);
  const [vifSqft, setVifSqft] = useState(45000);
  const [vifRentSqft, setVifRentSqft] = useState(135.0);
  const [testStandsCount, setTestStandsCount] = useState(3);
  const [testStandFee, setTestStandFee] = useState(650000);
  const [annualLaunches, setAnnualLaunches] = useState(24);
  const [launchTariff, setLaunchTariff] = useState(185000);
  const [propellantKg, setPropellantKg] = useState(18000000);
  const [propellantFlowage, setPropellantFlowage] = useState(0.08);
  const [delugeEscrow, setDelugeEscrow] = useState(520000);
  const [faaReserve, setFaaReserve] = useState(380000);
  const [acousticBufferMiles, setAcousticBufferMiles] = useState(3.5);
  const [capRatePct, setCapRatePct] = useState(6.25);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModeler = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/orbital-space-launch-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launch_pad_acres: padAcres,
          launch_pad_ground_rent_per_acre_year_usd: padGroundRent,
          vertical_integration_facility_sqft: vifSqft,
          vif_cleanroom_rent_per_sqft_year_usd: vifRentSqft,
          static_engine_test_stands_count: testStandsCount,
          test_stand_license_fee_annual_usd: testStandFee,
          annual_orbital_launches_count: annualLaunches,
          per_launch_facility_tariff_usd: launchTariff,
          propellant_methalox_throughput_kg: propellantKg,
          propellant_flowage_fee_per_kg_usd: propellantFlowage,
          sound_suppression_deluge_water_escrow_annual_usd: delugeEscrow,
          faa_part_450_range_safety_reserve_annual_usd: faaReserve,
          acoustic_exclusion_buffer_radius_miles: acousticBufferMiles,
          spaceport_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Orbital space launch modeler error:', err);
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
            🛰️ Orbital Space Launch Complex, Clean Propulsion Test Stand & Pad Ground Lease Modeler
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Underwrite active commercial orbital launch pads, Vertical Integration Facilities (VIF ISO-8 cleanrooms), static engine test stands, methalox propellant throughput royalties, water deluge escrows, and FAA 14 CFR Part 450 range licenses.
          </p>
        </div>
        <button onClick={runModeler} disabled={loading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {loading ? 'Modeling Launch Complex...' : '🛰️ Model Orbital Space Launch'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Launch Pad Footprint (Acres)</label>
          <input type="number" value={padAcres} onChange={(e) => setPadAcres(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pad Ground Rent ($/Acre/Yr)</label>
          <input type="number" value={padGroundRent} onChange={(e) => setPadGroundRent(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>VIF Cleanroom Area (sqft)</label>
          <input type="number" value={vifSqft} onChange={(e) => setVifSqft(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>VIF Rent ($/sqft/yr)</label>
          <input type="number" value={vifRentSqft} onChange={(e) => setVifRentSqft(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Static Engine Test Stands</label>
          <input type="number" value={testStandsCount} onChange={(e) => setTestStandsCount(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Test Stand Fee ($/Stand/Yr)</label>
          <input type="number" value={testStandFee} onChange={(e) => setTestStandFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Annual Orbital Launches</label>
          <input type="number" value={annualLaunches} onChange={(e) => setAnnualLaunches(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Per-Launch Tariff ($/Launch)</label>
          <input type="number" value={launchTariff} onChange={(e) => setLaunchTariff(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Propellant Throughput (kg)</label>
          <input type="number" value={propellantKg} onChange={(e) => setPropellantKg(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Deluge Water Escrow ($/yr)</label>
          <input type="number" value={delugeEscrow} onChange={(e) => setDelugeEscrow(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>FAA Part 450 Reserve ($/yr)</label>
          <input type="number" value={faaReserve} onChange={(e) => setFaaReserve(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Spaceport Cap Rate (%)</label>
          <input type="number" step="0.05" value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Spaceport Revenue</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                ${data.total_landlord_gross_revenue_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Pad + VIF + Test Stands + Launches + Fuel</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Operating Income (NOI)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${data.net_operating_income_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Net of ${data.total_operating_reserves_annual_usd?.toLocaleString()} safety reserves</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capitalized Asset Valuation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                ${(data.spaceport_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Implied @ {data.spaceport_cap_rate_pct}% Cap Rate</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Launch Cadence Tariffs</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                ${data.annual_launch_tariffs_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{data.annual_orbital_launches_count} launches @ ${data.per_launch_facility_tariff_usd?.toLocaleString()}</div>
            </div>
          </div>

          {data.spaceport_compliance_audit && (
            <AuditTable title="🛡️ FAA 14 CFR Part 450, Deluge Water Suppression & Range Safety Audit" rows={data.spaceport_compliance_audit} />
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Feature 2: Sustainable Aviation Fuel (SAF) HEFA Biorefinery & Hydrant Pipeline
// =========================================================================
export function SafBiorefineryView({ leaseId, apiBase }: ModelerProps) {
  const [siteAcres, setSiteAcres] = useState(75);
  const [groundRentAcre, setGroundRentAcre] = useState(28000);
  const [pipelineMiles, setPipelineMiles] = useState(18.5);
  const [pipelineRentMile, setPipelineRentMile] = useState(22000);
  const [safGallons, setSafGallons] = useState(65000000);
  const [safPriceGallon, setSafPriceGallon] = useState(5.85);
  const [safRoyaltyFee, setSafRoyaltyFee] = useState(0.055);
  const [hydrantTariff, setHydrantTariff] = useState(0.025);
  const [catalystReserve, setCatalystReserve] = useState(680000);
  const [vocEscrow, setVocEscrow] = useState(340000);
  const [capRatePct, setCapRatePct] = useState(6.50);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModeler = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/saf-biorefinery-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          biorefinery_site_acres: siteAcres,
          plant_ground_rent_per_acre_year_usd: groundRentAcre,
          saf_pipeline_easement_miles: pipelineMiles,
          pipeline_easement_rent_per_mile_year_usd: pipelineRentMile,
          hefa_saf_production_gallons_per_year: safGallons,
          saf_wholesale_price_per_gallon_usd: safPriceGallon,
          landlord_saf_volume_royalty_fee_per_gallon_usd: safRoyaltyFee,
          airport_hydrant_throughput_tariff_per_gallon_usd: hydrantTariff,
          hydrotreating_catalyst_replacement_reserve_annual_usd: catalystReserve,
          voc_leak_detection_flame_safety_escrow_annual_usd: vocEscrow,
          saf_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('SAF biorefinery modeler error:', err);
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
            🧪 Sustainable Aviation Fuel (SAF) HEFA Biorefinery & Airport Hydrant Pipeline Modeler
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Underwrite hydroprocessed esters and fatty acids (HEFA) SAF biorefineries, dedicated jet fuel airport hydrant pipeline easements, ASTM D7566 volumetric royalties, IRA §40B/45Z credits, and hydrotreating catalyst turnarounds.
          </p>
        </div>
        <button onClick={runModeler} disabled={loading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {loading ? 'Modeling Biorefinery...' : '🧪 Model SAF Biorefinery'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Biorefinery Footprint (Acres)</label>
          <input type="number" value={siteAcres} onChange={(e) => setSiteAcres(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Plant Ground Rent ($/Acre/Yr)</label>
          <input type="number" value={groundRentAcre} onChange={(e) => setGroundRentAcre(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Airport Pipeline ROW (Miles)</label>
          <input type="number" value={pipelineMiles} onChange={(e) => setPipelineMiles(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pipeline Rent ($/Mile/Yr)</label>
          <input type="number" value={pipelineRentMile} onChange={(e) => setPipelineRentMile(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Annual SAF Output (Gallons)</label>
          <input type="number" value={safGallons} onChange={(e) => setSafGallons(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>SAF Wholesale Price ($/gal)</label>
          <input type="number" step="0.1" value={safPriceGallon} onChange={(e) => setSafPriceGallon(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Landlord SAF Royalty ($/gal)</label>
          <input type="number" step="0.005" value={safRoyaltyFee} onChange={(e) => setSafRoyaltyFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Airport Hydrant Tariff ($/gal)</label>
          <input type="number" step="0.005" value={hydrantTariff} onChange={(e) => setHydrantTariff(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Catalyst Sinking Fund ($/yr)</label>
          <input type="number" value={catalystReserve} onChange={(e) => setCatalystReserve(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>VOC Flame Safety Escrow ($/yr)</label>
          <input type="number" value={vocEscrow} onChange={(e) => setVocEscrow(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>SAF Cap Rate (%)</label>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Ground + Pipeline ROW + SAF Royalties + Hydrant Tariffs</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Operating Income (NOI)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${data.net_operating_income_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Net of ${data.total_environmental_reserves_annual_usd?.toLocaleString()} catalyst/VOC reserves</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capitalized Biorefinery Valuation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                ${(data.saf_biorefinery_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Implied @ {data.saf_cap_rate_pct}% Cap Rate</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Annual SAF Value Produced</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                ${(data.annual_gross_saf_value_usd / 1e6).toFixed(1)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>+${(data.annual_clean_fuel_tax_credits_usd / 1e6).toFixed(1)}M federal 45Z clean fuel credits</div>
            </div>
          </div>

          {data.saf_compliance_audit && (
            <AuditTable title="🛡️ ASTM D7566 Annex A2 Drop-In, IRA §40B/45Z & PHMSA Safety Audit" rows={data.saf_compliance_audit} />
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Feature 3: Ocean Thermal Energy Conversion (OTEC) & Deep Ocean Water Park
// =========================================================================
export function OtecMarineEnergyView({ leaseId, apiBase }: ModelerProps) {
  const [acres, setAcres] = useState(45);
  const [groundRentAcre, setGroundRentAcre] = useState(31000);
  const [pipelineKm, setPipelineKm] = useState(8.5);
  const [seabedRentKm, setSeabedRentKm] = useState(26000);
  const [powerCapacityMw, setPowerCapacityMw] = useState(30);
  const [capacityFactorPct, setCapacityFactorPct] = useState(95.0);
  const [ppaRateMwh, setPpaRateMwh] = useState(115.0);
  const [landlordRoyaltyPct, setLandlordRoyaltyPct] = useState(2.5);
  const [swacConcession, setSwacConcession] = useState(850000);
  const [waterConcession, setWaterConcession] = useState(420000);
  const [biofoulingReserve, setBiofoulingReserve] = useState(360000);
  const [ammoniaEscrow, setAmmoniaEscrow] = useState(220000);
  const [capRatePct, setCapRatePct] = useState(6.25);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModeler = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/otec-marine-energy-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onshore_park_acres: acres,
          park_ground_rent_per_acre_year_usd: groundRentAcre,
          deep_water_intake_pipeline_length_km: pipelineKm,
          pipeline_seabed_easement_rate_per_km_year_usd: seabedRentKm,
          otec_net_power_capacity_mwe: powerCapacityMw,
          baseload_capacity_factor_pct: capacityFactorPct,
          ppa_offtake_rate_per_mwh_usd: ppaRateMwh,
          landlord_ppa_royalty_pct: landlordRoyaltyPct,
          swac_district_cooling_concession_annual_usd: swacConcession,
          desalinated_potable_water_concession_annual_usd: waterConcession,
          titanium_heat_exchanger_biofouling_reserve_annual_usd: biofoulingReserve,
          ammonia_rankine_loop_containment_escrow_annual_usd: ammoniaEscrow,
          otec_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('OTEC modeler error:', err);
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
            🌊 Ocean Thermal Energy Conversion (OTEC) & Deep Ocean Water (DOW) Industrial Park Modeler
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Underwrite 24/7/365 baseload closed-cycle ammonia Rankine marine power plants, deep seabed cold-water intake pipeline easements, Seawater Air Conditioning (SWAC) district cooling concessions, and titanium heat exchanger biofouling reserves.
          </p>
        </div>
        <button onClick={runModeler} disabled={loading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {loading ? 'Modeling OTEC Campus...' : '🌊 Model OTEC Marine Energy'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Onshore Park Footprint (Acres)</label>
          <input type="number" value={acres} onChange={(e) => setAcres(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Park Ground Rent ($/Acre/Yr)</label>
          <input type="number" value={groundRentAcre} onChange={(e) => setGroundRentAcre(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Deep Intake Pipeline (km)</label>
          <input type="number" step="0.5" value={pipelineKm} onChange={(e) => setPipelineKm(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Seabed Easement ($/km/yr)</label>
          <input type="number" value={seabedRentKm} onChange={(e) => setSeabedRentKm(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>OTEC Net Capacity (MWe)</label>
          <input type="number" value={powerCapacityMw} onChange={(e) => setPowerCapacityMw(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>PPA Offtake Rate ($/MWh)</label>
          <input type="number" value={ppaRateMwh} onChange={(e) => setPpaRateMwh(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Landlord PPA Royalty (%)</label>
          <input type="number" step="0.5" value={landlordRoyaltyPct} onChange={(e) => setLandlordRoyaltyPct(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>SWAC District Cooling Fee ($/yr)</label>
          <input type="number" value={swacConcession} onChange={(e) => setSwacConcession(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Desalinated Water Fee ($/yr)</label>
          <input type="number" value={waterConcession} onChange={(e) => setWaterConcession(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Biofouling Reserve ($/yr)</label>
          <input type="number" value={biofoulingReserve} onChange={(e) => setBiofoulingReserve(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Ammonia Safety Escrow ($/yr)</label>
          <input type="number" value={ammoniaEscrow} onChange={(e) => setAmmoniaEscrow(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>OTEC Cap Rate (%)</label>
          <input type="number" step="0.05" value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Campus Revenue</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                ${data.total_landlord_gross_revenue_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Ground + Seabed ROW + PPA Share + SWAC Cooling + Water</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Operating Income (NOI)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${data.net_operating_income_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Net of ${data.total_operating_reserves_annual_usd?.toLocaleString()} biofouling &amp; ammonia reserves</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capitalized OTEC Valuation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                ${(data.otec_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Implied @ {data.otec_cap_rate_pct}% Cap Rate</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Baseload Generation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                {data.annual_net_generation_mwh?.toLocaleString()} MWh/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{data.baseload_capacity_factor_pct}% capacity factor (24/7 firm)</div>
            </div>
          </div>

          {data.otec_compliance_audit && (
            <AuditTable title="🛡️ Closed-Cycle Ammonia Rankine, SWAC Dual-Use & Seabed Stability Audit" rows={data.otec_compliance_audit} />
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Feature 4: Autonomous Rail Intermodal Inland Port & Robotic Gantry Crane
// =========================================================================
export function RailInlandPortView({ leaseId, apiBase }: ModelerProps) {
  const [yardAcres, setYardAcres] = useState(120);
  const [groundRentAcre, setGroundRentAcre] = useState(24000);
  const [trackFeet, setTrackFeet] = useState(22000);
  const [trackTariffFoot, setTrackTariffFoot] = useState(38.0);
  const [liftMoves, setLiftMoves] = useState(350000);
  const [liftFee, setLiftFee] = useState(18.5);
  const [armgCranesCount, setArmgCranesCount] = useState(12);
  const [armgRoyaltyPerCrane, setArmgRoyaltyPerCrane] = useState(45000);
  const [demurrageRevenue, setDemurrageRevenue] = useState(1250000);
  const [demurrageSharePct, setDemurrageSharePct] = useState(20.0);
  const [switchEscrow, setSwitchEscrow] = useState(420000);
  const [switcherReserve, setSwitcherReserve] = useState(280000);
  const [capRatePct, setCapRatePct] = useState(6.00);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModeler = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/rail-inland-port-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inland_port_yard_acres: yardAcres,
          yard_ground_rent_per_acre_year_usd: groundRentAcre,
          intermodal_rail_track_feet: trackFeet,
          trackage_rights_tariff_per_foot_year_usd: trackTariffFoot,
          annual_container_lift_moves: liftMoves,
          lift_concession_fee_per_move_usd: liftFee,
          electric_armg_cranes_count: armgCranesCount,
          armg_crane_maintenance_royalty_per_crane_year_usd: armgRoyaltyPerCrane,
          container_dwell_demurrage_revenue_annual_usd: demurrageRevenue,
          landlord_demurrage_share_pct: demurrageSharePct,
          rail_switch_derailment_escrow_annual_usd: switchEscrow,
          battery_electric_switcher_tender_reserve_annual_usd: switcherReserve,
          inland_port_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Rail inland port modeler error:', err);
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
            🚆 Autonomous Rail Intermodal Inland Port & Robotic Gantry Crane Terminal Modeler
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Underwrite Class I railroad intermodal inland ports, intermodal trackage rights tariffs, automated rail-mounted gantry (ARMG) container lift fees, dwell demurrage royalties, and FRA track geometry safety escrows.
          </p>
        </div>
        <button onClick={runModeler} disabled={loading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {loading ? 'Modeling Rail Port...' : '🚆 Model Inland Rail Port'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Inland Port Footprint (Acres)</label>
          <input type="number" value={yardAcres} onChange={(e) => setYardAcres(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Yard Ground Rent ($/Acre/Yr)</label>
          <input type="number" value={groundRentAcre} onChange={(e) => setGroundRentAcre(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Intermodal Trackage (Linear Feet)</label>
          <input type="number" value={trackFeet} onChange={(e) => setTrackFeet(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Trackage Tariff ($/Foot/Yr)</label>
          <input type="number" value={trackTariffFoot} onChange={(e) => setTrackTariffFoot(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Annual Container Lifts</label>
          <input type="number" value={liftMoves} onChange={(e) => setLiftMoves(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Lift Concession Fee ($/Lift)</label>
          <input type="number" step="0.5" value={liftFee} onChange={(e) => setLiftFee(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Electric ARMG Cranes</label>
          <input type="number" value={armgCranesCount} onChange={(e) => setArmgCranesCount(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>ARMG Royalty ($/Crane/Yr)</label>
          <input type="number" value={armgRoyaltyPerCrane} onChange={(e) => setArmgRoyaltyPerCrane(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Demurrage Revenue ($/Yr)</label>
          <input type="number" value={demurrageRevenue} onChange={(e) => setDemurrageRevenue(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Landlord Demurrage Share (%)</label>
          <input type="number" step="1" value={demurrageSharePct} onChange={(e) => setDemurrageSharePct(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>FRA Switch Safety Escrow ($/yr)</label>
          <input type="number" value={switchEscrow} onChange={(e) => setSwitchEscrow(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Inland Port Cap Rate (%)</label>
          <input type="number" step="0.05" value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={kpiGridStyle}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Rail Port Revenue</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                ${data.total_landlord_gross_revenue_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Yard + Trackage Rights + ARMG Lifts + Demurrage</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Operating Income (NOI)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${data.net_operating_income_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Net of ${data.total_operating_reserves_annual_usd?.toLocaleString()} FRA switch &amp; tender reserves</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capitalized Terminal Valuation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                ${(data.inland_port_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Implied @ {data.inland_port_cap_rate_pct}% Cap Rate</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Annual Container Throughput</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                {data.annual_container_lift_moves?.toLocaleString()} Lifts
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>${data.annual_lift_concession_usd?.toLocaleString()} annual lift concessions</div>
            </div>
          </div>

          {data.inland_port_compliance_audit && (
            <AuditTable title="🛡️ FRA Track Safety, Dual Class I Mainline Interchange & Zero-Emission ARMG Audit" rows={data.inland_port_compliance_audit} />
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Feature 5: High-Voltage Direct Current (HVDC) Converter Station & ROW
// =========================================================================
export function HvdcConverterStationView({ leaseId, apiBase }: ModelerProps) {
  const [stationAcres, setStationAcres] = useState(40);
  const [groundRentAcre, setGroundRentAcre] = useState(35000);
  const [corridorMiles, setCorridorMiles] = useState(85);
  const [rowTariffMile, setRowTariffMile] = useState(28000);
  const [capacityMw, setCapacityMw] = useState(2000);
  const [voltageKv, setVoltageKv] = useState(525);
  const [wheelingRateKwMonth, setWheelingRateKwMonth] = useState(4.25);
  const [transmittedMwh, setTransmittedMwh] = useState(14500000);
  const [lmpSpreadMwh, setLmpSpreadMwh] = useState(12.50);
  const [congestionSharePct, setCongestionSharePct] = useState(3.5);
  const [valveHallReserve, setValveHallReserve] = useState(850000);
  const [harmonicEscrow, setHarmonicEscrow] = useState(450000);
  const [capRatePct, setCapRatePct] = useState(5.75);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runModeler = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/hvdc-converter-station-modeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          converter_station_site_acres: stationAcres,
          site_ground_rent_per_acre_year_usd: groundRentAcre,
          transmission_row_corridor_miles: corridorMiles,
          row_easement_tariff_per_mile_year_usd: rowTariffMile,
          hvdc_transmission_capacity_mw: capacityMw,
          voltage_rating_plus_minus_kv: voltageKv,
          firm_wheeling_capacity_reservation_rate_per_kw_month_usd: wheelingRateKwMonth,
          annual_transmitted_energy_mwh: transmittedMwh,
          locational_marginal_price_spread_arbitrage_per_mwh_usd: lmpSpreadMwh,
          landlord_lmp_congestion_share_pct: congestionSharePct,
          vsc_igbt_valve_hall_refurbishment_reserve_annual_usd: valveHallReserve,
          harmonic_filter_reactor_escrow_annual_usd: harmonicEscrow,
          hvdc_cap_rate_pct: capRatePct
        })
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('HVDC modeler error:', err);
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
            ⚡ High-Voltage Direct Current (HVDC) Converter Station &amp; Merchant Transmission Interconnector Modeler
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Underwrite ±525 kV VSC modular multilevel converter stations, underground/submarine right-of-way corridor easements, firm bi-directional wheeling tariffs ($/kW-mo), nodal LMP congestion arbitrage, and FERC Order 1920 open-access standards.
          </p>
        </div>
        <button onClick={runModeler} disabled={loading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {loading ? 'Modeling HVDC Interconnector...' : '⚡ Model HVDC Converter Station'}
        </button>
      </div>

      <div style={inputPanelStyle}>
        <div>
          <label style={labelStyle}>Converter Station Site (Acres)</label>
          <input type="number" value={stationAcres} onChange={(e) => setStationAcres(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Site Ground Rent ($/Acre/Yr)</label>
          <input type="number" value={groundRentAcre} onChange={(e) => setGroundRentAcre(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Transmission Corridor (Miles)</label>
          <input type="number" value={corridorMiles} onChange={(e) => setCorridorMiles(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>ROW Easement ($/Mile/Yr)</label>
          <input type="number" value={rowTariffMile} onChange={(e) => setRowTariffMile(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Transmission Rating (MW)</label>
          <input type="number" value={capacityMw} onChange={(e) => setCapacityMw(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Voltage Rating (±kV DC)</label>
          <input type="number" value={voltageKv} onChange={(e) => setVoltageKv(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Firm Wheeling ($/kW/Mo)</label>
          <input type="number" step="0.25" value={wheelingRateKwMonth} onChange={(e) => setWheelingRateKwMonth(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Transmitted Energy (MWh/yr)</label>
          <input type="number" value={transmittedMwh} onChange={(e) => setTransmittedMwh(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>LMP Spread Arbitrage ($/MWh)</label>
          <input type="number" step="0.5" value={lmpSpreadMwh} onChange={(e) => setLmpSpreadMwh(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Congestion Profit Share (%)</label>
          <input type="number" step="0.5" value={congestionSharePct} onChange={(e) => setCongestionSharePct(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>IGBT Valve Hall Reserve ($/yr)</label>
          <input type="number" value={valveHallReserve} onChange={(e) => setValveHallReserve(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>HVDC Cap Rate (%)</label>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Station Ground + ROW Corridor + Wheeling + Congestion</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Operating Income (NOI)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${data.net_operating_income_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Net of ${data.total_operating_reserves_annual_usd?.toLocaleString()} valve hall &amp; filter reserves</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capitalized Grid Valuation</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                ${(data.hvdc_station_valuation_usd / 1e6).toFixed(2)}M
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Implied @ {data.hvdc_cap_rate_pct}% Cap Rate</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Firm Wheeling Revenue</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                ${data.annual_firm_wheeling_tariffs_usd?.toLocaleString()}/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{data.hvdc_transmission_capacity_mw?.toLocaleString()} MW capacity reserved</div>
            </div>
          </div>

          {data.hvdc_compliance_audit && (
            <AuditTable title="🛡️ Voltage Source Converter ±525 kV, FERC Order 1920 & Harmonic IEEE 519 Audit" rows={data.hvdc_compliance_audit} />
          )}
        </div>
      )}
    </div>
  );
}
