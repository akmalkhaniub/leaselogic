'use client';

import React, { useEffect, useMemo, useState } from 'react';

export type ModuleCategory =
  | 'All'
  | 'Core & Legal'
  | 'Finance & Debt'
  | 'Energy & Cleantech'
  | 'Deep-Tech & Bio'
  | 'Mobility & Subsea'
  | 'Real Assets & Ops';

export interface ModuleRegistryItem {
  id: string;
  label: string;
  category: Exclude<ModuleCategory, 'All'>;
  keywords: string;
}

export const MODULE_REGISTRY: ModuleRegistryItem[] = [
  // Core & Legal
  { id: 'abstract', label: 'Document Explorer', category: 'Core & Legal', keywords: 'abstract pdf clauses terms' },
  { id: 'chat', label: 'Compliance Q&A', category: 'Core & Legal', keywords: 'rag chat ai stream' },
  { id: 'schedule', label: 'Rent Schedule', category: 'Core & Legal', keywords: 'cashflow monthly rent escalation' },
  { id: 'review', label: '📝 Review & History', category: 'Core & Legal', keywords: 'audit log comments redlines' },
  { id: 'effective', label: '🌿 Net Effective Terms', category: 'Core & Legal', keywords: 'ti concession effective rent' },
  { id: 'negotiation', label: '🤖 Negotiation', category: 'Core & Legal', keywords: 'counter offer redline' },
  { id: 'approvals', label: '🏢 Approvals', category: 'Core & Legal', keywords: 'workflow signoff' },
  { id: 'drafter', label: '🤖 Drafter', category: 'Core & Legal', keywords: 'clause generator ai' },
  { id: 'regulatory', label: '🏛️ Regulatory', category: 'Core & Legal', keywords: 'compliance statutory' },
  { id: 'estoppel_waiver', label: '📑 Estoppel & Waivers', category: 'Core & Legal', keywords: 'snda subordination certificate' },
  { id: 'version_diff', label: '🤖 Version Diff', category: 'Core & Legal', keywords: 'amendment compare redline' },
  { id: 'coi_audit', label: '🛡️ Insurance COI', category: 'Core & Legal', keywords: 'acord policy liability' },
  { id: 'zoning_screener', label: '🏛️ Zoning Screener', category: 'Core & Legal', keywords: 'land use conditional permit' },

  // Finance & Debt
  { id: 'cam_audit', label: '💰 CAM Audit', category: 'Finance & Debt', keywords: 'opex reconciliation cap' },
  { id: 'cam_dispute', label: '🏢 CAM Dispute', category: 'Finance & Debt', keywords: 'overcharge forensic' },
  { id: 'sublease', label: '🏢 Sublease', category: 'Finance & Debt', keywords: 'assignment recapture' },
  { id: 'sublease_royalty', label: '📜 Sublease Royalty', category: 'Finance & Debt', keywords: 'profit share split' },
  { id: 'accounting', label: '⚖️ Accounting', category: 'Finance & Debt', keywords: 'asc 842 ifrs 16 rou asset' },
  { id: 'strategy', label: '📈 Strategy', category: 'Finance & Debt', keywords: 'renewal relocate blend extend' },
  { id: 'buyout', label: '💰 Buyout', category: 'Finance & Debt', keywords: 'early termination fee' },
  { id: 'break_optimizer', label: '💰 Break Optimizer', category: 'Finance & Debt', keywords: 'option exercise window' },
  { id: 'inflation', label: '🔮 Inflation', category: 'Finance & Debt', keywords: 'cpi indexation shock' },
  { id: 'restructure', label: '💼 Restructure', category: 'Finance & Debt', keywords: 'workout distress' },
  { id: 'tax_calc', label: '🌐 Tax Calc', category: 'Finance & Debt', keywords: 'vat stamp duty withholding' },
  { id: 'cmbs_debt', label: '🏢 CMBS Debt & DSCR', category: 'Finance & Debt', keywords: 'loan covenant debt yield ltv' },
  { id: 'argus_dcf', label: '📊 ARGUS 10-Yr DCF', category: 'Finance & Debt', keywords: 'npv irr exit cap terminal value' },
  { id: 'syndication_waterfall', label: '💼 GP/LP Syndication', category: 'Finance & Debt', keywords: 'promote pref hurdle waterfall' },
  { id: 'abandonment_recovery', label: '🏢 Abandonment Recovery', category: 'Finance & Debt', keywords: 'default mitigation re-let' },
  { id: 'condemnation_taking', label: '⚖️ Condemnation & Taking', category: 'Finance & Debt', keywords: 'eminent domain award' },

  // Energy & Cleantech
  { id: 'esg', label: '🌱 ESG Audit', category: 'Energy & Cleantech', keywords: 'green lease sustainability' },
  { id: 'carbon', label: '📊 Carbon', category: 'Energy & Cleantech', keywords: 'scope 1 2 3 emissions' },
  { id: 'carbon_marketplace', label: '⚡ Carbon Marketplace', category: 'Energy & Cleantech', keywords: 'recs offsets credits' },
  { id: 'demand_response', label: '⚡ Demand Response', category: 'Energy & Cleantech', keywords: 'curtailment peak shaving' },
  { id: 'ev_charging', label: '⚡ EV Charging', category: 'Energy & Cleantech', keywords: 'fleet charger stall' },
  { id: 'solar_bess', label: '🌞 Solar & BESS', category: 'Energy & Cleantech', keywords: 'rooftop pv battery' },
  { id: 'ev_microgrid', label: '⚡ EV & Microgrid', category: 'Energy & Cleantech', keywords: 'islanded der tariff' },
  { id: 'cool_roof_uhi', label: '🛰️ Cool Roof & UHI', category: 'Energy & Cleantech', keywords: 'albedo urban heat island' },
  { id: 'geothermal_gshp', label: '🛰️ Geothermal GSHP', category: 'Energy & Cleantech', keywords: 'borehole heat pump' },
  { id: 'agrivoltaics_ground_lease', label: '🌾 Agri-Solar Dual-Use', category: 'Energy & Cleantech', keywords: 'dual use farm solar' },
  { id: 'grid_bess', label: '⚡ Grid-Scale BESS Storage', category: 'Energy & Cleantech', keywords: 'utility lfp ferc' },
  { id: 'desalination_swro', label: '🌊 Desalination SWRO', category: 'Energy & Cleantech', keywords: 'water reverse osmosis' },
  { id: 'nuclear_smr', label: '⚡ Nuclear SMR Campus', category: 'Energy & Cleantech', keywords: 'nrc baseload ppa reactor' },
  { id: 'green_hydrogen', label: '🧪 Green Hydrogen Facility', category: 'Energy & Cleantech', keywords: 'electrolyzer 45v pipeline' },
  { id: 'dac_carbon_hub', label: '💨 DAC Carbon Hub', category: 'Energy & Cleantech', keywords: '45q class vi sequestration' },
  { id: 'offshore_wind_port', label: '🚢 Offshore Wind Port', category: 'Energy & Cleantech', keywords: 'boem turbine marshaling' },
  { id: 'fusion_power', label: '⚛️ Fusion Power Campus', category: 'Energy & Cleantech', keywords: 'tokamak hts magnet tritium' },
  { id: 'battery_metals', label: '🔋 Battery Metals Complex', category: 'Energy & Cleantech', keywords: 'black mass lithium ira 30d' },

  // Deep-Tech & Bio
  { id: 'datacenter_pue', label: '🛰️ Data Center PUE', category: 'Deep-Tech & Bio', keywords: 'colocation mw ups cooling' },
  { id: 'hyperscale_ai', label: '⚡ Hyperscale AI Data Center', category: 'Deep-Tech & Bio', keywords: 'gpu cluster liquid cooling' },
  { id: 'lab_compliance', label: '🏥 Lab Compliance', category: 'Deep-Tech & Bio', keywords: 'bsl wet lab fume hood' },
  { id: 'mob_compliance', label: '🏥 MOB Healthcare', category: 'Deep-Tech & Bio', keywords: 'stark law anti-kickback' },
  { id: 'radiopharmacy', label: '🧪 Radiopharmacy & Cyclotron', category: 'Deep-Tech & Bio', keywords: 'isotope fda shielded vault' },
  { id: 'biomanufacturing_foundry', label: '🧬 Biomanufacturing', category: 'Deep-Tech & Bio', keywords: 'cgmp perfusion wfi ln2' },
  { id: 'semiconductor_fab', label: '💎 Semiconductor EUV Fab', category: 'Deep-Tech & Bio', keywords: 'lithography wafer vc-g chips 48d pfas' },
  { id: 'quantum_cryogenic', label: '❄️ Quantum Cryogenic Vault', category: 'Deep-Tech & Bio', keywords: 'dilution fridge helium3 faraday millikelvin' },
  { id: 'satellite_teleport', label: '🌌 Satellite Teleport', category: 'Deep-Tech & Bio', keywords: 'phased array fsoc optical downlink fcc' },

  // Mobility & Subsea
  { id: 'industrial_logistics', label: '📦 Industrial Logistics', category: 'Mobility & Subsea', keywords: 'warehouse dock clear height' },
  { id: 'port_ftz_logistics', label: '🚢 Port & FTZ Logistics', category: 'Mobility & Subsea', keywords: 'foreign trade zone customs' },
  { id: 'port_terminal', label: '⚓ Port & Container Terminal', category: 'Mobility & Subsea', keywords: 'teu mag wharfage crane' },
  { id: 'aviation_fbo', label: '✈️ FBO & Aviation Hangar', category: 'Mobility & Subsea', keywords: 'faa fuel flowage hangar' },
  { id: 'vertiport_aam', label: '🚁 Vertiport & AAM', category: 'Mobility & Subsea', keywords: 'evtol air taxi charging' },
  { id: 'hsr_station', label: '🚆 HSR Station & Air-Rights', category: 'Mobility & Subsea', keywords: 'rail transit tod' },
  { id: 'autonomous_freight', label: '🚚 Autonomous Freight', category: 'Mobility & Subsea', keywords: 'mcs megawatt av truck fmcsa' },
  { id: 'subsea_cls', label: '🌊 Subsea Cable Landing (CLS)', category: 'Mobility & Subsea', keywords: 'borehole mmr pfe submarine fiber' },
  { id: 'telecom_5g', label: '📡 5G & Fiber Telecom', category: 'Mobility & Subsea', keywords: 'rooftop cell das small cell' },
  { id: 'spaceport_launch', label: '🛰️ Spaceport Launch Complex', category: 'Mobility & Subsea', keywords: 'faa orbital range pad' },

  // Real Assets & Ops
  { id: 'spatial', label: '📍 Spatial', category: 'Real Assets & Ops', keywords: 'floorplan map occupancy' },
  { id: 'fitout_estimator', label: '📐 Fit-Out Estimator', category: 'Real Assets & Ops', keywords: 'ti buildout capex' },
  { id: 'climate_risk', label: '🌊 Climate Risk', category: 'Real Assets & Ops', keywords: 'flood wildfire fema physical' },
  { id: 'iot_occupancy', label: '📡 IoT Utilization', category: 'Real Assets & Ops', keywords: 'badge sensor desk utilization' },
  { id: 'bms_diagnostics', label: '🏢 BMS Diagnostics', category: 'Real Assets & Ops', keywords: 'hvac chiller fault detection' },
  { id: 'water_leak', label: '💧 Water & Leak IoT', category: 'Real Assets & Ops', keywords: 'submetering valve leak' },
  { id: 'construction_delay', label: '🏗️ Construction Delays', category: 'Real Assets & Ops', keywords: 'liquidated damages delivery' },
  { id: 'cold_storage', label: '🏭 Cold Storage IoT', category: 'Real Assets & Ops', keywords: 'ammonia blast freezer pallet' },
  { id: 'film_soundstage', label: '🎬 Film & LED Soundstage', category: 'Real Assets & Ops', keywords: 'virtual production volume' },
  { id: 'brownfield_remediation', label: '♻️ Brownfield & Vapor ESA', category: 'Real Assets & Ops', keywords: 'phase ii environmental remediation' },
  { id: 'cea_farm', label: '🌱 CEA & Vertical Farm', category: 'Real Assets & Ops', keywords: 'hydroponic led yield' },
  { id: 'self_storage', label: '📦 Self-Storage & Vault', category: 'Real Assets & Ops', keywords: 'climate units occupancy' },
  { id: 'theme_park', label: '🎢 Theme Park & Attractions', category: 'Real Assets & Ops', keywords: 'turnstile gate percentage rent' },
  { id: 'stadium_arena', label: '🏟️ Stadium & Arena District', category: 'Real Assets & Ops', keywords: 'naming rights luxury suite' },
  { id: 'hospitality_revpar', label: '🏨 Hospitality & RevPAR', category: 'Real Assets & Ops', keywords: 'hotel adr f&b royalty' }
];

