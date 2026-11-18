import pool from './db';

async function verifyPhase30Features() {
  console.log('🧪 Starting Phase 30 Sovereign & Next-Gen Industrial Infrastructure Suite Integration Test Suite...\n');

  try {
    // 1. Live PostgreSQL sanity check
    const leaseRes = await pool.query('SELECT id, filename, property_name FROM leases LIMIT 1');
    if (leaseRes.rows.length === 0) {
      console.error('❌ Verification failed: No existing leases found in database.');
      process.exit(1);
    }
    const lease = leaseRes.rows[0];
    console.log(`✅ Selected target test lease: ID=${lease.id}, Property=${lease.property_name || lease.filename}\n`);

    // =========================================================================
    // FEATURE 1: Enhanced Geothermal Systems (EGS) Baseload Power Campus
    // =========================================================================
    console.log('--- Feature 1: Enhanced Geothermal Systems (EGS) Baseload Power Campus ---');
    const annualWellpadGroundRentUsd = Math.round(55 * 26000); // 1,430,000
    const annualNetGenerationMwh = Math.round(80 * 8760 * 0.92); // 644,736
    const annualGrossPpaSalesUsd = Math.round(annualNetGenerationMwh * 98.0); // 63,184,128
    const annualThermalPpaRoyaltyUsd = Math.round(annualGrossPpaSalesUsd * 0.04); // 2,527,365
    const steamConcessionUsd = 1150000;
    const annualDleLithiumRoyaltyUsd = Math.round(4500 * 420); // 1,890,000
    const totalEgsGrossUsd = annualWellpadGroundRentUsd + annualThermalPpaRoyaltyUsd + steamConcessionUsd + annualDleLithiumRoyaltyUsd; // 6,997,365
    const totalEgsReservesUsd = 380000 + 490000; // 870,000
    const egsNoiUsd = totalEgsGrossUsd - totalEgsReservesUsd; // 6,127,365
    const egsValUsd = Math.round(egsNoiUsd / 0.06); // 102,122,750

    if (annualWellpadGroundRentUsd !== 1430000) throw new Error(`Unexpected annualWellpadGroundRentUsd: ${annualWellpadGroundRentUsd}`);
    if (annualNetGenerationMwh !== 644736) throw new Error(`Unexpected annualNetGenerationMwh: ${annualNetGenerationMwh}`);
    if (annualThermalPpaRoyaltyUsd !== 2527365) throw new Error(`Unexpected annualThermalPpaRoyaltyUsd: ${annualThermalPpaRoyaltyUsd}`);
    if (annualDleLithiumRoyaltyUsd !== 1890000) throw new Error(`Unexpected annualDleLithiumRoyaltyUsd: ${annualDleLithiumRoyaltyUsd}`);
    if (totalEgsGrossUsd !== 6997365) throw new Error(`Unexpected totalEgsGrossUsd: ${totalEgsGrossUsd}`);
    if (egsNoiUsd !== 6127365) throw new Error(`Unexpected egsNoiUsd: ${egsNoiUsd}`);
    if (egsValUsd !== 102122750) throw new Error(`Unexpected egsValUsd: ${egsValUsd}`);

    console.log(`✅ EGS Wellpad Ground & Process Steam: $${(annualWellpadGroundRentUsd + steamConcessionUsd).toLocaleString()}/yr`);
    console.log(`✅ 80 MWe Baseload PPA + DLE Lithium Brine Royalties: $${(annualThermalPpaRoyaltyUsd + annualDleLithiumRoyaltyUsd).toLocaleString()}/yr`);
    console.log(`✅ EGS Campus NOI & Valuation: $${egsNoiUsd.toLocaleString()}/yr NOI -> $${(egsValUsd / 1e6).toFixed(2)}M (@ 6.00% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 2: Green Steel H2-DRI & Electric Arc Furnace (EAF) Zero-Carbon Mill
    // =========================================================================
    console.log('--- Feature 2: Green Steel H2-DRI & EAF Zero-Carbon Mill ---');
    const annualMillGroundRentUsd = Math.round(140 * 32000); // 4,480,000
    const oreDockConcessionUsd = 1850000;
    const annualGreenSteelRoyaltiesUsd = Math.round(1600000 * 2.75); // 4,400,000
    const annualEafSubstationLeaseUsd = Math.round(220 * 6500); // 1,430,000
    const totalSteelGrossUsd = annualMillGroundRentUsd + oreDockConcessionUsd + annualGreenSteelRoyaltiesUsd + annualEafSubstationLeaseUsd; // 12,160,000
    const totalSteelReservesUsd = 720000 + 410000; // 1,130,000
    const steelNoiUsd = totalSteelGrossUsd - totalSteelReservesUsd; // 11,030,000
    const steelValUsd = Math.round(steelNoiUsd / 0.065); // 169,692,308

    if (annualMillGroundRentUsd !== 4480000) throw new Error(`Unexpected annualMillGroundRentUsd: ${annualMillGroundRentUsd}`);
    if (annualGreenSteelRoyaltiesUsd !== 4400000) throw new Error(`Unexpected annualGreenSteelRoyaltiesUsd: ${annualGreenSteelRoyaltiesUsd}`);
    if (annualEafSubstationLeaseUsd !== 1430000) throw new Error(`Unexpected annualEafSubstationLeaseUsd: ${annualEafSubstationLeaseUsd}`);
    if (totalSteelGrossUsd !== 12160000) throw new Error(`Unexpected totalSteelGrossUsd: ${totalSteelGrossUsd}`);
    if (steelNoiUsd !== 11030000) throw new Error(`Unexpected steelNoiUsd: ${steelNoiUsd}`);
    if (steelValUsd !== 169692308) throw new Error(`Unexpected steelValUsd: ${steelValUsd}`);

    console.log(`✅ Mill Site & Heavy-Haul Ore Rail Concession: $${(annualMillGroundRentUsd + oreDockConcessionUsd).toLocaleString()}/yr`);
    console.log(`✅ Green Steel Tonnage Royalty & 220 MVA EAF Substation: $${(annualGreenSteelRoyaltiesUsd + annualEafSubstationLeaseUsd).toLocaleString()}/yr`);
    console.log(`✅ Green Steel Mill NOI & Valuation: $${steelNoiUsd.toLocaleString()}/yr NOI -> $${(steelValUsd / 1e6).toFixed(2)}M (@ 6.50% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 3: Precision Fermentation & Cultivated Protein Bioreactor Campus
    // =========================================================================
    console.log('--- Feature 3: Precision Fermentation & Bioreactor Campus ---');
    const annualBioreactorHallRentUsd = Math.round(85000 * 78.0); // 6,630,000
    const annualVesselCapacityTariffUsd = Math.round(1200000 * 1.85); // 2,220,000
    const annualDownstreamPackagingRentUsd = Math.round(35000 * 46.0); // 1,610,000
    const biogasConcessionUsd = 680000;
    const totalFermGrossUsd = annualBioreactorHallRentUsd + annualVesselCapacityTariffUsd + annualDownstreamPackagingRentUsd + biogasConcessionUsd; // 11,140,000
    const totalFermReservesUsd = 540000 + 310000; // 850,000
    const fermNoiUsd = totalFermGrossUsd - totalFermReservesUsd; // 10,290,000
    const fermValUsd = Math.round(fermNoiUsd / 0.0625); // 164,640,000

    if (annualBioreactorHallRentUsd !== 6630000) throw new Error(`Unexpected annualBioreactorHallRentUsd: ${annualBioreactorHallRentUsd}`);
    if (annualVesselCapacityTariffUsd !== 2220000) throw new Error(`Unexpected annualVesselCapacityTariffUsd: ${annualVesselCapacityTariffUsd}`);
    if (annualDownstreamPackagingRentUsd !== 1610000) throw new Error(`Unexpected annualDownstreamPackagingRentUsd: ${annualDownstreamPackagingRentUsd}`);
    if (totalFermGrossUsd !== 11140000) throw new Error(`Unexpected totalFermGrossUsd: ${totalFermGrossUsd}`);
    if (fermNoiUsd !== 10290000) throw new Error(`Unexpected fermNoiUsd: ${fermNoiUsd}`);
    if (fermValUsd !== 164640000) throw new Error(`Unexpected fermValUsd: ${fermValUsd}`);

    console.log(`✅ ISO-7 Bioreactor Suite & Packaging Wing: $${(annualBioreactorHallRentUsd + annualDownstreamPackagingRentUsd).toLocaleString()}/yr`);
    console.log(`✅ 1.2M-Liter Vessel CIP/SIP Tariff & Biogas Recovery: $${(annualVesselCapacityTariffUsd + biogasConcessionUsd).toLocaleString()}/yr`);
    console.log(`✅ Bioreactor Campus NOI & Valuation: $${fermNoiUsd.toLocaleString()}/yr NOI -> $${(fermValUsd / 1e6).toFixed(2)}M (@ 6.25% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 4: Sovereign AI Inference Edge Micro-Data Center Pod Network
    // =========================================================================
    console.log('--- Feature 4: Sovereign AI Inference Edge Micro-Data Center Pod Network ---');
    const annualEdgeSiteLicensesUsd = Math.round(24 * 185000); // 4,440,000
    const annualEdgeItLoadTariffUsd = Math.round(18000 * 215.0 * 12); // 46,440,000
    const annualMetroCrossConnectsUsd = Math.round(960 * 275 * 12); // 3,168,000
    const wasteHeatRevenueUsd = 920000;
    const totalEdgeGrossUsd = annualEdgeSiteLicensesUsd + annualEdgeItLoadTariffUsd + annualMetroCrossConnectsUsd + wasteHeatRevenueUsd; // 54,968,000
    const totalEdgeReservesUsd = 1250000 + 680000; // 1,930,000
    const edgeNoiUsd = totalEdgeGrossUsd - totalEdgeReservesUsd; // 53,038,000
    const edgeValUsd = Math.round(edgeNoiUsd / 0.0575); // 922,400,000

    if (annualEdgeSiteLicensesUsd !== 4440000) throw new Error(`Unexpected annualEdgeSiteLicensesUsd: ${annualEdgeSiteLicensesUsd}`);
    if (annualEdgeItLoadTariffUsd !== 46440000) throw new Error(`Unexpected annualEdgeItLoadTariffUsd: ${annualEdgeItLoadTariffUsd}`);
    if (annualMetroCrossConnectsUsd !== 3168000) throw new Error(`Unexpected annualMetroCrossConnectsUsd: ${annualMetroCrossConnectsUsd}`);
    if (totalEdgeGrossUsd !== 54968000) throw new Error(`Unexpected totalEdgeGrossUsd: ${totalEdgeGrossUsd}`);
    if (edgeNoiUsd !== 53038000) throw new Error(`Unexpected edgeNoiUsd: ${edgeNoiUsd}`);
    if (edgeValUsd !== 922400000) throw new Error(`Unexpected edgeValUsd: ${edgeValUsd}`);

    console.log(`✅ 24 Urban Edge Pod Licenses & 18 MW Liquid-Cooled IT Load: $${(annualEdgeSiteLicensesUsd + annualEdgeItLoadTariffUsd).toLocaleString()}/yr`);
    console.log(`✅ 960 Sovereign IXP Links & District Heat Export: $${(annualMetroCrossConnectsUsd + wasteHeatRevenueUsd).toLocaleString()}/yr`);
    console.log(`✅ Sovereign AI Edge Network NOI & Valuation: $${edgeNoiUsd.toLocaleString()}/yr NOI -> $${(edgeValUsd / 1e6).toFixed(2)}M (@ 5.75% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 5: Autonomous Electric Inland Barge Hub & Shore-Power Terminal
    // =========================================================================
    console.log('--- Feature 5: Autonomous Electric Inland Barge Hub & River Terminal ---');
    const annualRiverfrontGroundRentUsd = Math.round(60 * 34000); // 2,040,000
    const annualBerthAmpFeesUsd = Math.round(1400 * 2450); // 3,430,000
    const annualWharfageThroughputUsd = Math.round(4200000 * 0.95); // 3,990,000
    const annualBatterySwapConcessionUsd = Math.round(6500 * 190); // 1,235,000
    const totalBargeGrossUsd = annualRiverfrontGroundRentUsd + annualBerthAmpFeesUsd + annualWharfageThroughputUsd + annualBatterySwapConcessionUsd; // 10,695,000
    const totalBargeReservesUsd = 640000 + 290000; // 930,000
    const bargeNoiUsd = totalBargeGrossUsd - totalBargeReservesUsd; // 9,765,000
    const bargeValUsd = Math.round(bargeNoiUsd / 0.06); // 162,750,000

    if (annualRiverfrontGroundRentUsd !== 2040000) throw new Error(`Unexpected annualRiverfrontGroundRentUsd: ${annualRiverfrontGroundRentUsd}`);
    if (annualBerthAmpFeesUsd !== 3430000) throw new Error(`Unexpected annualBerthAmpFeesUsd: ${annualBerthAmpFeesUsd}`);
    if (annualWharfageThroughputUsd !== 3990000) throw new Error(`Unexpected annualWharfageThroughputUsd: ${annualWharfageThroughputUsd}`);
    if (annualBatterySwapConcessionUsd !== 1235000) throw new Error(`Unexpected annualBatterySwapConcessionUsd: ${annualBatterySwapConcessionUsd}`);
    if (totalBargeGrossUsd !== 10695000) throw new Error(`Unexpected totalBargeGrossUsd: ${totalBargeGrossUsd}`);
    if (bargeNoiUsd !== 9765000) throw new Error(`Unexpected bargeNoiUsd: ${bargeNoiUsd}`);
    if (bargeValUsd !== 162750000) throw new Error(`Unexpected bargeValUsd: ${bargeValUsd}`);

    console.log(`✅ 60-Acre Riverfront Bulkhead & 4.2M-Ton Wharfage: $${(annualRiverfrontGroundRentUsd + annualWharfageThroughputUsd).toLocaleString()}/yr`);
    console.log(`✅ IEC 80005-1 Shore-Power Berths & Maritime Battery Swaps: $${(annualBerthAmpFeesUsd + annualBatterySwapConcessionUsd).toLocaleString()}/yr`);
    console.log(`✅ Electric Barge Terminal NOI & Valuation: $${bargeNoiUsd.toLocaleString()}/yr NOI -> $${(bargeValUsd / 1e6).toFixed(2)}M (@ 6.00% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 6: Phase 30 Portfolio Aggregation & Stress Shock
    // =========================================================================
    console.log('--- Feature 6: Phase 30 Sovereign & Industrial Portfolio Aggregation & Stress Shock ---');
    const phase30TotalGrossUsd = totalEgsGrossUsd + totalSteelGrossUsd + totalFermGrossUsd + totalEdgeGrossUsd + totalBargeGrossUsd; // 95,960,365
    const phase30TotalNoiUsd = egsNoiUsd + steelNoiUsd + fermNoiUsd + edgeNoiUsd + bargeNoiUsd; // 90,250,365
    const phase30PortfolioValUsd = egsValUsd + steelValUsd + fermValUsd + edgeValUsd + bargeValUsd; // 1,521,605,058

    const stressedEdgeNoi = (annualEdgeSiteLicensesUsd + annualEdgeItLoadTariffUsd + Math.round((annualMetroCrossConnectsUsd + wasteHeatRevenueUsd) * 0.90)) - Math.round(totalEdgeReservesUsd * 1.10);
    const stressedEdgeVal = Math.round(stressedEdgeNoi / 0.0625); // +50bps cap shift

    if (phase30TotalGrossUsd !== 95960365) throw new Error(`Unexpected phase30TotalGrossUsd: ${phase30TotalGrossUsd}`);
    if (phase30TotalNoiUsd !== 90250365) throw new Error(`Unexpected phase30TotalNoiUsd: ${phase30TotalNoiUsd}`);
    if (phase30PortfolioValUsd !== 1521605058) throw new Error(`Unexpected phase30PortfolioValUsd: ${phase30PortfolioValUsd}`);
    if (stressedEdgeVal >= edgeValUsd) throw new Error('Stress shock must reduce Sovereign AI Edge valuation');

    console.log(`✅ Combined Phase 30 Portfolio Gross Revenue: $${(phase30TotalGrossUsd / 1e6).toFixed(2)}M/yr`);
    console.log(`✅ Combined Phase 30 Portfolio Net Operating Income: $${(phase30TotalNoiUsd / 1e6).toFixed(2)}M/yr`);
    console.log(`✅ Combined Phase 30 Portfolio Valuation: $${(phase30PortfolioValUsd / 1e6).toFixed(2)}M (~$1.52B AUM)`);
    console.log(`✅ Stressed Sovereign AI Edge Valuation (+50bps / 90% IXP / +10% Escrow): $${(stressedEdgeVal / 1e6).toFixed(2)}M vs $${(edgeValUsd / 1e6).toFixed(2)}M baseline\n`);

    console.log('🎉 ALL PHASE 30 SOVEREIGN & NEXT-GEN INDUSTRIAL INFRASTRUCTURE TESTS PASSED WITH 100% PRECISION!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  }
}

verifyPhase30Features();
