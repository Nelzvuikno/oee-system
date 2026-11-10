export function round2(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function round1(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function convertPackagingUnits(qtyPcs, sku) {
  const pcs = Math.max(0, Number(qtyPcs) || 0);
  const pcsPerSecondary = Math.max(1, Number(sku?.pcs_per_secondary) || 10);
  const pcsPerTertiary = Math.max(1, Number(sku?.pcs_per_tertiary) || 40);
  const netWeightGrams = Math.max(0, Number(sku?.net_weight_grams) || 250);

  return {
    pcs: Math.round(pcs),
    secondary: round2(pcs / pcsPerSecondary),
    secondaryUnit: sku?.secondary_unit || 'inner',
    tertiary: round2(pcs / pcsPerTertiary),
    tertiaryUnit: sku?.tertiary_unit || 'karton',
    weightKg: round2((pcs * netWeightGrams) / 1000)
  };
}

export function normalizeActualUnitToPcs(qtyActual, unitName, sku) {
  const qty = Math.max(0, Number(qtyActual) || 0);
  const normalizedUnit = String(unitName || 'pcs').trim().toLowerCase();
  const pcsPerSecondary = Math.max(1, Number(sku?.pcs_per_secondary) || 10);
  const pcsPerTertiary = Math.max(1, Number(sku?.pcs_per_tertiary) || 40);
  const netWeightGrams = Math.max(1, Number(sku?.net_weight_grams) || 250);

  if (normalizedUnit === 'karton' || normalizedUnit === 'carton' || normalizedUnit === 'box') {
    return Math.round(qty * pcsPerTertiary);
  }
  if (normalizedUnit === 'inner' || normalizedUnit === 'pack' || normalizedUnit === 'bal') {
    return Math.round(qty * pcsPerSecondary);
  }
  if (normalizedUnit === 'kg' || normalizedUnit === 'kilogram') {
    return Math.round((qty * 1000) / netWeightGrams);
  }
  if (normalizedUnit === 'gram' || normalizedUnit === 'g') {
    return Math.round(qty / netWeightGrams);
  }
  return Math.round(qty);
}

export function calculateOeeMetrics(input) {
  const calendarMinutes = Math.max(0, Number(input.calendarMinutes ?? 480));
  const plannedDowntimeMinutes = Math.max(0, Number(input.plannedDowntimeMinutes ?? 0));
  const loadingMinutes = input.loadingMinutes !== undefined
    ? Math.max(0, Number(input.loadingMinutes))
    : Math.max(0, calendarMinutes - plannedDowntimeMinutes);

  const breakdownL01Minutes = Math.max(0, Number(input.breakdownL01Minutes ?? 0));
  const breakdownL01Count = Math.max(0, Math.trunc(Number(input.breakdownL01Count ?? 0)));
  const setupL02Minutes = Math.max(0, Number(input.setupL02Minutes ?? 0));
  const unplannedDowntimeMinutes = input.unplannedDowntimeMinutes !== undefined
    ? Math.max(0, Number(input.unplannedDowntimeMinutes))
    : round2(breakdownL01Minutes + setupL02Minutes);

  const operatingMinutes = round2(Math.max(0, loadingMinutes - unplannedDowntimeMinutes));
  const minorStopL03Minutes = Math.max(0, Number(input.minorStopL03Minutes ?? 0));
  // Teknika 2023 Tabel 13-14 evaluates Performance against active running time after subtracting L-03 idle time.
  const activeOperatingMinutes = input.activeOperatingMinutes !== undefined
    ? Math.max(0, Number(input.activeOperatingMinutes))
    : round2(Math.max(0, operatingMinutes - minorStopL03Minutes));

  const idealCycleTimeMin = Math.max(0.0001, Number(input.idealCycleTimeMin ?? 0.024));
  const totalProcessedPcs = Math.max(0, Math.round(Number(input.totalProcessedPcs ?? 0)));
  const defectPcs = Math.max(0, Math.round(Number(input.defectPcs ?? 0)));
  const scrapK3Pcs = Math.max(0, Math.round(Number(input.scrapK3Pcs ?? 0)));
  const reworkPcs = Math.max(0, Math.round(Number(input.reworkPcs ?? 0)));
  const goodOutputPcs = input.goodOutputPcs !== undefined
    ? Math.max(0, Math.round(Number(input.goodOutputPcs)))
    : Math.max(0, totalProcessedPcs - defectPcs);

  const netOperatingRaw = totalProcessedPcs * idealCycleTimeMin;
  const netOperatingMinutes = round2(netOperatingRaw);
  const reducedSpeedL04Minutes = round2(Math.max(0, activeOperatingMinutes - netOperatingRaw));
  const defectL05Minutes = round2(defectPcs * idealCycleTimeMin);
  const scrapL06Minutes = round2(scrapK3Pcs * idealCycleTimeMin);
  const valueAddedMinutes = round2(Math.max(0, netOperatingRaw - (defectPcs + scrapK3Pcs) * idealCycleTimeMin));

  const availabilityRaw = loadingMinutes > 0 ? (operatingMinutes / loadingMinutes) * 100 : 0;
  const perfDenom = activeOperatingMinutes > 0 ? activeOperatingMinutes : operatingMinutes;
  const performanceRaw = perfDenom > 0 ? Math.min(100, (netOperatingRaw / perfDenom) * 100) : 0;
  const qualityRaw = totalProcessedPcs > 0 ? ((totalProcessedPcs - defectPcs) / totalProcessedPcs) * 100 : 0;

  const availabilityPct = round2(availabilityRaw);
  const performancePct = round2(performanceRaw);
  const qualityPct = round2(qualityRaw);
  const oeePct = round2((availabilityPct / 100) * (performancePct / 100) * (qualityPct / 100) * 100);

  const utilityPct = calendarMinutes > 0 ? round2((loadingMinutes / calendarMinutes) * 100) : 0;
  const teepPct = calendarMinutes > 0 ? round2((oeePct / 100) * (utilityPct / 100) * 100) : 0;
  const targetProductionPcs = Math.max(0, Math.round(Number(input.targetProductionPcs ?? 0)));
  const achievementPct = targetProductionPcs > 0 ? round2((goodOutputPcs / targetProductionPcs) * 100) : 0;
  const avgSpeedPcsMin = activeOperatingMinutes > 0 ? round1(totalProcessedPcs / activeOperatingMinutes) : 0;

  // Return null when zero L-01 breakdowns occurred so UI displays N/A instead of Infinity or 0.
  const mttrMinutes = breakdownL01Count > 0 ? round2(breakdownL01Minutes / breakdownL01Count) : null;
  const mtbfMinutes = breakdownL01Count > 0 ? round2(operatingMinutes / breakdownL01Count) : null;

  const sixBigLosses = buildSixBigLosses({
    loadingMinutes,
    breakdownL01Minutes,
    setupL02Minutes,
    minorStopL03Minutes,
    reducedSpeedL04Minutes,
    defectL05Minutes,
    scrapL06Minutes,
    idealCycleTimeMin
  });

  return {
    calendarMinutes: round2(calendarMinutes),
    plannedDowntimeMinutes: round2(plannedDowntimeMinutes),
    loadingMinutes: round2(loadingMinutes),
    breakdownL01Minutes: round2(breakdownL01Minutes),
    breakdownL01Count,
    setupL02Minutes: round2(setupL02Minutes),
    unplannedDowntimeMinutes: round2(unplannedDowntimeMinutes),
    operatingMinutes,
    minorStopL03Minutes: round2(minorStopL03Minutes),
    activeOperatingMinutes,
    reducedSpeedL04Minutes,
    netOperatingMinutes,
    defectL05Minutes,
    scrapL06Minutes,
    valueAddedMinutes,
    targetProductionPcs,
    totalProcessedPcs,
    goodOutputPcs,
    defectPcs,
    scrapK3Pcs,
    reworkPcs,
    avgSpeedPcsMin,
    mttrMinutes,
    mtbfMinutes,
    availabilityPct,
    performancePct,
    qualityPct,
    oeePct,
    teepPct,
    utilityPct,
    achievementPct,
    sixBigLosses
  };
}

export function buildSixBigLosses(params) {
  const loading = Math.max(0, Number(params.loadingMinutes) || 0);
  const idealCt = Math.max(0.0001, Number(params.idealCycleTimeMin) || 0.024);

  const items = [
    {
      code: 'L-01',
      pillar: 'AVAILABILITY',
      name: 'Equipment Failure Losses',
      minutes: round2(params.breakdownL01Minutes || 0)
    },
    {
      code: 'L-02',
      pillar: 'AVAILABILITY',
      name: 'Setup & Adjustment Losses',
      minutes: round2(params.setupL02Minutes || 0)
    },
    {
      code: 'L-03',
      pillar: 'PERFORMANCE',
      name: 'Idle & Minor Stoppage Losses',
      minutes: round2(params.minorStopL03Minutes || 0)
    },
    {
      code: 'L-04',
      pillar: 'PERFORMANCE',
      name: 'Reduced Speed Losses',
      minutes: round2(params.reducedSpeedL04Minutes || 0)
    },
    {
      code: 'L-05',
      pillar: 'QUALITY',
      name: 'Process Defect Losses',
      minutes: round2(params.defectL05Minutes || 0)
    },
    {
      code: 'L-06',
      pillar: 'QUALITY',
      name: 'Scrap & Startup Yield Losses',
      minutes: round2(params.scrapL06Minutes || 0)
    }
  ].map((item) => ({
    ...item,
    equivalentPcs: Math.round(item.minutes / idealCt),
    pctOfLoadingTime: loading > 0 ? round2((item.minutes / loading) * 100) : 0
  }));

  const sorted = [...items].sort((a, b) => b.minutes - a.minutes);
  const totalLossMinutes = sorted.reduce((acc, row) => acc + row.minutes, 0);
  let runningShare = 0;

  return sorted.map((row, idx) => {
    const shareOfLosses = totalLossMinutes > 0 ? (row.minutes / totalLossMinutes) * 100 : 0;
    runningShare += shareOfLosses;
    return {
      ...row,
      paretoRank: idx + 1,
      shareOfTotalLossesPct: round2(shareOfLosses),
      cumulativePct: idx === sorted.length - 1 && totalLossMinutes > 0 ? 100 : round2(Math.min(100, runningShare))
    };
  });
}

export function calculateCounterDelta(previousValue, nextValue, maxRollover = 65535) {
  const prev = Math.max(0, Math.trunc(Number(previousValue) || 0));
  const next = Math.max(0, Math.trunc(Number(nextValue) || 0));
  if (next >= prev) {
    return next - prev;
  }
  // Treat near-zero jump from a mid-range counter as shift/order reset rather than 16-bit rollover.
  if (prev > maxRollover * 0.9 && next < 500) {
    return (maxRollover - prev + 1) + next;
  }
  return next;
}

export function evaluateTelemetryAnomalies(registers, machine, activeSku) {
  const idealSpeed = Number(activeSku?.ideal_speed_pcs_per_min || 41.67);
  const warningSpeed = Number(
    activeSku?.reduced_speed_trigger_pcs_per_min || round2(idealSpeed * ((machine?.reduced_speed_threshold_pct || 91.2) / 100))
  );
  const severeSpeed = round2(idealSpeed * 0.8);

  const isRunning = Number(registers.d000_status) === 1;
  const speed = Number(registers.d002_speed_pcs_min || 0);
  const temp = Number(registers.d005_sealer_temp_c || 0);
  const vib = Number(registers.d006_vibration_mms || 0);

  const reducedSpeedLevel = !isRunning || speed <= 0
    ? 'NONE'
    : speed < severeSpeed
      ? 'SEVERE'
      : speed < warningSpeed
        ? 'WARNING'
        : 'NONE';

  const tempMin = Number(machine?.sealer_temp_min_c ?? 155.0);
  const tempMax = Number(machine?.sealer_temp_max_c ?? 185.0);
  const tempState = temp > tempMax
    ? 'CRITICAL_HIGH'
    : isRunning && temp < tempMin
      ? 'WARNING_LOW'
      : 'NORMAL';

  const vibWarn = Number(machine?.vib_warning_mms ?? 4.5);
  const vibCrit = Number(machine?.vib_critical_mms ?? 7.1);
  const vibrationState = vib > vibCrit
    ? 'CRITICAL'
    : vib > vibWarn
      ? 'WARNING'
      : 'NORMAL';

  return {
    idealSpeedPpm: idealSpeed,
    warningSpeedPpm: warningSpeed,
    severeSpeedPpm: severeSpeed,
    reducedSpeedFlag: reducedSpeedLevel !== 'NONE',
    reducedSpeedLevel,
    speedGapPpm: isRunning && speed > 0 ? round1(Math.max(0, idealSpeed - speed)) : 0,
    tempState,
    vibrationState
  };
}

export function computeBusinessImpact({ reports, skus, activeSku }) {
  const primarySku = activeSku || skus[0] || {
    code: 'SKU-GRM-250',
    ideal_cycle_time_min: 0.024,
    pcs_per_tertiary: 40,
    net_weight_grams: 250,
    unit_price_idr: null,
    cogs_idr: null
  };

  // Unassigned downtime falls back to the highest-priced configured SKU on the line when prices exist.
  const pricedSkus = skus.filter((s) => s.unit_price_idr !== null && s.unit_price_idr !== undefined && Number(s.unit_price_idr) > 0);
  const fallbackExpensiveSku = pricedSkus.length > 0
    ? [...pricedSkus].sort((a, b) => Number(b.unit_price_idr) - Number(a.unit_price_idr))[0]
    : null;

  const valuationSku = (primarySku.unit_price_idr !== null && primarySku.unit_price_idr !== undefined && Number(primarySku.unit_price_idr) > 0)
    ? primarySku
    : fallbackExpensiveSku;

  const idealCt = Math.max(0.0001, Number(primarySku.ideal_cycle_time_min) || 0.024);

  const totals = reports.reduce(
    (acc, r) => {
      acc.calendarMinutes += Number(r.calendar_minutes || 0);
      acc.plannedMinutes += Number(r.planned_downtime_minutes || 0);
      acc.loadingMinutes += Number(r.loading_minutes || 0);
      acc.breakdownL01Minutes += Number(r.breakdown_l01_minutes || 0);
      acc.setupL02Minutes += Number(r.setup_l02_minutes || 0);
      acc.minorStopL03Minutes += Number(r.minor_stop_l03_minutes || 0);
      acc.reducedSpeedL04Minutes += Number(r.reduced_speed_l04_minutes || 0);
      acc.defectL05Minutes += Number(r.defect_l05_minutes || 0);
      acc.scrapL06Minutes += Number(r.scrap_l06_minutes || 0);
      acc.goodOutputPcs += Number(r.good_output_pcs || 0);
      acc.defectPcs += Number(r.defect_pcs || 0);
      acc.scrapK3Pcs += Number(r.scrap_k3_pcs || 0);
      acc.totalProcessedPcs += Number(r.total_processed_pcs || 0);
      return acc;
    },
    {
      calendarMinutes: 0,
      plannedMinutes: 0,
      loadingMinutes: 0,
      breakdownL01Minutes: 0,
      setupL02Minutes: 0,
      minorStopL03Minutes: 0,
      reducedSpeedL04Minutes: 0,
      defectL05Minutes: 0,
      scrapL06Minutes: 0,
      goodOutputPcs: 0,
      defectPcs: 0,
      scrapK3Pcs: 0,
      totalProcessedPcs: 0
    }
  );

  const folLossMinutes = round2(
    totals.plannedMinutes +
      totals.breakdownL01Minutes +
      totals.setupL02Minutes +
      totals.minorStopL03Minutes +
      totals.reducedSpeedL04Minutes
  );
  const folOpportunityPcs = Math.round(folLossMinutes / idealCt);
  const frlQualityLossPcs = Math.round(totals.defectPcs + totals.scrapK3Pcs);
  const frlLossMinutes = round2(totals.defectL05Minutes + totals.scrapL06Minutes);

  const hasFinancialConfig = Boolean(valuationSku);
  const unitPriceIdr = hasFinancialConfig ? Number(valuationSku.unit_price_idr) : null;
  const cogsIdr = hasFinancialConfig
    ? Number(valuationSku.cogs_idr ?? valuationSku.unit_price_idr * 0.68)
    : null;

  return {
    valuationConfigured: hasFinancialConfig,
    valuationSkuCode: valuationSku?.code || primarySku.code,
    unitPriceIdr,
    cogsIdr,
    fallbackNotice: hasFinancialConfig
      ? null
      : 'Harga jual & HPP SKU belum dikonfigurasi pada Master SKU. Menampilkan valuasi berbasis Waktu Hilang (menit) dan Output Hilang (pcs/kg).',
    revenueGoodOutput: {
      ...convertPackagingUnits(totals.goodOutputPcs, primarySku),
      idr: hasFinancialConfig ? Math.round(totals.goodOutputPcs * unitPriceIdr) : null
    },
    folOpportunityLoss: {
      minutes: folLossMinutes,
      ...convertPackagingUnits(folOpportunityPcs, primarySku),
      idr: hasFinancialConfig ? Math.round(folOpportunityPcs * unitPriceIdr) : null,
      breakdown: {
        scheduleMinutes: round2(totals.plannedMinutes),
        availabilityMinutes: round2(totals.breakdownL01Minutes + totals.setupL02Minutes),
        performanceMinutes: round2(totals.minorStopL03Minutes + totals.reducedSpeedL04Minutes)
      }
    },
    frlRealQualityLoss: {
      minutes: frlLossMinutes,
      ...convertPackagingUnits(frlQualityLossPcs, primarySku),
      defectPcs: totals.defectPcs,
      scrapK3Pcs: totals.scrapK3Pcs,
      idr: hasFinancialConfig ? Math.round(frlQualityLossPcs * cogsIdr) : null
    }
  };
}