export const MODULE_CATEGORIES: ModuleCategory[] = [
  'All',
  'Deep-Tech & Bio',
  'Energy & Cleantech',
  'Mobility & Subsea',
  'Finance & Debt',
  'Core & Legal',
  'Real Assets & Ops'
];

// =========================================================================
// Command Palette Modal (Ctrl+K)
// =========================================================================
export function ModuleCommandPaletteModal({
  isOpen,
  onClose,
  onSelectModule
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (moduleId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODULE_REGISTRY;
    return MODULE_REGISTRY.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.keywords.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, Math.max(0, filtered.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIdx]) {
        e.preventDefault();
        onSelectModule(filtered[selectedIdx].id);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, filtered, selectedIdx, onSelectModule, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(6px)',
        zIndex: 1200,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '9vh'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '92vw',
          maxWidth: '680px',
          maxHeight: '72vh',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid rgba(109, 40, 217, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>🔍</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${MODULE_REGISTRY.length} LeaseLogic modelers (e.g., semiconductor, quantum, subsea, cmbs, cam)...`}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.95rem',
              color: 'var(--foreground)',
              background: 'transparent'
            }}
          />
          <button
            onClick={onClose}
            style={{
              border: '1px solid rgba(15,23,42,0.12)',
              background: '#f8fafc',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            ESC
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No modelers match &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onClick={() => {
                    onSelectModule(item.id);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(109, 40, 217, 0.08)' : 'transparent',
                    border: isSelected ? '1px solid rgba(109, 40, 217, 0.25)' : '1px solid transparent'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>{item.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.keywords}</div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: '#f1f5f9',
                      color: 'var(--primary)'
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Cross-Asset Infrastructure Portfolio Valuation Rollup View
// =========================================================================
export function InfrastructureRollupView({
  leaseId,
  leaseName,
  apiBase,
  onNavigateToModule
}: {
  leaseId?: string;
  leaseName?: string;
  apiBase: string;
  onNavigateToModule: (moduleId: string) => void;
}) {
  const [capRateShiftBps, setCapRateShiftBps] = useState(50);
  const [escrowInflationPct, setEscrowInflationPct] = useState(8);
  const [royaltyStressPct, setRoyaltyStressPct] = useState(90);
  const [rollupData, setRollupData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runRollup = async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/leases/${leaseId}/infrastructure-portfolio-rollup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cap_rate_shift_bps: capRateShiftBps,
          escrow_inflation_pct: escrowInflationPct,
          royalty_stress_pct: royaltyStressPct
        })
      });
      if (res.ok) {
        setRollupData(await res.json());
      }
    } catch (err) {
      console.error('Error loading infrastructure rollup:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runRollup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  if (!leaseId) {
    return (
      <div className="glass" style={{ margin: '24px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Select a lease from the left sidebar to run the Cross-Asset Infrastructure Valuation Rollup &amp; Stress Engine.
      </div>
    );
  }

  const summary = rollupData?.portfolio_summary;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
            Executive Portfolio Underwriting Engine
          </span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--foreground)', margin: '2px 0 4px 0' }}>
            🏛️ Cross-Asset Frontier Infrastructure Rollup &amp; Macro Shock Simulator
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Aggregating Baseline vs Macro-Stressed NOI, Cap Rates, and Reserve Coverage across Phase 27–28 sectors for <strong>{leaseName || leaseId}</strong>
          </p>
        </div>
        <button onClick={runRollup} disabled={loading} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
          {loading ? 'Running Stress Simulation...' : '⚡ Re-Run Portfolio Stress Rollup'}
        </button>
      </div>

      {/* Stress Scenario Parameters */}
      <div className="glass" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', background: '#ffffff' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Exit / Market Cap Rate Shift (bps)
          </label>
          <input
            type="number"
            step="25"
            value={capRateShiftBps}
            onChange={(e) => setCapRateShiftBps(Number(e.target.value))}
            style={{ width: '100%', border: '1px solid rgba(15,23,42,0.14)', borderRadius: '6px', padding: '8px', fontSize: '0.88rem' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Environmental &amp; Cryo Escrow Inflation (%)
          </label>
          <input
            type="number"
            step="1"
            value={escrowInflationPct}
            onChange={(e) => setEscrowInflationPct(Number(e.target.value))}
            style={{ width: '100%', border: '1px solid rgba(15,23,42,0.14)', borderRadius: '6px', padding: '8px', fontSize: '0.88rem' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Royalty &amp; Throughput Realization (%)
          </label>
          <input
            type="number"
            step="5"
            value={royaltyStressPct}
            onChange={(e) => setRoyaltyStressPct(Number(e.target.value))}
            style={{ width: '100%', border: '1px solid rgba(15,23,42,0.14)', borderRadius: '6px', padding: '8px', fontSize: '0.88rem' }}
          />
        </div>
      </div>

      {summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="glass" style={{ padding: '16px', background: '#ffffff' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Baseline Portfolio Valuation</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                ${(summary.total_baseline_valuation_usd / 1e9).toFixed(3)}B
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blended {summary.blended_baseline_cap_rate_pct}% Cap Rate</div>
            </div>

            <div className="glass" style={{ padding: '16px', background: '#ffffff' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stressed Portfolio Valuation</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: summary.portfolio_valuation_delta_usd >= 0 ? 'var(--success)' : '#b45309', marginTop: '4px' }}>
                ${(summary.total_stressed_valuation_usd / 1e9).toFixed(3)}B
              </div>
              <div style={{ fontSize: '0.75rem', color: summary.portfolio_valuation_delta_pct >= 0 ? 'var(--success)' : '#be123c', fontWeight: 700 }}>
                {summary.portfolio_valuation_delta_pct >= 0 ? '+' : ''}
                {summary.portfolio_valuation_delta_pct}% ({summary.portfolio_valuation_delta_usd >= 0 ? '+' : ''}${(summary.portfolio_valuation_delta_usd / 1e6).toFixed(1)}M)
              </div>
            </div>

            <div className="glass" style={{ padding: '16px', background: '#ffffff' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Combined Stressed NOI</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                ${(summary.total_stressed_noi_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline: ${(summary.total_baseline_noi_usd / 1e6).toFixed(2)}M/yr</div>
            </div>

            <div className="glass" style={{ padding: '16px', background: '#ffffff' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mandatory Escrows</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#be123c', marginTop: '4px' }}>
                ${(summary.total_stressed_reserves_usd / 1e6).toFixed(2)}M/yr
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across {rollupData.stress_parameters?.sector_count} specialized sectors</div>
            </div>
          </div>

          <div className="glass" style={{ padding: '18px', background: '#ffffff', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px 0' }}>Sector-by-Sector Allocation &amp; Valuation Impact</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(15,23,42,0.08)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 10px' }}>Asset Sector</th>
                  <th style={{ padding: '8px 10px' }}>Phase</th>
                  <th style={{ padding: '8px 10px' }}>Stressed NOI</th>
                  <th style={{ padding: '8px 10px' }}>Stressed Cap</th>
                  <th style={{ padding: '8px 10px' }}>Baseline Val</th>
                  <th style={{ padding: '8px 10px' }}>Stressed Val</th>
                  <th style={{ padding: '8px 10px' }}>Delta</th>
                  <th style={{ padding: '8px 10px' }}>Reserves Cov.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rollupData.sector_breakdown?.map((s: any) => (
                  <tr key={s.sector_id} style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{s.sector_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.regulatory_framework}</div>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--primary)', fontWeight: 700 }}>{s.phase}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>${(s.stressed_noi_usd / 1e6).toFixed(2)}M</td>
                    <td style={{ padding: '10px' }}>{s.stressed_cap_rate_pct}%</td>
                    <td style={{ padding: '10px' }}>${(s.baseline_valuation_usd / 1e6).toFixed(2)}M</td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>${(s.stressed_valuation_usd / 1e6).toFixed(2)}M</td>
                    <td style={{ padding: '10px', fontWeight: 700, color: s.valuation_delta_pct >= 0 ? 'var(--success)' : '#be123c' }}>
                      {s.valuation_delta_pct >= 0 ? '+' : ''}
                      {s.valuation_delta_pct}%
                    </td>
                    <td style={{ padding: '10px' }}>{s.reserve_coverage_ratio}x</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        onClick={() => onNavigateToModule(s.sector_id)}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
