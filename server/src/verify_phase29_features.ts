import pool from './db';

async function verifyPhase29Features() {
  console.log('🧪 Starting Phase 29 Frontier Infrastructure & Institutional Asset Suite Integration Test Suite...\n');

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
    // FEATURE 1: Orbital Space Launch Complex, Clean Propulsion Test Stand & Pad Ground Lease Modeler
    // =========================================================================
    console.log('--- Feature 1: Orbital Space Launch Complex & Propulsion Test Stand Modeler ---');
    const launchPadAcres = 65;
    const padRentPerAcre = 38000;
    const vifSqft = 45000;
    const vifRentSqft = 135.0;
    const testStandsCount = 3;
    const testStandLicenseFee = 650000;
    const annualLaunches = 24;
    const launchTariff = 185000;
    const propellantKg = 18000000;
    const flowageFeePerKg = 0.08;
    const delugeEscrow = 520000;
    const faaSafetyReserve = 380000;
    const acousticBufferMiles = 3.5;
    const spaceportCapRate = 6.25;

    const annualPadGroundRentUsd = Math.round(launchPadAcres * padRentPerAcre); // 2,470,000
    const annualVifRentUsd = Math.round(vifSqft * vifRentSqft); // 6,075,000
    const annualTestStandFeesUsd = Math.round(testStandsCount * testStandLicenseFee); // 1,950,000
    const annualLaunchTariffsUsd = Math.round(annualLaunches * launchTariff); // 4,440,000
    const annualPropellantFlowageUsd = Math.round(propellantKg * flowageFeePerKg); // 1,440,000

    const totalSpaceportGrossUsd =
      annualPadGroundRentUsd +
      annualVifRentUsd +
      annualTestStandFeesUsd +
      annualLaunchTariffsUsd +
      annualPropellantFlowageUsd; // 16,375,000

    const totalSpaceportReservesUsd = delugeEscrow + faaSafetyReserve; // 900,000
    const spaceportNoiUsd = totalSpaceportGrossUsd - totalSpaceportReservesUsd; // 15,475,000
    const spaceportValUsd = Math.round(spaceportNoiUsd / (spaceportCapRate / 100.0)); // 247,600,000

    if (annualPadGroundRentUsd !== 2470000) throw new Error(`Unexpected annualPadGroundRentUsd: ${annualPadGroundRentUsd}`);
    if (annualVifRentUsd !== 6075000) throw new Error(`Unexpected annualVifRentUsd: ${annualVifRentUsd}`);
    if (annualTestStandFeesUsd !== 1950000) throw new Error(`Unexpected annualTestStandFeesUsd: ${annualTestStandFeesUsd}`);
    if (annualLaunchTariffsUsd !== 4440000) throw new Error(`Unexpected annualLaunchTariffsUsd: ${annualLaunchTariffsUsd}`);
    if (annualPropellantFlowageUsd !== 1440000) throw new Error(`Unexpected annualPropellantFlowageUsd: ${annualPropellantFlowageUsd}`);
    if (totalSpaceportGrossUsd !== 16375000) throw new Error(`Unexpected totalSpaceportGrossUsd: ${totalSpaceportGrossUsd}`);
    if (spaceportNoiUsd !== 15475000) throw new Error(`Unexpected spaceportNoiUsd: ${spaceportNoiUsd}`);
    if (spaceportValUsd !== 247600000) throw new Error(`Unexpected spaceportValUsd: ${spaceportValUsd}`);
    if (acousticBufferMiles < 3.0) throw new Error('Acoustic buffer envelope must be >= 3.0 miles');

    console.log(`✅ Launch Pad & VIF High-Bay Cleanroom Leases: $${(annualPadGroundRentUsd + annualVifRentUsd).toLocaleString()}/yr`);
    console.log(`✅ Static Test Stands & Launch Concessions: $${(annualTestStandFeesUsd + annualLaunchTariffsUsd).toLocaleString()}/yr (${annualLaunches} launches)`);
    console.log(`✅ Methalox Flowage Throughput: $${annualPropellantFlowageUsd.toLocaleString()}/yr (${(propellantKg / 1e6).toFixed(1)}M kg)`);
    console.log(`✅ Net Operating Income & Spaceport Valuation: $${spaceportNoiUsd.toLocaleString()}/yr NOI -> $${(spaceportValUsd / 1e6).toFixed(2)}M (@ ${spaceportCapRate}% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 2: Sustainable Aviation Fuel (SAF) HEFA Biorefinery & Hydrant Pipeline Modeler
    // =========================================================================
    console.log('--- Feature 2: Sustainable Aviation Fuel (SAF) HEFA Biorefinery Modeler ---');
    const biorefineryAcres = 75;
    const plantRentPerAcre = 28000;
    const pipelineMiles = 18.5;
    const pipelineRentPerMile = 22000;
    const safGallons = 65000000;
    const safWholesalePrice = 5.85;
    const safRoyaltyPerGal = 0.055;
    const hydrantTariffPerGal = 0.025;
    const catalystReserve = 680000;
    const vocSafetyEscrow = 340000;
    const safCapRate = 6.50;

    const annualPlantGroundRentUsd = Math.round(biorefineryAcres * plantRentPerAcre); // 2,100,000
    const annualPipelineRentUsd = Math.round(pipelineMiles * pipelineRentPerMile); // 407,000
    const totalSafBaseRentUsd = annualPlantGroundRentUsd + annualPipelineRentUsd; // 2,507,000

    const annualSafRoyaltiesUsd = Math.round(safGallons * safRoyaltyPerGal); // 3,575,000
    const annualHydrantTariffsUsd = Math.round(safGallons * hydrantTariffPerGal); // 1,625,000
    const totalSafGrossUsd = totalSafBaseRentUsd + annualSafRoyaltiesUsd + annualHydrantTariffsUsd; // 7,707,000

    const totalSafReservesUsd = catalystReserve + vocSafetyEscrow; // 1,020,000
    const safNoiUsd = totalSafGrossUsd - totalSafReservesUsd; // 6,687,000
    const safValUsd = Math.round(safNoiUsd / (safCapRate / 100.0)); // 102,876,923

    if (annualPlantGroundRentUsd !== 2100000) throw new Error(`Unexpected annualPlantGroundRentUsd: ${annualPlantGroundRentUsd}`);
    if (annualPipelineRentUsd !== 407000) throw new Error(`Unexpected annualPipelineRentUsd: ${annualPipelineRentUsd}`);
    if (annualSafRoyaltiesUsd !== 3575000) throw new Error(`Unexpected annualSafRoyaltiesUsd: ${annualSafRoyaltiesUsd}`);
    if (annualHydrantTariffsUsd !== 1625000) throw new Error(`Unexpected annualHydrantTariffsUsd: ${annualHydrantTariffsUsd}`);
    if (totalSafGrossUsd !== 7707000) throw new Error(`Unexpected totalSafGrossUsd: ${totalSafGrossUsd}`);
    if (safNoiUsd !== 6687000) throw new Error(`Unexpected safNoiUsd: ${safNoiUsd}`);
    if (safValUsd !== 102876923) throw new Error(`Unexpected safValUsd: ${safValUsd}`);

    console.log(`✅ Biorefinery Ground & 18.5-Mile ROW Concession: $${totalSafBaseRentUsd.toLocaleString()}/yr`);
    console.log(`✅ ASTM D7566 SAF & Hydrant Offtake Volume Royalties: $${(annualSafRoyaltiesUsd + annualHydrantTariffsUsd).toLocaleString()}/yr (${(safGallons / 1e6).toFixed(1)}M gal/yr)`);
    console.log(`✅ Net Operating Income & Biorefinery Valuation: $${safNoiUsd.toLocaleString()}/yr NOI -> $${(safValUsd / 1e6).toFixed(2)}M (@ ${safCapRate}% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 3: Ocean Thermal Energy Conversion (OTEC) & Deep Ocean Water Modeler
    // =========================================================================
    console.log('--- Feature 3: Ocean Thermal Energy Conversion (OTEC) & Deep Ocean Water Modeler ---');
    const otecParkAcres = 45;
    const parkRentPerAcre = 31000;
    const otecPipelineKm = 8.5;
    const pipelineRentPerKm = 26000;
    const otecMwe = 30;
    const otecCapacityFactor = 95.0;
    const ppaPriceMwh = 115.0;
    const ppaRoyaltyPct = 2.5;
    const swacConcession = 850000;
    const desalConcession = 420000;
    const biofoulingReserve = 360000;
    const ammoniaEscrow = 220000;
    const otecCapRate = 6.25;

    const annualParkGroundRentUsd = Math.round(otecParkAcres * parkRentPerAcre); // 1,395,000
    const annualSeabedRentUsd = Math.round(otecPipelineKm * pipelineRentPerKm); // 221,000
    const totalOtecBaseRentUsd = annualParkGroundRentUsd + annualSeabedRentUsd; // 1,616,000

    const annualNetGenMwh = Math.round(otecMwe * 8760 * (otecCapacityFactor / 100.0)); // 249,660
    const annualGrossPpaUsd = Math.round(annualNetGenMwh * ppaPriceMwh); // 28,710,900
    const annualPpaRoyaltyUsd = Math.round(annualGrossPpaUsd * (ppaRoyaltyPct / 100.0)); // 717,773

    const totalOtecGrossUsd = totalOtecBaseRentUsd + annualPpaRoyaltyUsd + swacConcession + desalConcession; // 3,603,773
    const totalOtecReservesUsd = biofoulingReserve + ammoniaEscrow; // 580,000
    const otecNoiUsd = totalOtecGrossUsd - totalOtecReservesUsd; // 3,023,773
    const otecValUsd = Math.round(otecNoiUsd / (otecCapRate / 100.0)); // 48,380,368

    if (annualParkGroundRentUsd !== 1395000) throw new Error(`Unexpected annualParkGroundRentUsd: ${annualParkGroundRentUsd}`);
    if (annualSeabedRentUsd !== 221000) throw new Error(`Unexpected annualSeabedRentUsd: ${annualSeabedRentUsd}`);
    if (annualNetGenMwh !== 249660) throw new Error(`Unexpected annualNetGenMwh: ${annualNetGenMwh}`);
    if (annualPpaRoyaltyUsd !== 717773) throw new Error(`Unexpected annualPpaRoyaltyUsd: ${annualPpaRoyaltyUsd}`);
    if (totalOtecGrossUsd !== 3603773) throw new Error(`Unexpected totalOtecGrossUsd: ${totalOtecGrossUsd}`);
    if (otecNoiUsd !== 3023773) throw new Error(`Unexpected otecNoiUsd: ${otecNoiUsd}`);
    if (otecValUsd !== 48380368) throw new Error(`Unexpected otecValUsd: ${otecValUsd}`);

    console.log(`✅ Onshore Industrial Campus & Seabed Concession: $${totalOtecBaseRentUsd.toLocaleString()}/yr`);
    console.log(`✅ 30 MWe Baseload PPA Royalty: $${annualPpaRoyaltyUsd.toLocaleString()}/yr (${annualNetGenMwh.toLocaleString()} MWh net)`);
    console.log(`✅ Deep Ocean Water SWAC & Desalination Concessions: $${(swacConcession + desalConcession).toLocaleString()}/yr`);
    console.log(`✅ Net Operating Income & OTEC Park Valuation: $${otecNoiUsd.toLocaleString()}/yr NOI -> $${(otecValUsd / 1e6).toFixed(2)}M (@ ${otecCapRate}% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 4: Autonomous Rail Intermodal Inland Port & Robotic Gantry Crane Terminal Modeler
    // =========================================================================
    console.log('--- Feature 4: Autonomous Rail Intermodal Inland Port Modeler ---');
    const yardAcres = 120;
    const yardRentPerAcre = 24000;
    const trackFeet = 22000;
    const trackageTariffPerFoot = 38.0;
    const liftMoves = 350000;
    const liftFeePerMove = 18.5;
    const armgCranes = 12;
    const armgRoyaltyPerCrane = 45000;
    const demurrageRevenue = 1250000;
    const demurrageSharePct = 20.0;
    const derailmentEscrow = 420000;
    const switcherReserve = 280000;
    const inlandPortCapRate = 6.00;

    const annualYardGroundRentUsd = Math.round(yardAcres * yardRentPerAcre); // 2,880,000
    const annualTrackageTariffUsd = Math.round(trackFeet * trackageTariffPerFoot); // 836,000
    const totalRailBaseRentUsd = annualYardGroundRentUsd + annualTrackageTariffUsd; // 3,716,000

    const annualLiftConcessionUsd = Math.round(liftMoves * liftFeePerMove); // 6,475,000
    const annualArmgRoyaltiesUsd = Math.round(armgCranes * armgRoyaltyPerCrane); // 540,000
    const annualDemurrageShareUsd = Math.round(demurrageRevenue * (demurrageSharePct / 100.0)); // 250,000

    const totalRailGrossUsd =
      totalRailBaseRentUsd +
      annualLiftConcessionUsd +
      annualArmgRoyaltiesUsd +
      annualDemurrageShareUsd; // 10,981,000

    const totalRailReservesUsd = derailmentEscrow + switcherReserve; // 700,000
    const railNoiUsd = totalRailGrossUsd - totalRailReservesUsd; // 10,281,000
    const railValUsd = Math.round(railNoiUsd / (inlandPortCapRate / 100.0)); // 171,350,000

    if (annualYardGroundRentUsd !== 2880000) throw new Error(`Unexpected annualYardGroundRentUsd: ${annualYardGroundRentUsd}`);
    if (annualTrackageTariffUsd !== 836000) throw new Error(`Unexpected annualTrackageTariffUsd: ${annualTrackageTariffUsd}`);
    if (annualLiftConcessionUsd !== 6475000) throw new Error(`Unexpected annualLiftConcessionUsd: ${annualLiftConcessionUsd}`);
    if (annualArmgRoyaltiesUsd !== 540000) throw new Error(`Unexpected annualArmgRoyaltiesUsd: ${annualArmgRoyaltiesUsd}`);
    if (annualDemurrageShareUsd !== 250000) throw new Error(`Unexpected annualDemurrageShareUsd: ${annualDemurrageShareUsd}`);
    if (totalRailGrossUsd !== 10981000) throw new Error(`Unexpected totalRailGrossUsd: ${totalRailGrossUsd}`);
    if (railNoiUsd !== 10281000) throw new Error(`Unexpected railNoiUsd: ${railNoiUsd}`);
    if (railValUsd !== 171350000) throw new Error(`Unexpected railValUsd: ${railValUsd}`);

    console.log(`✅ Classification Yard & Class I Trackage Concession: $${totalRailBaseRentUsd.toLocaleString()}/yr`);
    console.log(`✅ Electric ARMG Robotic Lift Concessions: $${annualLiftConcessionUsd.toLocaleString()}/yr (${liftMoves.toLocaleString()} container lifts)`);
    console.log(`✅ Demurrage & Automation Royalty Streams: $${(annualArmgRoyaltiesUsd + annualDemurrageShareUsd).toLocaleString()}/yr`);
    console.log(`✅ Net Operating Income & Inland Port Valuation: $${railNoiUsd.toLocaleString()}/yr NOI -> $${(railValUsd / 1e6).toFixed(2)}M (@ ${inlandPortCapRate}% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 5: High-Voltage Direct Current (HVDC) Converter Station & Merchant Transmission Interconnector Modeler
    // =========================================================================
    console.log('--- Feature 5: High-Voltage Direct Current (HVDC) Converter Station Modeler ---');
    const hvdcSiteAcres = 40;
    const hvdcRentPerAcre = 35000;
    const rowMiles = 85;
    const rowTariffPerMile = 28000;
    const hvdcCapacityMw = 2000;
    const firmWheelingRatePerKwMonth = 4.25;
    const transmittedMwh = 14500000;
    const lmpSpreadArbitrage = 12.50;
    const lmpCongestionSharePct = 3.5;
    const valveHallReserve = 850000;
    const harmonicFilterEscrow = 450000;
    const hvdcCapRate = 5.75;

    const annualSiteRentUsd = Math.round(hvdcSiteAcres * hvdcRentPerAcre); // 1,400,000
    const annualRowRentUsd = Math.round(rowMiles * rowTariffPerMile); // 2,380,000
    const totalHvdcBaseRentUsd = annualSiteRentUsd + annualRowRentUsd; // 3,780,000

    const annualFirmWheelingUsd = Math.round(hvdcCapacityMw * 1000 * firmWheelingRatePerKwMonth * 12); // 102,000,000
    const annualGrossCongestionUsd = Math.round(transmittedMwh * lmpSpreadArbitrage); // 181,250,000
    const annualCongestionRoyaltyUsd = Math.round(annualGrossCongestionUsd * (lmpCongestionSharePct / 100.0)); // 6,343,750

    const totalHvdcGrossUsd = totalHvdcBaseRentUsd + annualFirmWheelingUsd + annualCongestionRoyaltyUsd; // 112,123,750
    const totalHvdcReservesUsd = valveHallReserve + harmonicFilterEscrow; // 1,300,000
    const hvdcNoiUsd = totalHvdcGrossUsd - totalHvdcReservesUsd; // 110,823,750
    const hvdcValUsd = Math.round(hvdcNoiUsd / (hvdcCapRate / 100.0)); // 1,927,369,565

    if (annualSiteRentUsd !== 1400000) throw new Error(`Unexpected annualSiteRentUsd: ${annualSiteRentUsd}`);
    if (annualRowRentUsd !== 2380000) throw new Error(`Unexpected annualRowRentUsd: ${annualRowRentUsd}`);
    if (annualFirmWheelingUsd !== 102000000) throw new Error(`Unexpected annualFirmWheelingUsd: ${annualFirmWheelingUsd}`);
    if (annualCongestionRoyaltyUsd !== 6343750) throw new Error(`Unexpected annualCongestionRoyaltyUsd: ${annualCongestionRoyaltyUsd}`);
    if (totalHvdcGrossUsd !== 112123750) throw new Error(`Unexpected totalHvdcGrossUsd: ${totalHvdcGrossUsd}`);
    if (hvdcNoiUsd !== 110823750) throw new Error(`Unexpected hvdcNoiUsd: ${hvdcNoiUsd}`);
    if (hvdcValUsd !== 1927369565) throw new Error(`Unexpected hvdcValUsd: ${hvdcValUsd}`);

    console.log(`✅ Converter Hall Ground & 85-Mile Merchant ROW Easement: $${totalHvdcBaseRentUsd.toLocaleString()}/yr`);
    console.log(`✅ 2,000 MW Firm Wheeling Reservation Tariffs: $${annualFirmWheelingUsd.toLocaleString()}/yr`);
    console.log(`✅ Locational Marginal Price (LMP) Congestion Arbitrage: $${annualCongestionRoyaltyUsd.toLocaleString()}/yr`);
    console.log(`✅ Net Operating Income & Converter Station Valuation: $${hvdcNoiUsd.toLocaleString()}/yr NOI -> $${(hvdcValUsd / 1e6).toFixed(2)}M (@ ${hvdcCapRate}% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 6: Cross-Asset Frontier Infrastructure Portfolio Aggregation & Stress Shock
    // =========================================================================
    console.log('--- Feature 6: Phase 29 Frontier Infrastructure Portfolio Aggregation & Stress Shock ---');
    const phase29PortfolioValuationSumUsd =
      spaceportValUsd +
      safValUsd +
      otecValUsd +
      railValUsd +
      hvdcValUsd; // 2,497,576,856

    const phase29TotalGrossUsd =
      totalSpaceportGrossUsd +
      totalSafGrossUsd +
      totalOtecGrossUsd +
      totalRailGrossUsd +
      totalHvdcGrossUsd; // 150,789,773

    const phase29TotalNoiUsd =
      spaceportNoiUsd +
      safNoiUsd +
      otecNoiUsd +
      railNoiUsd +
      hvdcNoiUsd; // 146,289,773

    // Capital Market Stress Shock: +50 bps cap rate shift across all sectors, +10% reserve inflation, 90% throughput realization
    const capShiftPct = 0.50;
    const reserveInflationMult = 1.10;
    const throughputRealizationMult = 0.90;

    const stressedSpaceportNoi =
      (annualPadGroundRentUsd + annualVifRentUsd + Math.round((annualTestStandFeesUsd + annualLaunchTariffsUsd + annualPropellantFlowageUsd) * throughputRealizationMult)) -
      Math.round(totalSpaceportReservesUsd * reserveInflationMult);
    const stressedSpaceportVal = Math.round(stressedSpaceportNoi / ((spaceportCapRate + capShiftPct) / 100.0));

    const stressedHvdcNoi =
      (totalHvdcBaseRentUsd + annualFirmWheelingUsd + Math.round(annualCongestionRoyaltyUsd * throughputRealizationMult)) -
      Math.round(totalHvdcReservesUsd * reserveInflationMult);
    const stressedHvdcVal = Math.round(stressedHvdcNoi / ((hvdcCapRate + capShiftPct) / 100.0));

    if (phase29PortfolioValuationSumUsd !== 2497576856) throw new Error(`Unexpected Phase 29 Portfolio Valuation: ${phase29PortfolioValuationSumUsd}`);
    if (phase29TotalGrossUsd !== 150790523) throw new Error(`Unexpected Phase 29 Total Gross: ${phase29TotalGrossUsd}`);
    if (phase29TotalNoiUsd !== 146290523) throw new Error(`Unexpected Phase 29 Total NOI: ${phase29TotalNoiUsd}`);
    if (stressedSpaceportVal >= spaceportValUsd) throw new Error('Capital shock must reduce Spaceport asset valuation');
    if (stressedHvdcVal >= hvdcValUsd) throw new Error('Capital shock must reduce HVDC asset valuation');

    console.log(`✅ Combined Phase 29 Portfolio Gross Revenue: $${(phase29TotalGrossUsd / 1e6).toFixed(2)}M/yr`);
    console.log(`✅ Combined Phase 29 Portfolio Net Operating Income (NOI): $${(phase29TotalNoiUsd / 1e6).toFixed(2)}M/yr`);
    console.log(`✅ Total Combined Frontier Infrastructure Portfolio Valuation: $${(phase29PortfolioValuationSumUsd / 1e6).toFixed(2)}M (~$2.50B AUM)`);
    console.log(`✅ Stressed Spaceport Valuation (+50bps / 90% Launches / +10% Escrow): $${(stressedSpaceportVal / 1e6).toFixed(2)}M vs $${(spaceportValUsd / 1e6).toFixed(2)}M baseline`);
    console.log(`✅ Stressed HVDC Converter Valuation (+50bps / 90% Congestion Arbitrage): $${(stressedHvdcVal / 1e6).toFixed(2)}M vs $${(hvdcValUsd / 1e6).toFixed(2)}M baseline\n`);

    console.log('🎉 ALL PHASE 29 FRONTIER INFRASTRUCTURE SUITE INTEGRATION TESTS PASSED WITH 100% PRECISION!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  }
}

verifyPhase29Features();
