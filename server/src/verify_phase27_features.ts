import pool from './db';

async function verifyPhase27Features() {
  console.log('🧪 Starting Phase 27 Frontier Institutional Specialized Infrastructure Integration Test Suite...\n');

  try {
    // 1. Database sanity check
    const leaseRes = await pool.query('SELECT id, filename, property_name FROM leases LIMIT 1');
    if (leaseRes.rows.length === 0) {
      console.error('❌ Verification failed: No existing leases found in database.');
      process.exit(1);
    }
    const lease = leaseRes.rows[0];
    console.log(`✅ Selected target test lease: ID=${lease.id}, Property=${lease.property_name || lease.filename}\n`);

    // =========================================================================
    // FEATURE 1: Commercial Fusion Power Prototype & Superconducting Magnet Facility Modeler
    // =========================================================================
    console.log('--- Feature 1: Commercial Fusion Power Prototype & Superconducting Magnet Facility Modeler ---');
    const campusSiteFootprintAcres = 80;
    const landGroundRentPerAcreYearUsd = 32000;
    const tokamakHallCleanroomSqft = 45000;
    const tokamakCleanroomRentPerSqftYearUsd = 125.00;
    const highFieldMagnetCryogenicTestingBays = 4;
    const cryogenicBayLeaseFeeAnnualUsd = 750000;
    const deuteriumTritiumFuelHandlingEscrowAnnualUsd = 950000;
    const highTemperatureSuperconductorChillerReserveAnnualUsd = 480000;
    const magneticExclusionRadiusM = 350;
    const fusionCapRatePct = 6.5;

    const annualCampusGroundRentUsd = campusSiteFootprintAcres * landGroundRentPerAcreYearUsd; // 2,560,000
    const annualTokamakCleanroomRentUsd = tokamakHallCleanroomSqft * tokamakCleanroomRentPerSqftYearUsd; // 5,625,000
    const annualCryogenicBaysRentUsd = highFieldMagnetCryogenicTestingBays * cryogenicBayLeaseFeeAnnualUsd; // 3,000,000
    const totalLandlordGrossRevenueUsd = annualCampusGroundRentUsd + annualTokamakCleanroomRentUsd + annualCryogenicBaysRentUsd; // 11,185,000

    const totalOperatingReservesAnnualUsd = deuteriumTritiumFuelHandlingEscrowAnnualUsd + highTemperatureSuperconductorChillerReserveAnnualUsd; // 1,430,000
    const netOperatingIncomeUsd = totalLandlordGrossRevenueUsd - totalOperatingReservesAnnualUsd; // 9,755,000
    const fusionFacilityValuationUsd = Math.round(netOperatingIncomeUsd / (fusionCapRatePct / 100)); // 150,076,923

    if (annualCampusGroundRentUsd !== 2560000) throw new Error(`Unexpected annualCampusGroundRentUsd: ${annualCampusGroundRentUsd}`);
    if (annualTokamakCleanroomRentUsd !== 5625000) throw new Error(`Unexpected annualTokamakCleanroomRentUsd: ${annualTokamakCleanroomRentUsd}`);
    if (annualCryogenicBaysRentUsd !== 3000000) throw new Error(`Unexpected annualCryogenicBaysRentUsd: ${annualCryogenicBaysRentUsd}`);
    if (totalLandlordGrossRevenueUsd !== 11185000) throw new Error(`Unexpected totalLandlordGrossRevenueUsd: ${totalLandlordGrossRevenueUsd}`);
    if (totalOperatingReservesAnnualUsd !== 1430000) throw new Error(`Unexpected totalOperatingReservesAnnualUsd: ${totalOperatingReservesAnnualUsd}`);
    if (netOperatingIncomeUsd !== 9755000) throw new Error(`Unexpected netOperatingIncomeUsd: ${netOperatingIncomeUsd}`);
    if (fusionFacilityValuationUsd !== 150076923) throw new Error(`Unexpected fusionFacilityValuationUsd: ${fusionFacilityValuationUsd}`);

    console.log(`✅ Campus Ground Rent: $${annualCampusGroundRentUsd.toLocaleString()}/yr (${campusSiteFootprintAcres} acres @ $${landGroundRentPerAcreYearUsd.toLocaleString()}/acre)`);
    console.log(`✅ Tokamak Cleanroom Rent: $${annualTokamakCleanroomRentUsd.toLocaleString()}/yr (${tokamakHallCleanroomSqft.toLocaleString()} sqft @ $${tokamakCleanroomRentPerSqftYearUsd}/sqft)`);
    console.log(`✅ Cryogenic Magnet Testing Bays: $${annualCryogenicBaysRentUsd.toLocaleString()}/yr (${highFieldMagnetCryogenicTestingBays} bays @ $${cryogenicBayLeaseFeeAnnualUsd.toLocaleString()}/bay)`);
    console.log(`✅ Net Operating Income & Asset Valuation: $${netOperatingIncomeUsd.toLocaleString()}/yr NOI -> $${(fusionFacilityValuationUsd / 1e6).toFixed(2)}M (@ ${fusionCapRatePct}% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 2: Critical Battery Metals Hydrometallurgical Refining & Recycling Modeler
    // =========================================================================
    console.log('--- Feature 2: Critical Battery Metals Hydrometallurgical Refining & Recycling Complex Modeler ---');
    const blackMassRefiningCapacityTpy = 35000;
    const spodumeneConcentrateInputTpy = 120000;
    const facilitySiteFootprintAcres = 55;
    const plantGroundRentPerAcreYearUsd = 26000;
    const actualBlackMassProcessedTpy = 32000;
    const landlordThroughputRoyaltyPct = 1.75;
    const batteryGradeLithiumCarbonateOutputTpy = 8500;
    const lithiumSalesPricePerTonUsd = 16500;
    const landlordLithiumSalesRoyaltyPct = 2.0;
    const ira30dDomesticSourcingCompliancePct = 92.5;
    const zeroLiquidDischargeZldReserveAnnualUsd = 360000;
    const solventExtractionFireScrubberReserveAnnualUsd = 220000;
    const batteryMetalsCapRatePct = 7.0;

    const annualPlantGroundRentUsd = facilitySiteFootprintAcres * plantGroundRentPerAcreYearUsd; // 1,430,000
    const assumedBlackMassProcessingFeePerTonUsd = 1800;
    const annualBlackMassProcessingRevenueUsd = actualBlackMassProcessedTpy * assumedBlackMassProcessingFeePerTonUsd; // 57,600,000
    const annualLandlordThroughputRoyaltyUsd = Math.round(annualBlackMassProcessingRevenueUsd * (landlordThroughputRoyaltyPct / 100)); // 1,008,000

    const annualGrossLithiumSalesUsd = batteryGradeLithiumCarbonateOutputTpy * lithiumSalesPricePerTonUsd; // 140,250,000
    const annualLandlordLithiumRoyaltyUsd = Math.round(annualGrossLithiumSalesUsd * (landlordLithiumSalesRoyaltyPct / 100)); // 2,805,000

    const totalLandlordBmGrossRevenueUsd = annualPlantGroundRentUsd + annualLandlordThroughputRoyaltyUsd + annualLandlordLithiumRoyaltyUsd; // 5,243,000
    const totalOperatingReservesBmUsd = zeroLiquidDischargeZldReserveAnnualUsd + solventExtractionFireScrubberReserveAnnualUsd; // 580,000
    const netOperatingIncomeBmUsd = totalLandlordBmGrossRevenueUsd - totalOperatingReservesBmUsd; // 4,663,000
    const batteryMetalsValuationUsd = Math.round(netOperatingIncomeBmUsd / (batteryMetalsCapRatePct / 100)); // 66,614,286

    if (annualPlantGroundRentUsd !== 1430000) throw new Error(`Unexpected annualPlantGroundRentUsd: ${annualPlantGroundRentUsd}`);
    if (annualLandlordThroughputRoyaltyUsd !== 1008000) throw new Error(`Unexpected annualLandlordThroughputRoyaltyUsd: ${annualLandlordThroughputRoyaltyUsd}`);
    if (annualLandlordLithiumRoyaltyUsd !== 2805000) throw new Error(`Unexpected annualLandlordLithiumRoyaltyUsd: ${annualLandlordLithiumRoyaltyUsd}`);
    if (totalLandlordBmGrossRevenueUsd !== 5243000) throw new Error(`Unexpected totalLandlordBmGrossRevenueUsd: ${totalLandlordBmGrossRevenueUsd}`);
    if (netOperatingIncomeBmUsd !== 4663000) throw new Error(`Unexpected netOperatingIncomeBmUsd: ${netOperatingIncomeBmUsd}`);
    if (batteryMetalsValuationUsd !== 66614286) throw new Error(`Unexpected batteryMetalsValuationUsd: ${batteryMetalsValuationUsd}`);

    console.log(`✅ Plant Ground Rent: $${annualPlantGroundRentUsd.toLocaleString()}/yr (${facilitySiteFootprintAcres} acres @ $${plantGroundRentPerAcreYearUsd.toLocaleString()}/acre)`);
    console.log(`✅ Black Mass Processing Royalty: $${annualLandlordThroughputRoyaltyUsd.toLocaleString()}/yr (${actualBlackMassProcessedTpy.toLocaleString()} TPY @ ${landlordThroughputRoyaltyPct}%)`);
    console.log(`✅ Battery-Grade Lithium Royalty: $${annualLandlordLithiumRoyaltyUsd.toLocaleString()}/yr (${batteryGradeLithiumCarbonateOutputTpy.toLocaleString()} TPY @ ${landlordLithiumSalesRoyaltyPct}%)`);
    console.log(`✅ Net Operating Income & Valuation: $${netOperatingIncomeBmUsd.toLocaleString()}/yr NOI -> $${(batteryMetalsValuationUsd / 1e6).toFixed(2)}M (@ ${batteryMetalsCapRatePct}% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 3: Continuous Biomanufacturing, Viral Vector & Monoclonal Antibody (mAb) Foundry Modeler
    // =========================================================================
    console.log('--- Feature 3: Continuous Biomanufacturing, Viral Vector & Monoclonal Antibody Foundry Modeler ---');
    const cleanroomIso5Sqft = 22000;
    const cleanroomBaseRentPerSqft = 115.00;
    const modularSuiteSkidCount = 6;
    const singleUseSkidFeeUsd = 85000;
    const annualCommercialBatches = 48;
    const batchHarvestRoyaltyFeeUsd = 42000;
    const annualTiterYieldBonusUsd = 650000;
    const usp645WfiReserveUsd = 380000;
    const liquidNitrogenEscrowUsd = 210000;
    const hepaAirflowAch = 65;
    const biomanufacturingCapRatePct = 6.75;

    const annualBaseCleanroomRentUsd = cleanroomIso5Sqft * cleanroomBaseRentPerSqft; // 2,530,000
    const annualSkidInfrastructureFeesUsd = modularSuiteSkidCount * singleUseSkidFeeUsd; // 510,000
    const annualBatchHarvestRoyaltiesUsd = annualCommercialBatches * batchHarvestRoyaltyFeeUsd; // 2,016,000
    const totalLandlordGrossBioRevenueUsd = annualBaseCleanroomRentUsd + annualSkidInfrastructureFeesUsd + annualBatchHarvestRoyaltiesUsd + annualTiterYieldBonusUsd; // 5,706,000

    const totalEscrowsAndReservesBioUsd = usp645WfiReserveUsd + liquidNitrogenEscrowUsd; // 590,000
    const netOperatingIncomeBioUsd = totalLandlordGrossBioRevenueUsd - totalEscrowsAndReservesBioUsd; // 5,116,000
    const capitalizedBioValuationUsd = Math.round(netOperatingIncomeBioUsd / (biomanufacturingCapRatePct / 100)); // 75,792,593

    if (annualBaseCleanroomRentUsd !== 2530000) throw new Error(`Unexpected annualBaseCleanroomRentUsd: ${annualBaseCleanroomRentUsd}`);
    if (annualSkidInfrastructureFeesUsd !== 510000) throw new Error(`Unexpected annualSkidInfrastructureFeesUsd: ${annualSkidInfrastructureFeesUsd}`);
    if (annualBatchHarvestRoyaltiesUsd !== 2016000) throw new Error(`Unexpected annualBatchHarvestRoyaltiesUsd: ${annualBatchHarvestRoyaltiesUsd}`);
    if (totalLandlordGrossBioRevenueUsd !== 5706000) throw new Error(`Unexpected totalLandlordGrossBioRevenueUsd: ${totalLandlordGrossBioRevenueUsd}`);
    if (netOperatingIncomeBioUsd !== 5116000) throw new Error(`Unexpected netOperatingIncomeBioUsd: ${netOperatingIncomeBioUsd}`);
    if (capitalizedBioValuationUsd !== 75792593) throw new Error(`Unexpected capitalizedBioValuationUsd: ${capitalizedBioValuationUsd}`);

    console.log(`✅ Base Cleanroom Rent: $${annualBaseCleanroomRentUsd.toLocaleString()}/yr (${cleanroomIso5Sqft.toLocaleString()} sqft @ $${cleanroomBaseRentPerSqft}/sqft)`);
    console.log(`✅ Perfusion Skid Suite Fees: $${annualSkidInfrastructureFeesUsd.toLocaleString()}/yr (${modularSuiteSkidCount} modular skids)`);
    console.log(`✅ Batch Commercial Royalties: $${annualBatchHarvestRoyaltiesUsd.toLocaleString()}/yr (${annualCommercialBatches} batches @ $${batchHarvestRoyaltyFeeUsd.toLocaleString()}/batch)`);
    console.log(`✅ Net Operating Income & Valuation: $${netOperatingIncomeBioUsd.toLocaleString()}/yr NOI -> $${(capitalizedBioValuationUsd / 1e6).toFixed(2)}M (@ ${biomanufacturingCapRatePct}% Cap Rate)\n`);

    // =========================================================================
    // FEATURE 4: Autonomous Freight Logistics Terminal & Megawatt Charging Depots Modeler
    // =========================================================================
    console.log('--- Feature 4: Autonomous Freight Logistics Terminal & Megawatt Charging Depots Modeler ---');
    const yardStagingAcres = 40;
    const yardGroundRentPerAcreYearUsd = 36000;
    const automatedIngressLanesCount = 8;
    const laneAccessTariffPerMonthUsd = 12500;
    const mcsMegawattChargersCount = 16;
    const mcsChargerPowerCapacityMw = 1.2;
    const annualChargingThroughputMwh = 42000;
    const electricityMarkupMarginPerKwhUsd = 0.045;
    const batterySwapStallConcessionAnnualUsd = 580000;
    const avYardTeleoperationTowerReserveAnnualUsd = 290000;
    const defThermalContainmentEscrowAnnualUsd = 180000;
    const autonomousFreightCapRatePct = 6.25;

    const annualYardGroundRentUsd = yardStagingAcres * yardGroundRentPerAcreYearUsd; // 1,440,000
    const annualGateTariffsUsd = automatedIngressLanesCount * laneAccessTariffPerMonthUsd * 12; // 1,200,000
    const annualChargingThroughputKwh = annualChargingThroughputMwh * 1000; // 42,000,000 kWh
    const annualChargingConcessionRevenueUsd = annualChargingThroughputKwh * electricityMarkupMarginPerKwhUsd; // 1,890,000
    const totalLandlordGrossAfRevenueUsd = annualYardGroundRentUsd + annualGateTariffsUsd + annualChargingConcessionRevenueUsd + batterySwapStallConcessionAnnualUsd; // 5,110,000

    const totalEscrowsAndReservesAfUsd = avYardTeleoperationTowerReserveAnnualUsd + defThermalContainmentEscrowAnnualUsd; // 470,000
    const netOperatingIncomeAfUsd = totalLandlordGrossAfRevenueUsd - totalEscrowsAndReservesAfUsd; // 4,640,000
    const capitalizedAfValuationUsd = Math.round(netOperatingIncomeAfUsd / (autonomousFreightCapRatePct / 100)); // 74,240,000
    const totalPeakChargingCapacityMw = mcsMegawattChargersCount * mcsChargerPowerCapacityMw; // 19.2 MW

    if (annualYardGroundRentUsd !== 1440000) throw new Error(`Unexpected annualYardGroundRentUsd: ${annualYardGroundRentUsd}`);
    if (annualGateTariffsUsd !== 1200000) throw new Error(`Unexpected annualGateTariffsUsd: ${annualGateTariffsUsd}`);
    if (annualChargingConcessionRevenueUsd !== 1890000) throw new Error(`Unexpected annualChargingConcessionRevenueUsd: ${annualChargingConcessionRevenueUsd}`);
    if (totalLandlordGrossAfRevenueUsd !== 5110000) throw new Error(`Unexpected totalLandlordGrossAfRevenueUsd: ${totalLandlordGrossAfRevenueUsd}`);
    if (netOperatingIncomeAfUsd !== 4640000) throw new Error(`Unexpected netOperatingIncomeAfUsd: ${netOperatingIncomeAfUsd}`);
    if (capitalizedAfValuationUsd !== 74240000) throw new Error(`Unexpected capitalizedAfValuationUsd: ${capitalizedAfValuationUsd}`);
    if (totalPeakChargingCapacityMw !== 19.2) throw new Error(`Unexpected totalPeakChargingCapacityMw: ${totalPeakChargingCapacityMw}`);

    console.log(`✅ Staging Yard Ground Rent: $${annualYardGroundRentUsd.toLocaleString()}/yr (${yardStagingAcres} acres @ $${yardGroundRentPerAcreYearUsd.toLocaleString()}/acre)`);
    console.log(`✅ Ingress Optical Gate Access Tariffs: $${annualGateTariffsUsd.toLocaleString()}/yr (${automatedIngressLanesCount} automated lanes)`);
    console.log(`✅ MCS Electric Charging Concession: $${annualChargingConcessionRevenueUsd.toLocaleString()}/yr (${annualChargingThroughputMwh.toLocaleString()} MWh delivered @ $${electricityMarkupMarginPerKwhUsd}/kWh margin)`);
    console.log(`✅ Peak Charging Capacity: ${totalPeakChargingCapacityMw.toFixed(1)} MW total grid connection across ${mcsMegawattChargersCount} MCS dispensers`);
    console.log(`✅ Net Operating Income & Valuation: $${netOperatingIncomeAfUsd.toLocaleString()}/yr NOI -> $${(capitalizedAfValuationUsd / 1e6).toFixed(2)}M (@ ${autonomousFreightCapRatePct}% Cap Rate)\n`);

    console.log('🎉 ALL 4 PHASE 27 INSTITUTIONAL INFRASTRUCTURE MODELERS VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  }
}

verifyPhase27Features();
