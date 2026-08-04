'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Lease {
  id: string;
  filename: string;
  file_size: number;
  status: string;
  job_status: string;
  job_progress: number;
  job_error?: string;
  created_at: string;
  parent_lease_id?: string | null;
  document_type?: string;
  property_name?: string;
}

interface LeaseTerm {
  id: string;
  lease_id: string;
  term_name: string;
  extracted_value: string;
  confidence_score: number;
  source_clause_ids: string[] | null;
  reviewer_status: string;
}

interface Clause {
  id: string;
  clause_number: string | null;
  clause_title: string | null;
  text_content: string;
  page_number: number;
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
}

export default function LeaseLogicApp() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [terms, setTerms] = useState<LeaseTerm[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<LeaseTerm | null>(null);
  
  // Views: 'workspace' | 'observability' | 'compliance' | 'timeline' | 'benchmark' | 'risk' | 'stacking' | 'compare'
  const [currentView, setCurrentView] = useState<'workspace' | 'observability' | 'compliance' | 'timeline' | 'benchmark' | 'risk' | 'stacking' | 'compare' | 'anomalies' | 'stresstest' | 'concentration'>('workspace');
  
  // Tenant Concentration state
  const [tenantConcentrationData, setTenantConcentrationData] = useState<any>(null);
  const [loadingConcentration, setLoadingConcentration] = useState(false);
  
  // Stress-Testing Simulator state
  const [stressTestParams, setStressTestParams] = useState({
    default_rate_pct: 15,
    vacancy_rate_pct: 10,
    inflation_surge_pct: 5
  });
  const [stressTestData, setStressTestData] = useState<any>(null);
  const [loadingStressTest, setLoadingStressTest] = useState(false);
  
  // Portfolio Anomaly Auditor state
  const [portfolioAnomaliesData, setPortfolioAnomaliesData] = useState<any>(null);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);
  
  // Comparison Engine state
  const [compareLeaseId1, setCompareLeaseId1] = useState<string>('');
  const [compareLeaseId2, setCompareLeaseId2] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Stacking Plan & Rent Roll state
  const [stackingPlanData, setStackingPlanData] = useState<any>(null);
  const [loadingStackingPlan, setLoadingStackingPlan] = useState(false);

  // Risk Heatmap Matrix state
  const [riskMatrixData, setRiskMatrixData] = useState<any>(null);
  const [loadingRiskMatrix, setLoadingRiskMatrix] = useState(false);
  
  // Observability stats state
  const [stats, setStats] = useState<any>(null);

  // Compliance report state
  const [complianceReport, setComplianceReport] = useState<any[]>([]);

  // Compliance rules state
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({
    rule_name: '',
    term_name: 'indemnity_covenants',
    operator: 'min_value',
    value_limit: '',
    severity: 'fail',
    message_template: 'Insurance coverage limit ({actual}) is below the required minimum of $5,000,000.'
  });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Comparison state
  const [isComparing, setIsComparing] = useState(false);
  const [comparingTermName, setComparingTermName] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<any[]>([]);

  // Rent Projection state
  const [rentProjection, setRentProjection] = useState<any>(null);
  const [loadingProjection, setLoadingProjection] = useState(false);
  const [activeChartYear, setActiveChartYear] = useState<number | null>(null);

  // Multi-Currency & CPI Adjuster state
  const [targetCurrency, setTargetCurrency] = useState<string>('EUR');
  const [cpiAnnualRate, setCpiAnnualRate] = useState<number>(3.5);
  const [fxCpiData, setFxCpiData] = useState<any>(null);
  const [loadingFxCpi, setLoadingFxCpi] = useState(false);

  // Timeline and alerts state
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [leaseAlerts, setLeaseAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertForm, setAlertForm] = useState({
    term_name: 'expiration_date',
    alert_date: '',
    alert_type: 'email',
    recipient: 'asset-manager@leaselogic.internal'
  });

  // Benchmarking state
  const [benchmarkRuns, setBenchmarkRuns] = useState<any[]>([]);
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(false);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [benchmarkTerm, setBenchmarkTerm] = useState('initial_rent');
  const [benchmarkPrompt, setBenchmarkPrompt] = useState(
    "You are an expert commercial real estate attorney. Extract the exact value and specific section citation for '{term_name}' from the commercial lease agreement."
  );
  const [selectedModels, setSelectedModels] = useState<string[]>(['claude-3-5-sonnet', 'gpt-4o-mini']);

  // Reviewer comments and audit trail state
  const [termComments, setTermComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [reviewerName, setReviewerName] = useState('Asset Reviewer');
  const [leaseAuditLogs, setLeaseAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Proposed redlines state
  const [leaseRedlines, setLeaseRedlines] = useState<any[]>([]);
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);
  const [redlineTextValue, setRedlineTextValue] = useState<string>('');
  const [redlineAuthorName, setRedlineAuthorName] = useState<string>('Legal Advisor');

  // Relationship & Net Effective state
  const [effectiveTermsData, setEffectiveTermsData] = useState<any>(null);
  const [loadingEffectiveTerms, setLoadingEffectiveTerms] = useState(false);

  // Property Asset filter state
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');
  const [customPropertyName, setCustomPropertyName] = useState<string>('');

  // CAM Reconciliation state
  const [camInputs, setCamInputs] = useState({
    total_building_opex: 500000,
    building_gross_area_sqft: 50000,
    tenant_leased_area_sqft: 5000,
    cap_percentage: 5,
    cap_type: 'non_cumulative'
  });
  const [camAuditData, setCamAuditData] = useState<any>(null);
  const [loadingCamAudit, setLoadingCamAudit] = useState(false);

  // ESG Audit state
  const [esgAuditData, setEsgAuditData] = useState<any>(null);
  const [loadingEsgAudit, setLoadingEsgAudit] = useState(false);

  // Negotiation state
  const [negotiationData, setNegotiationData] = useState<any>(null);
  const [loadingNegotiation, setLoadingNegotiation] = useState(false);

  // Sublease state
  const [subleaseInputs, setSubleaseInputs] = useState({
    unutilized_sqft: 2500,
    estimated_market_rate_sqft: 45
  });
  const [subleaseData, setSubleaseData] = useState<any>(null);
  const [loadingSublease, setLoadingSublease] = useState(false);

  // Lease Accounting state
  const [accountingParams, setAccountingParams] = useState({
    discount_rate_pct: 4.5,
    lease_term_months: 60
  });
  const [accountingData, setAccountingData] = useState<any>(null);
  const [loadingAccounting, setLoadingAccounting] = useState(false);

  // Renewal Strategy state
  const [strategyParams, setStrategyParams] = useState({
    market_rent_sqft: 48,
    fitout_capex_sqft: 35,
    lease_sqft: 5000
  });
  const [strategyData, setStrategyData] = useState<any>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);

  // Geo-Spatial Analytics state
  const [spatialData, setSpatialData] = useState<any>(null);
  const [loadingSpatial, setLoadingSpatial] = useState(false);

  // Tabs: 'abstract' | 'chat' | 'schedule' | 'review' | 'effective' | 'cam_audit' | 'esg' | 'negotiation' | 'sublease' | 'accounting' | 'strategy' | 'spatial'
  const [activeTab, setActiveTab] = useState<'abstract' | 'chat' | 'schedule' | 'review' | 'effective' | 'cam_audit' | 'esg' | 'negotiation' | 'sublease' | 'accounting' | 'strategy' | 'spatial'>('abstract');
  
  // Portfolio Cross-Query Copilot state
  const [crossQueryData, setCrossQueryData] = useState<any>(null);
  const [loadingCrossQuery, setLoadingCrossQuery] = useState(false);

  // Chat state
  const [chatQuery, setChatQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'assistant', text: 'Welcome to LeaseLogic. Ask me any compliance question across your portfolio (e.g., "Which of my leases have a break clause in 2029?")' }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Edit State
  const [editingTerm, setEditingTerm] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Automation logs
  const [automationRunning, setAutomationRunning] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);
  const [automationSuccess, setAutomationSuccess] = useState<string | null>(null);

  const API_BASE = 'http://localhost:5000/api';

  // Fetch Leases (with optional property filter)
  const fetchLeases = async (propertyFilter?: string) => {
    try {
      const targetFilter = propertyFilter !== undefined ? propertyFilter : selectedPropertyFilter;
      let url = `${API_BASE}/leases`;
      if (targetFilter && targetFilter !== 'all') {
        url += `?property_name=${encodeURIComponent(targetFilter)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeases(data);
        
        // Update selectedLease progress if it is currently processing
        if (selectedLease) {
          const updatedSelected = data.find((l: Lease) => l.id === selectedLease.id);
          if (updatedSelected && updatedSelected.status !== selectedLease.status) {
            setSelectedLease(updatedSelected);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching leases:', err);
    }
  };

  // Update lease property tag
  const handleUpdateProperty = async (propertyName: string) => {
    if (!selectedLease) return;
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/property`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_name: propertyName })
      });
      if (res.ok) {
        const updated = await res.json();
        // Update local selectedLease state
        setSelectedLease(prev => prev ? { ...prev, property_name: updated.property_name } : null);
        // Refresh leases list
        fetchLeases();
        // Refresh audit logs
        fetchLeaseAuditLogs(selectedLease.id);
      }
    } catch (err) {
      console.error('Error updating lease property tag:', err);
    }
  };

  // Fetch Portfolio-Wide Anomaly Audit
  const fetchPortfolioAnomalies = async () => {
    setLoadingAnomalies(true);
    try {
      const res = await fetch(`${API_BASE}/portfolio/audit-anomalies`);
      if (res.ok) {
        const data = await res.json();
        setPortfolioAnomaliesData(data);
      }
    } catch (err) {
      console.error('Error fetching portfolio anomalies:', err);
    } finally {
      setLoadingAnomalies(false);
    }
  };

  // Run Portfolio Rent Roll Stress Test
  const handleRunStressTest = async () => {
    setLoadingStressTest(true);
    try {
      const res = await fetch(`${API_BASE}/portfolio/stress-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stressTestParams)
      });
      if (res.ok) {
        const data = await res.json();
        setStressTestData(data);
      }
    } catch (err) {
      console.error('Error running portfolio stress-test:', err);
    } finally {
      setLoadingStressTest(false);
    }
  };

  // Fetch Tenant Concentration Analysis
  const fetchTenantConcentration = async () => {
    setLoadingConcentration(true);
    try {
      const res = await fetch(`${API_BASE}/portfolio/tenant-concentration`);
      if (res.ok) {
        const data = await res.json();
        setTenantConcentrationData(data);
      }
    } catch (err) {
      console.error('Error fetching tenant concentration:', err);
    } finally {
      setLoadingConcentration(false);
    }
  };

  // Run CAM Reconciliation Audit
  const handleRunCamAudit = async () => {
    if (!selectedLease) return;
    setLoadingCamAudit(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/cam-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(camInputs)
      });
      if (res.ok) {
        const data = await res.json();
        setCamAuditData(data);
      }
    } catch (err) {
      console.error('Error running CAM audit:', err);
    } finally {
      setLoadingCamAudit(false);
    }
  };

  // Run FX Currency & CPI Inflation Adjuster
  const handleRunFxCpiAdjustment = async () => {
    if (!selectedLease) return;
    setLoadingFxCpi(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/fx-cpi-adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_currency: targetCurrency, cpi_annual_rate: cpiAnnualRate })
      });
      if (res.ok) {
        const data = await res.json();
        setFxCpiData(data);
      }
    } catch (err) {
      console.error('Error running FX CPI adjustment:', err);
    } finally {
      setLoadingFxCpi(false);
    }
  };

  // Fetch ESG & Green Lease Environmental Audit
  const handleFetchEsgAudit = async () => {
    if (!selectedLease) return;
    setLoadingEsgAudit(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/esg-audit`);
      if (res.ok) {
        const data = await res.json();
        setEsgAuditData(data);
      }
    } catch (err) {
      console.error('Error fetching ESG audit:', err);
    } finally {
      setLoadingEsgAudit(false);
    }
  };

  // Generate AI Lease Negotiation Counter-Offers
  const handleGenerateCounterOffer = async () => {
    if (!selectedLease) return;
    setLoadingNegotiation(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/generate-counter-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_risk_level: 'moderate' })
      });
      if (res.ok) {
        const data = await res.json();
        setNegotiationData(data);
      }
    } catch (err) {
      console.error('Error generating counter offer:', err);
    } finally {
      setLoadingNegotiation(false);
    }
  };

  // Run Sublease Rights & Space Monetization Analysis
  const handleRunSubleaseAnalysis = async () => {
    if (!selectedLease) return;
    setLoadingSublease(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/sublease-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subleaseInputs)
      });
      if (res.ok) {
        const data = await res.json();
        setSubleaseData(data);
      }
    } catch (err) {
      console.error('Error running sublease analysis:', err);
    } finally {
      setLoadingSublease(false);
    }
  };

  // Run IFRS 16 / ASC 842 Lease Accounting Calculator
  const handleRunLeaseAccounting = async () => {
    if (!selectedLease) return;
    setLoadingAccounting(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/lease-accounting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountingParams)
      });
      if (res.ok) {
        const data = await res.json();
        setAccountingData(data);
      }
    } catch (err) {
      console.error('Error running lease accounting:', err);
    } finally {
      setLoadingAccounting(false);
    }
  };

  // Run AI Lease Renewal vs Relocation Strategy Decision Matrix
  const handleRunRenewalStrategy = async () => {
    if (!selectedLease) return;
    setLoadingStrategy(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/renewal-strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyParams)
      });
      if (res.ok) {
        const data = await res.json();
        setStrategyData(data);
      }
    } catch (err) {
      console.error('Error running renewal strategy:', err);
    } finally {
      setLoadingStrategy(false);
    }
  };

  // Fetch Geo-Spatial Micro-Market Analytics
  const handleFetchSpatialAnalytics = async () => {
    if (!selectedLease) return;
    setLoadingSpatial(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/spatial-analytics`);
      if (res.ok) {
        const data = await res.json();
        setSpatialData(data);
      }
    } catch (err) {
      console.error('Error fetching spatial analytics:', err);
    } finally {
      setLoadingSpatial(false);
    }
  };

  // Multi-Lease Portfolio Cross-Query Copilot
  const handleRunCrossQuery = async (queryText: string) => {
    setLoadingCrossQuery(true);
    try {
      const res = await fetch(`${API_BASE}/portfolio/cross-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });
      if (res.ok) {
        const data = await res.json();
        setCrossQueryData(data);
      }
    } catch (err) {
      console.error('Error running cross query:', err);
    } finally {
      setLoadingCrossQuery(false);
    }
  };

  // Run AI Lease Comparison
  const handleRunComparison = async (id1: string = compareLeaseId1, id2: string = compareLeaseId2) => {
    if (!id1 || !id2) return;
    setLoadingComparison(true);
    try {
      const res = await fetch(`${API_BASE}/leases/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lease_id_1: id1, lease_id_2: id2 })
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      }
    } catch (err) {
      console.error('Error running lease comparison:', err);
    } finally {
      setLoadingComparison(false);
    }
  };

  // Fetch Multi-Tenant Stacking Plan & Rent Roll
  const fetchStackingPlan = async (propertyFilter: string = 'all') => {
    setLoadingStackingPlan(true);
    try {
      const res = await fetch(`${API_BASE}/properties/${encodeURIComponent(propertyFilter)}/stacking-plan`);
      if (res.ok) {
        const data = await res.json();
        setStackingPlanData(data);
      }
    } catch (err) {
      console.error('Error fetching stacking plan:', err);
    } finally {
      setLoadingStackingPlan(false);
    }
  };

  // Fetch Portfolio Risk Matrix
  const fetchRiskMatrix = async () => {
    setLoadingRiskMatrix(true);
    try {
      const res = await fetch(`${API_BASE}/portfolio/risk-matrix`);
      if (res.ok) {
        const data = await res.json();
        setRiskMatrixData(data);
      }
    } catch (err) {
      console.error('Error fetching portfolio risk matrix:', err);
    } finally {
      setLoadingRiskMatrix(false);
    }
  };

  // Fetch Observability Stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/observability/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching observability stats:', err);
    }
  };

  // Fetch Compliance Rules
  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/compliance/rules`);
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Error fetching compliance rules:', err);
    }
  };

  // Create or Update compliance rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.rule_name || !newRule.value_limit || !newRule.message_template) {
      alert('Please fill out all rule fields.');
      return;
    }
    try {
      const url = editingRuleId 
        ? `${API_BASE}/compliance/rules/${editingRuleId}`
        : `${API_BASE}/compliance/rules`;
      const method = editingRuleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });

      if (res.ok) {
        // Reset rule input form
        setNewRule({
          rule_name: '',
          term_name: 'indemnity_covenants',
          operator: 'min_value',
          value_limit: '',
          severity: 'fail',
          message_template: 'Insurance coverage limit ({actual}) is below the required minimum of $5,000,000.'
        });
        setEditingRuleId(null);
        fetchRules();
        fetchCompliance(); // trigger immediate portfolio audit update
      } else {
        const errData = await res.json();
        alert(`Error saving rule: ${errData.error}`);
      }
    } catch (err) {
      console.error('Error saving compliance rule:', err);
    }
  };

  // Delete compliance rule
  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this compliance rule?')) return;
    try {
      const res = await fetch(`${API_BASE}/compliance/rules/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchRules();
        fetchCompliance(); // trigger immediate audit update
      } else {
        alert('Failed to delete compliance rule.');
      }
    } catch (err) {
      console.error('Error deleting compliance rule:', err);
    }
  };

  // Populate form for editing
  const handleEditRuleClick = (rule: any) => {
    setEditingRuleId(rule.id);
    setNewRule({
      rule_name: rule.rule_name,
      term_name: rule.term_name,
      operator: rule.operator,
      value_limit: rule.value_limit,
      severity: rule.severity,
      message_template: rule.message_template
    });
  };

  // Cancel editing mode
  const handleCancelEditRule = () => {
    setEditingRuleId(null);
    setNewRule({
      rule_name: '',
      term_name: 'indemnity_covenants',
      operator: 'min_value',
      value_limit: '',
      severity: 'fail',
      message_template: ''
    });
  };

  // Helper to pre-populate message template based on selected operator
  const handleOperatorChange = (op: string) => {
    let template = '';
    if (op === 'min_value') {
      template = 'Value ({actual}) is below the required minimum limit of {limit}.';
    } else if (op === 'min_year') {
      template = 'Lease expires in {actual}, which violates the requirement to remain active until at least {limit}.';
    } else if (op === 'not_contains') {
      template = 'Non-compliant term content: Disallowed phrase found: "{keyword}".';
    } else if (op === 'tenant_structural_repair') {
      template = 'High Risk: Tenant is assigned responsibility for structural repairs: {actual}.';
    }
    setNewRule(prev => ({ ...prev, operator: op, message_template: template }));
  };

  // Compare Term across portfolio
  const handleCompareTerm = async (termName: string) => {
    setComparingTermName(termName);
    setIsComparing(true);
    setCompareData([]);
    try {
      const res = await fetch(`${API_BASE}/leases/compare/terms/${termName}`);
      if (res.ok) {
        const data = await res.json();
        setCompareData(data);
      }
    } catch (err) {
      console.error('Error fetching comparison data:', err);
    }
  };

  // Fetch Compliance Audit Report
  const fetchCompliance = async () => {
    try {
      const res = await fetch(`${API_BASE}/compliance/audit`);
      if (res.ok) {
        const data = await res.json();
        setComplianceReport(data);
      }
    } catch (err) {
      console.error('Error fetching compliance audit:', err);
    }
  };

  // Fetch Rent Projection
  const fetchRentProjection = async (leaseId: string) => {
    setLoadingProjection(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${leaseId}/rent-projection`);
      if (res.ok) {
        const data = await res.json();
        setRentProjection(data);
      }
    } catch (err) {
      console.error('Error fetching rent projection:', err);
    } finally {
      setLoadingProjection(false);
    }
  };

  // Export terms sheet across all portfolio leases to CSV
  const handleExportCSV = () => {
    window.open(`${API_BASE}/portfolio/export/csv`, '_blank');
  };

  // Generate and print/download styled PDF Portfolio Compliance Report
  const handlePrintPDFReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please enable pop-ups to download the PDF report.');
      return;
    }

    const printDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const activeRulesCount = rules.length || 4;
    const totalChecksEvaluated = complianceReport.length;
    const passedChecks = complianceReport.filter(r => r.status === 'pass').length;
    const criticalFailures = complianceReport.filter(r => r.status === 'fail').length;
    const warningsCount = complianceReport.filter(r => r.status === 'warn').length;
    const complianceRate = totalChecksEvaluated > 0 
      ? ((passedChecks / totalChecksEvaluated) * 100).toFixed(1)
      : '100.0';

    // Build the lease details table rows
    const leaseTableRows = leases.map(lease => {
      const leaseViolations = complianceReport.filter(r => r.lease_id === lease.id);
      const leaseFailed = leaseViolations.filter(r => r.status === 'fail').length;
      const leaseWarned = leaseViolations.filter(r => r.status === 'warn').length;
      const score = `${activeRulesCount - leaseFailed - leaseWarned} / ${activeRulesCount}`;
      const statusText = leaseFailed > 0 ? 'Critical' : leaseWarned > 0 ? 'Warning' : 'Passing';
      const statusClass = leaseFailed > 0 ? 'failed' : leaseWarned > 0 ? 'warning' : 'completed';

      return `
        <tr>
          <td><strong>${lease.filename}</strong></td>
          <td>${(lease.file_size / 1024).toFixed(1)} KB</td>
          <td>${score}</td>
          <td>
            <span class="badge badge-${statusClass}">${statusText}</span>
          </td>
          <td>${lease.job_status || 'completed'}</td>
        </tr>
      `;
    }).join('');

    // Build the active violations table rows
    const violationsTableRows = complianceReport
      .filter(item => item.status === 'fail' || item.status === 'warn')
      .map(item => {
        const badgeClass = item.status === 'fail' ? 'failed' : 'warning';
        const badgeText = item.status === 'fail' ? 'Critical Failure' : 'Warning';
        return `
          <tr>
            <td><strong>${item.filename}</strong></td>
            <td>${item.rule_name}</td>
            <td class="mono">${item.term_value}</td>
            <td>
              <span class="badge badge-${badgeClass}">${badgeText}</span>
            </td>
            <td>${item.message}</td>
          </tr>
        `;
      }).join('');

    // Build the rules catalog rows
    const rulesTableRows = rules.map(rule => {
      return `
        <tr>
          <td><strong>${rule.rule_name}</strong></td>
          <td class="mono">${rule.term_name}</td>
          <td class="mono">${rule.operator}</td>
          <td>${rule.value_limit}</td>
          <td>
            <span class="badge badge-${rule.severity === 'fail' ? 'failed' : 'warning'}">${rule.severity}</span>
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LeaseLogic Compliance & Risk Report</title>
          <style>
            :root {
              --primary: #8b5cf6;
              --primary-light: #f5f3ff;
              --foreground: #1f2937;
              --text-muted: #6b7280;
              --border: #e5e7eb;
              --success: #10b981;
              --warning: #f59e0b;
              --error: #ef4444;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: var(--foreground);
              line-height: 1.5;
              padding: 0;
              margin: 0;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
            }
            .header-bar {
              border-bottom: 2px solid var(--primary);
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: var(--foreground);
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .logo span {
              color: var(--primary);
            }
            .report-title {
              font-size: 18px;
              font-weight: 700;
              color: var(--text-muted);
              margin: 0 0 5px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .report-meta {
              font-size: 0.85rem;
              color: var(--text-muted);
              text-align: right;
            }
            h1 {
              font-size: 28px;
              font-weight: 800;
              margin: 0;
              color: var(--foreground);
            }
            h2 {
              font-size: 18px;
              font-weight: 700;
              color: var(--foreground);
              border-bottom: 1px solid var(--border);
              padding-bottom: 8px;
              margin: 35px 0 15px 0;
              page-break-after: avoid;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .stat-card {
              border: 1px solid var(--border);
              padding: 15px;
              border-radius: 8px;
              background: #fafafa;
            }
            .stat-label {
              font-size: 0.72rem;
              color: var(--text-muted);
              text-transform: uppercase;
              font-weight: 700;
              margin-bottom: 5px;
            }
            .stat-value {
              font-size: 22px;
              font-weight: 800;
              color: var(--foreground);
            }
            .stat-value.primary {
              color: var(--primary);
            }
            .stat-value.error {
              color: var(--error);
            }
            .stat-value.warning {
              color: var(--warning);
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
              font-size: 0.85rem;
            }
            th {
              background: var(--primary-light);
              color: var(--foreground);
              font-weight: 700;
              text-align: left;
              padding: 10px 12px;
              border-bottom: 2px solid var(--border);
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid var(--border);
              vertical-align: top;
            }
            tr:nth-child(even) {
              background: #fafafa;
            }
            .badge {
              display: inline-block;
              padding: 3px 8px;
              font-size: 0.7rem;
              font-weight: 700;
              border-radius: 4px;
              text-transform: uppercase;
            }
            .badge-completed {
              background: #d1fae5;
              color: #065f46;
            }
            .badge-warning {
              background: #fef3c7;
              color: #92400e;
            }
            .badge-failed {
              background: #fee2e2;
              color: #991b1b;
            }
            .mono {
              font-family: monospace;
              font-size: 0.8rem;
            }
            .action-plan {
              background: #f9fafb;
              border-left: 4px solid var(--primary);
              padding: 20px;
              border-radius: 0 8px 8px 0;
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .action-plan h3 {
              margin-top: 0;
              color: var(--primary);
              font-size: 16px;
            }
            .action-plan ul {
              margin: 0;
              padding-left: 20px;
              font-size: 0.85rem;
              color: var(--foreground);
            }
            .action-plan li {
              margin-bottom: 8px;
            }
            @media print {
              .no-print {
                display: none;
              }
              body {
                padding: 10px;
              }
              @page {
                size: A4 portrait;
                margin: 15mm 15mm 20mm 15mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <div class="logo">Lease<span>Logic</span></div>
              <h1>Portfolio Audit Report</h1>
            </div>
            <div class="report-meta">
              <div class="report-title">Executive Risk Brief</div>
              <div>Generated: ${printDate}</div>
              <div>Database Scope: Active pgvector Portfolio</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Compliance Rating</div>
              <div class="stat-value primary">${complianceRate}%</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Critical Failures</div>
              <div class="stat-value error">${criticalFailures}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Compliance Warnings</div>
              <div class="stat-value warning">${warningsCount}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Active Leases</div>
              <div class="stat-value">${leases.length}</div>
            </div>
          </div>

          <div class="action-plan">
            <h3>Strategic Recommendations & Action Items</h3>
            <ul>
              ${criticalFailures > 0 
                ? `<li><strong>Resolve Structural repair issues:</strong> Review the lease clauses where structural repairs have been assigned to the Tenant immediately to renegotiate terms or establish internal capital reserves.</li>` 
                : '<li><strong>Structural repairs check passed:</strong> All active leases successfully keep structural maintenance under Landlord responsibility.</li>'}
              ${criticalFailures > 0 
                ? `<li><strong>Review low public liability caps:</strong> Multiple leases flag insurance coverage below the corporate requirement of $5,000,000. Initiate discussions to increase caps.</li>` 
                : '<li><strong>Insurance cap validation passed:</strong> All leases satisfy minimum corporate liability insurance standards.</li>'}
              ${warningsCount > 0 
                ? `<li><strong>Tenant Break Clauses:</strong> Identify and flag options for leases currently missing termination rights. Plan around fixed timelines for Regent Street and Oxford Street.</li>` 
                : ''}
              <li><strong>Database synchronization:</strong> Human modifications have been logged and synced back to primary PostgreSQL storage.</li>
            </ul>
          </div>

          <h2>1. Leases Audited</h2>
          <table>
            <thead>
              <tr>
                <th>Lease Filename</th>
                <th>File Size</th>
                <th>Passed Checks</th>
                <th>Risk Category</th>
                <th>Pipeline Status</th>
              </tr>
            </thead>
            <tbody>
              ${leaseTableRows || '<tr><td colspan="5" style="text-align:center;">No audited leases found.</td></tr>'}
            </tbody>
          </table>

          <h2 style="page-break-before: always;">2. Compliance Violations & Warnings</h2>
          <table>
            <thead>
              <tr>
                <th>Lease Filename</th>
                <th>Rule Name</th>
                <th>Extracted Value</th>
                <th>Severity</th>
                <th>Auditor Findings & Message</th>
              </tr>
            </thead>
            <tbody>
              ${violationsTableRows || '<tr><td colspan="5" style="text-align:center;color:var(--success);font-weight:bold;padding:20px;">\u2705 100% Compliant: No active compliance risk violations detected.</td></tr>'}
            </tbody>
          </table>

          <h2>3. Compliance Catalog & System Rules</h2>
          <table>
            <thead>
              <tr>
                <th>Rule Name</th>
                <th>Term Field</th>
                <th>Operator</th>
                <th>Constraint Limit</th>
                <th>Alert Severity</th>
              </tr>
            </thead>
            <tbody>
              ${rulesTableRows || '<tr><td colspan="5" style="text-align:center;">No active compliance rules in catalog.</td></tr>'}
            </tbody>
          </table>

          <div class="no-print" style="margin-top: 40px; display: flex; justify-content: center;">
            <button onclick="window.print()" style="background:#8b5cf6; color:white; border:none; padding:12px 24px; border-radius:6px; font-weight:700; cursor:pointer; font-size:0.95rem; box-shadow:0 4px 6px rgba(139,92,246,0.25)">
              Print Report / Save to PDF
            </button>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Toggle clause association with the selected lease term
  const handleToggleGrounding = async (clauseId: string) => {
    if (!selectedLease || !selectedTerm) return;

    const currentIds = selectedTerm.source_clause_ids || [];
    const isLinked = currentIds.includes(clauseId);
    
    let newIds: string[];
    if (isLinked) {
      newIds = currentIds.filter((id: string) => id !== clauseId);
    } else {
      newIds = [...currentIds, clauseId];
    }

    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/terms/${selectedTerm.id}/grounding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_clause_ids: newIds }),
      });
      if (res.ok) {
        const updatedTerm = await res.json();
        setSelectedTerm(updatedTerm);
        setTerms(terms.map(t => t.id === selectedTerm.id ? updatedTerm : t));
        fetchCompliance();
      }
    } catch (err) {
      console.error('Error toggling grounding mapping:', err);
    }
  };

  // Fetch Portfolio Timeline events
  const fetchTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const res = await fetch(`${API_BASE}/portfolio/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Fetch alerts configured for selected lease
  const fetchAlerts = async (leaseId: string) => {
    setLoadingAlerts(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${leaseId}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setLeaseAlerts(data);
      }
    } catch (err) {
      console.error('Error fetching lease alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  // Create new alert for selected lease
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLease) return;

    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertForm),
      });
      if (res.ok) {
        fetchAlerts(selectedLease.id);
        setAlertForm({
          ...alertForm,
          alert_date: ''
        });
        fetchTimeline(); // refresh timeline as alerts might map to it
      }
    } catch (err) {
      console.error('Error creating lease alert:', err);
    }
  };

  // Delete alert
  const handleDeleteAlert = async (alertId: string) => {
    if (!selectedLease) return;

    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/alerts/${alertId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAlerts(selectedLease.id);
        fetchTimeline();
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
    }
  };

  // Fetch benchmark runs
  const fetchBenchmarks = async (leaseId: string) => {
    setLoadingBenchmarks(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${leaseId}/benchmarks`);
      if (res.ok) {
        const data = await res.json();
        setBenchmarkRuns(data);
      }
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
    } finally {
      setLoadingBenchmarks(false);
    }
  };

  // Run benchmark comparison side-by-side
  const handleRunBenchmark = async () => {
    if (!selectedLease || selectedModels.length === 0) return;
    setRunningBenchmark(true);

    try {
      for (const model of selectedModels) {
        const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/benchmarks/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt_template: benchmarkPrompt,
            term_name: benchmarkTerm
          })
        });
        if (!res.ok) {
          console.error(`Failed to run benchmark for ${model}`);
        }
      }
      fetchBenchmarks(selectedLease.id);
    } catch (err) {
      console.error('Error running benchmarks:', err);
    } finally {
      setRunningBenchmark(false);
    }
  };

  // Fetch reviewer comments for a term
  const fetchTermComments = async (leaseId: string, termName: string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${leaseId}/terms/${termName}/comments`);
      if (res.ok) {
        const data = await res.json();
        setTermComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Add a new reviewer comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLease || !selectedTerm || !newCommentText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/terms/${selectedTerm.term_name}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_name: reviewerName,
          comment_text: newCommentText
        }),
      });
      if (res.ok) {
        setNewCommentText('');
        fetchTermComments(selectedLease.id, selectedTerm.term_name);
        fetchLeaseAuditLogs(selectedLease.id); // refresh audit trail to show new comment action
      }
    } catch (err) {
      console.error('Error adding reviewer comment:', err);
    }
  };

  // Fetch full audit logs trail for a lease
  const fetchLeaseAuditLogs = async (leaseId: string) => {
    setLoadingAuditLogs(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${leaseId}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setLeaseAuditLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  // Fetch all proposed redlines for a lease
  const fetchLeaseRedlines = async (leaseId: string) => {
    try {
      const res = await fetch(`${API_BASE}/leases/${leaseId}/redlines`);
      if (res.ok) {
        const data = await res.json();
        setLeaseRedlines(data);
      }
    } catch (err) {
      console.error('Error fetching proposed redlines:', err);
    }
  };

  // Propose a new or updated redline for a clause
  const handleSaveRedline = async (clauseId: string, originalText: string) => {
    if (!selectedLease || !redlineTextValue.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/clauses/${clauseId}/redlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redline_text: redlineTextValue,
          original_text: originalText,
          author_name: redlineAuthorName
        })
      });
      if (res.ok) {
        setEditingClauseId(null);
        setRedlineTextValue('');
        fetchLeaseRedlines(selectedLease.id);
        fetchLeaseAuditLogs(selectedLease.id);
      }
    } catch (err) {
      console.error('Error proposing redline:', err);
    }
  };

  // Delete a proposed redline
  const handleDeleteRedline = async (redlineId: string) => {
    if (!selectedLease) return;
    try {
      const res = await fetch(`${API_BASE}/redlines/${redlineId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchLeaseRedlines(selectedLease.id);
        fetchLeaseAuditLogs(selectedLease.id);
      }
    } catch (err) {
      console.error('Error deleting proposed redline:', err);
    }
  };

  // Word-level LCS Diffing Algorithm
  const diffWords = (orig: string, prop: string) => {
    const words1 = orig.trim().split(/\s+/).filter(Boolean);
    const words2 = prop.trim().split(/\s+/).filter(Boolean);

    const n = words1.length;
    const m = words2.length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (words1[i - 1] === words2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let i = n, j = m;
    const result: { type: 'added' | 'removed' | 'normal'; text: string }[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
        result.unshift({ type: 'normal', text: words1[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: 'added', text: words2[j - 1] });
        j--;
      } else {
        result.unshift({ type: 'removed', text: words1[i - 1] });
        i--;
      }
    }

    const grouped: { type: 'added' | 'removed' | 'normal'; text: string }[] = [];
    for (const item of result) {
      const last = grouped[grouped.length - 1];
      if (last && last.type === item.type) {
        last.text += ' ' + item.text;
      } else {
        grouped.push({ ...item });
      }
    }
    return grouped;
  };

  // Fetch Net Effective Terms for a lease hierarchy
  const fetchEffectiveTerms = async (leaseId: string) => {
    setLoadingEffectiveTerms(true);
    try {
      const res = await fetch(`${API_BASE}/leases/${leaseId}/effective-terms`);
      if (res.ok) {
        const data = await res.json();
        setEffectiveTermsData(data);
      }
    } catch (err) {
      console.error('Error fetching effective terms:', err);
    } finally {
      setLoadingEffectiveTerms(false);
    }
  };

  // Update lease parent-child relationship
  const handleUpdateRelationship = async (parentLeaseId: string | null, docType: string) => {
    if (!selectedLease) return;
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease.id}/relationship`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_lease_id: parentLeaseId,
          document_type: docType
        })
      });
      if (res.ok) {
        const updated = await res.json();
        // Refresh leases list
        fetchLeases();
        // Update selectedLease local state
        setSelectedLease(prev => prev ? { ...prev, parent_lease_id: updated.parent_lease_id, document_type: updated.document_type } : null);
        // Refresh audit logs
        fetchLeaseAuditLogs(selectedLease.id);
        // Refresh effective terms
        fetchEffectiveTerms(selectedLease.id);
      }
    } catch (err) {
      console.error('Error updating lease relationship:', err);
    }
  };

  // Select lease, load terms, find term, open Document Explorer and highlight
  const handleViewViolation = async (leaseId: string, ruleId: string, termNameArg?: string) => {
    const targetLease = leases.find(l => l.id === leaseId);
    if (!targetLease) return;
    
    let termName = termNameArg;
    if (!termName) {
      if (ruleId === 'min_insurance') termName = 'indemnity_covenants';
      else if (ruleId === 'expiry_check') termName = 'expiration_date';
      else if (ruleId === 'break_clause') termName = 'break_clause';
      else if (ruleId === 'repair_responsibility') termName = 'repair_obligations';
    }

    setCurrentView('workspace');
    await handleSelectLease(targetLease);
    
    try {
      const termsRes = await fetch(`${API_BASE}/leases/${leaseId}/abstract`);
      if (termsRes.ok) {
        const termsData = await termsRes.json();
        setTerms(termsData);
        const targetTerm = termsData.find((t: any) => t.term_name === termName);
        if (targetTerm) {
          setSelectedTerm(targetTerm);
          setActiveTab('abstract');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeases(selectedPropertyFilter);
    const interval = setInterval(() => fetchLeases(selectedPropertyFilter), 3000);
    return () => clearInterval(interval);
  }, [selectedLease, selectedPropertyFilter]);

  useEffect(() => {
    fetchStats();
    fetchCompliance();
    fetchRules();
    fetchTimeline();
    fetchRiskMatrix();
    fetchStackingPlan(selectedPropertyFilter);
    const interval = setInterval(() => {
      fetchStats();
      fetchCompliance();
      fetchRiskMatrix();
      fetchStackingPlan(selectedPropertyFilter);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedPropertyFilter]);

  // Load lease details
  const handleSelectLease = async (lease: Lease) => {
    setSelectedLease(lease);
    setSelectedTerm(null);
    setAutomationSuccess(null);
    setAutomationLogs([]);
    setTerms([]);
    setClauses([]);
    setCurrentView('workspace');
    setRentProjection(null);
    setLeaseAlerts([]);
    setBenchmarkRuns([]);
    setTermComments([]);
    setLeaseAuditLogs([]);
    setLeaseRedlines([]);
    setEditingClauseId(null);
    setEffectiveTermsData(null);
    
    if (lease.status === 'completed') {
      try {
        // Fetch terms
        const termsRes = await fetch(`${API_BASE}/leases/${lease.id}/abstract`);
        if (termsRes.ok) {
          const termsData = await termsRes.json();
          setTerms(termsData);
        }
        
        // Fetch clauses
        const clausesRes = await fetch(`${API_BASE}/leases/${lease.id}/clauses`);
        if (clausesRes.ok) {
          const clausesData = await clausesRes.json();
          setClauses(clausesData);
        }

        // Fetch rent projection
        fetchRentProjection(lease.id);

        // Fetch alerts
        fetchAlerts(lease.id);

        // Fetch benchmarks
        fetchBenchmarks(lease.id);

        // Fetch audit logs
        fetchLeaseAuditLogs(lease.id);

        // Fetch proposed redlines
        fetchLeaseRedlines(lease.id);

        // Fetch net effective terms
        fetchEffectiveTerms(lease.id);
      } catch (err) {
        console.error('Error loading lease details:', err);
      }
    }
  };

  // Fetch comments automatically when selected term updates
  useEffect(() => {
    if (selectedLease && selectedTerm) {
      fetchTermComments(selectedLease.id, selectedTerm.term_name);
    } else {
      setTermComments([]);
    }
  }, [selectedTerm, selectedLease]);

  // Upload Lease
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_BASE}/leases/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        fetchLeases();
        handleSelectLease(data.lease);
      } else {
        alert('Upload failed.');
      }
    } catch (err) {
      console.error('Error uploading lease:', err);
    }
  };

  // Edit Term value
  const startEdit = (term: LeaseTerm) => {
    setEditingTerm(term.id);
    setEditValue(term.extracted_value.split(' (Citation:')[0]);
  };

  const saveEdit = async (term: LeaseTerm) => {
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease?.id}/terms/${term.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted_value: editValue,
          reviewer_status: 'approved',
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTerms(terms.map(t => t.id === term.id ? updated : t));
        setEditingTerm(null);
        if (selectedLease) {
          fetchRentProjection(selectedLease.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle approval checkbox
  const toggleApprove = async (term: LeaseTerm) => {
    const nextStatus = term.reviewer_status === 'approved' ? 'unreviewed' : 'approved';
    try {
      const res = await fetch(`${API_BASE}/leases/${selectedLease?.id}/terms/${term.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted_value: term.extracted_value,
          reviewer_status: nextStatus,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTerms(terms.map(t => t.id === term.id ? updated : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Land Registry Playwright Automation
  const triggerRegistryAutomation = async () => {
    if (!selectedLease) return;
    setAutomationRunning(true);
    setAutomationSuccess(null);
    setAutomationLogs([
      '🚀 Initiating Playwright land registry worker...',
      `📂 Retrieving extracted data parameters for Lease ID: ${selectedLease.id}`,
      '🖥️ Launching Chromium Headless browser instance...',
      '🌐 Navigating to Official Land Registry Abstract Form (http://localhost:5000/mock-registry)...'
    ]);

    // Simulate real-time console log prints for UI look-and-feel
    setTimeout(() => {
      setAutomationLogs(prev => [...prev, '📝 Injecting Tenant, Landlord, and Commencement parameters...']);
    }, 2000);

    setTimeout(() => {
      setAutomationLogs(prev => [...prev, '📝 Filling rent and escalation schedules...']);
    }, 3500);

    setTimeout(() => {
      setAutomationLogs(prev => [...prev, '🖱️ Clicking Submission Form Button...']);
    }, 5000);

    try {
      const res = await fetch(`${API_BASE}/automation/registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseId: selectedLease.id }),
      });
      
      const data = await res.json();
      if (data.success) {
        setAutomationLogs(prev => [
          ...prev, 
          '✅ Forms filled successfully!',
          `🎉 Official Message: ${data.details}`
        ]);
        setAutomationSuccess(data.details);
      } else {
        setAutomationLogs(prev => [...prev, `❌ Error: ${data.message}`]);
      }
    } catch (err: any) {
      setAutomationLogs(prev => [...prev, `❌ Automation error: ${err.message}`]);
    } finally {
      setAutomationRunning(false);
    }
  };

  // Streaming RAG Chat
  const sendChatMessage = async (queryText?: string) => {
    const q = queryText || chatQuery;
    if (!q.trim()) return;

    setChatQuery('');
    setChatMessages(prev => [...prev, { sender: 'user', text: q }]);
    setIsStreaming(true);

    const activeLeaseId = selectedLease ? selectedLease.id : 'all';
    const sseUrl = `${API_BASE}/chat/stream?q=${encodeURIComponent(q)}&leaseId=${activeLeaseId}`;
    
    let assistantMsg = '';
    setChatMessages(prev => [...prev, { sender: 'assistant', text: '' }]);

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        setIsStreaming(false);
        // Speak the answer if TTS is enabled or we can speak it back!
        speakBack(assistantMsg);
      } else {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.text) {
            assistantMsg += parsed.text;
            setChatMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { sender: 'assistant', text: assistantMsg };
              return updated;
            });
          } else if (parsed.error) {
            assistantMsg = `Error: ${parsed.error}`;
            setChatMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { sender: 'assistant', text: assistantMsg };
              return updated;
            });
            eventSource.close();
            setIsStreaming(false);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
      setIsStreaming(false);
    };
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Speech Recognition (Voice Input)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        // If speaking, stop synthesis first (barge-in)
        window.speechSynthesis.cancel();
        setSpeechActive(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        sendChatMessage(transcript);
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Text to Speech
  const speakBack = (text: string) => {
    // Strip markdown citations like [Source 1] for clean voice output
    const cleanText = text.replace(/\[Source \d+\]/g, '').replace(/[\*#_]/g, '');
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onstart = () => setSpeechActive(true);
    utterance.onend = () => setSpeechActive(false);
    utterance.onerror = () => setSpeechActive(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeechActive(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar - Lease List */}
      <div className="sidebar">
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
          <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800 }}>LeaseLogic</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>AI Abstraction & Compliance</p>
        </div>

        {/* View Switcher Toggle */}
        <div style={{ padding: '10px 10px', borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', gap: '4px', background: '#f8fafc' }}>
          <button 
            className={`btn ${currentView === 'workspace' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.62rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('workspace')}
          >
            📂 Work
          </button>
          <button 
            className={`btn ${currentView === 'observability' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.62rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('observability')}
          >
            📊 Costs
          </button>
          <button 
            className={`btn ${currentView === 'compliance' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.62rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('compliance')}
          >
            ⚖️ Rules
          </button>
          <button 
            className={`btn ${currentView === 'timeline' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.65rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('timeline')}
          >
            🔔 Alerts
          </button>
          <button 
            className={`btn ${currentView === 'benchmark' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.65rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('benchmark')}
          >
            🔬 Test
          </button>
          <button 
            className={`btn ${currentView === 'risk' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.65rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('risk')}
          >
            🔥 Risk
          </button>
          <button 
            className={`btn ${currentView === 'stacking' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.65rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('stacking')}
          >
            🏢 Stacking
          </button>
          <button 
            className={`btn ${currentView === 'compare' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.65rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('compare')}
          >
            ⚖️ Diff
          </button>
          <button 
            className={`btn ${currentView === 'anomalies' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.65rem', borderRadius: '6px' }}
            onClick={() => { setCurrentView('anomalies'); fetchPortfolioAnomalies(); }}
          >
            ⚡ Audit
          </button>
          <button 
            className={`btn ${currentView === 'stresstest' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.65rem', borderRadius: '6px' }}
            onClick={() => { setCurrentView('stresstest'); handleRunStressTest(); }}
          >
            📊 Shock
          </button>
          <button 
            className={`btn ${currentView === 'concentration' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 1px', fontSize: '0.65rem', borderRadius: '6px' }}
            onClick={() => { setCurrentView('concentration'); fetchTenantConcentration(); }}
          >
            🏢 Risk
          </button>
        </div>

        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* File Upload zone */}
          <label className="dropzone">
            <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
            <svg style={{ width: '32px', height: '32px', color: 'var(--primary)', marginBottom: '8px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Upload Lease PDF</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Click to browse</p>
          </label>

          {/* Building Asset Filter */}
          <div style={{ marginTop: '12px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              🏢 Building Asset Filter
            </label>
            <select
              className="chat-input"
              style={{ padding: '6px 8px', fontSize: '0.78rem', border: '1px solid rgba(15,23,42,0.1)', borderRadius: '6px', background: '#ffffff', color: 'var(--foreground)' }}
              value={selectedPropertyFilter}
              onChange={(e) => setSelectedPropertyFilter(e.target.value)}
            >
              <option value="all">🏢 All Properties & Assets</option>
              {Array.from(new Set(leases.map(l => l.property_name || 'General Portfolio'))).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Lease Portfolio</h3>
          
          <div className="card-list" style={{ overflowY: 'auto', flex: 1 }}>
            {(() => {
              const parents = leases.filter(l => !l.parent_lease_id || !leases.some(p => p.id === l.parent_lease_id));
              const getChildren = (parentId: string) => leases.filter(l => l.parent_lease_id === parentId);

              const renderLeaseCard = (lease: Lease, isChild: boolean = false) => (
                <div 
                  key={lease.id} 
                  className={`lease-card glass ${selectedLease?.id === lease.id ? 'active' : ''}`}
                  onClick={() => handleSelectLease(lease)}
                  style={{
                    marginLeft: isChild ? '12px' : '0',
                    borderLeft: isChild ? '2px solid rgba(139, 92, 246, 0.3)' : undefined,
                    paddingLeft: isChild ? '10px' : undefined,
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isChild ? '140px' : '180px' }} title={lease.filename}>
                      {isChild ? `↳ ` : ''}{lease.filename}
                    </p>
                    <span className={`badge badge-${lease.status}`} style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                      {lease.status}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                      {(lease.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {lease.document_type && lease.document_type !== 'original_lease' && (
                      <span style={{ fontSize: '0.62rem', background: 'rgba(15, 23, 42, 0.05)', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                        {lease.document_type.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {lease.status === 'pending' && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                        <span>Extracting...</span>
                        <span>{lease.job_progress || 0}%</span>
                      </div>
                      <div className="progress-container" style={{ height: '4px' }}>
                        <div className="progress-bar" style={{ width: `${lease.job_progress || 0}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              );

              return parents.map(parent => {
                const children = getChildren(parent.id);
                return (
                  <div key={parent.id} style={{ marginBottom: '12px' }}>
                    {renderLeaseCard(parent, false)}
                    {children.map(child => renderLeaseCard(child, true))}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div>
            {currentView === 'compliance' ? (
              <h2 style={{ fontSize: '1.25rem' }}>Portfolio Compliance Audit & Risk Engine</h2>
            ) : currentView === 'observability' ? (
              <h2 style={{ fontSize: '1.25rem' }}>Pipeline Observability & Cost Analytics</h2>
            ) : currentView === 'timeline' ? (
              <h2 style={{ fontSize: '1.25rem' }}>Lease Alerts & Timeline Calendar</h2>
            ) : currentView === 'benchmark' ? (
              <h2 style={{ fontSize: '1.25rem' }}>Model Comparison & Prompt Benchmarking</h2>
            ) : selectedLease ? (
              <h2 style={{ fontSize: '1.25rem' }}>{selectedLease.filename}</h2>
            ) : (
              <h2 style={{ fontSize: '1.25rem' }}>Portfolio Overview</h2>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Database indicator */}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', display: 'inline-block' }}></span>
              Postgres + HNSW Active
            </span>
          </div>
        </div>

        {/* Workspace Dashboard vs Observability Dashboard vs Compliance Dashboard */}
        {currentView === 'benchmark' ? (
          <div className="dashboard-grid" style={{ overflow: 'hidden' }}>
            {/* Left Panel: Configuration */}
            <div className="pane pane-border" style={{ flex: 1, overflowY: 'auto' }}>
              {!selectedLease ? (
                <div className="glass" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
                  <span style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🔬</span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Select a Lease to Benchmark</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Select an active lease from the sidebar listing to test extractions across models and prompts.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Configure Benchmarking</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lease: <strong>{selectedLease.filename}</strong></p>
                  </div>

                  <div className="glass" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Extraction Term</label>
                        <select 
                          className="chat-input"
                          style={{ border: '1px solid rgba(15, 23, 42, 0.15)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', background: '#ffffff' }}
                          value={benchmarkTerm}
                          onChange={(e) => setBenchmarkTerm(e.target.value)}
                        >
                          <option value="tenant_name">Tenant Name</option>
                          <option value="landlord_name">Landlord Name</option>
                          <option value="commencement_date">Commencement Date</option>
                          <option value="expiration_date">Expiration Date</option>
                          <option value="initial_rent">Initial Rent</option>
                          <option value="break_clause">Break Clause Options</option>
                          <option value="indemnity_covenants">Indemnity Insurance Covenants</option>
                          <option value="repair_obligations">Repair/Maintenance Obligations</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Models to Compare</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '5px 0' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedModels.includes('claude-3-5-sonnet')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedModels([...selectedModels, 'claude-3-5-sonnet']);
                                } else {
                                  setSelectedModels(selectedModels.filter(m => m !== 'claude-3-5-sonnet'));
                                }
                              }}
                            />
                            Claude 3.5 Sonnet (Premium)
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedModels.includes('gpt-4o-mini')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedModels([...selectedModels, 'gpt-4o-mini']);
                                } else {
                                  setSelectedModels(selectedModels.filter(m => m !== 'gpt-4o-mini'));
                                }
                              }}
                            />
                            GPT-4o Mini (Cost-Efficient)
                          </label>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Prompt Template
                          <span style={{ textTransform: 'none', fontWeight: 'normal', color: 'var(--primary)' }}>Must contain {'{term_name}'}</span>
                        </label>
                        <textarea 
                          className="chat-input"
                          style={{ border: '1px solid rgba(15, 23, 42, 0.15)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.82rem', background: '#ffffff', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
                          value={benchmarkPrompt}
                          onChange={(e) => setBenchmarkPrompt(e.target.value)}
                        />
                      </div>

                      <button 
                        onClick={handleRunBenchmark}
                        disabled={runningBenchmark || selectedModels.length === 0}
                        className="btn"
                        style={{ padding: '10px', fontSize: '0.85rem', width: '100%', marginTop: '5px' }}
                      >
                        {runningBenchmark ? '⚡ Executing Benchmark Test...' : '🚀 Run Benchmark Test'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Side-by-Side Comparison Feed */}
            <div className="pane" style={{ flex: 2, overflowY: 'auto' }}>
              {!selectedLease ? (
                <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
                  Select a lease to view side-by-side benchmarking comparisons.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Extraction Benchmark Runs</h3>
                    <button 
                      onClick={() => fetchBenchmarks(selectedLease.id)} 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      🔄 Refresh
                    </button>
                  </div>

                  {/* Summary Bar Chart */}
                  {benchmarkRuns.length > 0 && (
                    <div className="glass" style={{ padding: '20px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '15px' }}>Performance Analytics (Last Run)</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* Latency Comparison */}
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Latency (Response Time)</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {benchmarkRuns.slice(0, selectedModels.length).map((run, idx) => {
                              const maxTime = Math.max(...benchmarkRuns.slice(0, selectedModels.length).map(r => r.processing_time_ms)) || 1;
                              const widthPct = Math.round((run.processing_time_ms / maxTime) * 100);
                              return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '120px', textTransform: 'capitalize' }}>{run.model.replace(/-/g, ' ')}</span>
                                  <div style={{ flex: 1, background: '#f1f5f9', height: '16px', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ background: run.model.includes('claude') ? 'var(--primary)' : '#10b981', height: '100%', width: `${widthPct}%`, borderRadius: '8px' }} />
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, width: '70px', textAlign: 'right' }}>{run.processing_time_ms} ms</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Cost Comparison */}
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Estimated API Cost ($)</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {benchmarkRuns.slice(0, selectedModels.length).map((run, idx) => {
                              const maxCost = Math.max(...benchmarkRuns.slice(0, selectedModels.length).map(r => parseFloat(r.api_cost))) || 0.0001;
                              const widthPct = Math.round((parseFloat(run.api_cost) / maxCost) * 100);
                              return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '120px', textTransform: 'capitalize' }}>{run.model.replace(/-/g, ' ')}</span>
                                  <div style={{ flex: 1, background: '#f1f5f9', height: '16px', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ background: run.model.includes('claude') ? 'var(--primary)' : '#10b981', height: '100%', width: `${widthPct}%`, borderRadius: '8px' }} />
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, width: '70px', textAlign: 'right' }}>${parseFloat(run.api_cost).toFixed(5)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Run History feed card list */}
                  {loadingBenchmarks ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                      <p style={{ color: 'var(--text-muted)' }}>Retrieving benchmarking runs history...</p>
                    </div>
                  ) : benchmarkRuns.length === 0 ? (
                    <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No benchmark runs found. Configure parameters on the left and run a comparison test!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {benchmarkRuns.map((run) => {
                        let parsedVal = { value: 'N/A', citation: 'N/A' };
                        try {
                          parsedVal = JSON.parse(run.extracted_value);
                        } catch (err) {}

                        // Find similarity overlap score against current database baseline
                        const officialTerm = terms.find(t => t.term_name === run.term_name);
                        const officialVal = officialTerm ? officialTerm.extracted_value.split(' (Citation:')[0] : '';
                        
                        const computeOverlap = (a: string, b: string) => {
                          const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
                          const wA = clean(a);
                          const wB = clean(b);
                          if (wA.length === 0 || wB.length === 0) return 0;
                          const intersection = wA.filter(w => wB.includes(w));
                          return Math.round((intersection.length / Math.max(wA.length, wB.length)) * 100);
                        };
                        const similarity = computeOverlap(parsedVal.value || '', officialVal);

                        const isClaude = run.model.includes('claude');
                        const badgeColor = isClaude ? 'var(--primary)' : '#10b981';

                        return (
                          <div 
                            key={run.id}
                            className="glass"
                            style={{ 
                              padding: '18px', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '12px',
                              borderLeft: `4px solid ${badgeColor}`
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ background: isClaude ? 'rgba(109, 40, 217, 0.08)' : 'rgba(16, 185, 129, 0.08)', color: badgeColor, fontSize: '0.72rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                  {run.model}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  Term: <strong style={{ textTransform: 'capitalize' }}>{run.term_name.replace(/_/g, ' ')}</strong>
                                </span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {new Date(run.created_at).toLocaleString()}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.03)' }}>
                              <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Extracted Value</p>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{parsedVal.value || 'N/A'}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Citation Clause</p>
                                <p style={{ fontSize: '0.82rem', fontFamily: 'monospace', margin: 0, color: 'var(--primary)' }}>{parsedVal.citation || 'N/A'}</p>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.78rem', borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '10px' }}>
                              <div>
                                ⏱️ Latency: <strong>{run.processing_time_ms} ms</strong>
                              </div>
                              <div>
                                🪙 Tokens: <strong>{run.input_tokens} in / {run.output_tokens} out</strong>
                              </div>
                              <div>
                                💸 Est. Cost: <strong style={{ fontFamily: 'monospace' }}>${parseFloat(run.api_cost).toFixed(5)}</strong>
                              </div>
                              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🎯 Overlap Score: 
                                <span style={{ fontWeight: 700, color: similarity >= 80 ? 'var(--success)' : similarity >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                                  {similarity}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'timeline' ? (
          <div className="dashboard-grid" style={{ overflow: 'hidden' }}>
            {/* Left Panel: visual chronological timeline events feed */}
            <div className="pane pane-border" style={{ flex: 2, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Upcoming Portfolio Key Date Milestones</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => window.open(`${API_BASE}/portfolio/critical-dates/ics`, '_blank')} 
                    className="btn btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    📅 Export iCal (.ics)
                  </button>
                  <button onClick={fetchTimeline} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    🔄 Refresh Timeline
                  </button>
                </div>
              </div>

              {loadingTimeline ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Loading timeline milestones...</p>
                </div>
              ) : timelineEvents.length === 0 ? (
                <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No upcoming timeline milestones extracted. Upload lease documents to analyze key dates.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {timelineEvents.map((evt, idx) => {
                    const typeColors: Record<string, { bg: string, text: string, border: string }> = {
                      commencement: { bg: 'rgba(5, 150, 105, 0.08)', text: 'var(--success)', border: 'var(--success)' },
                      expiration: { bg: 'rgba(220, 38, 38, 0.08)', text: 'var(--error)', border: 'var(--error)' },
                      break: { bg: 'rgba(217, 119, 6, 0.08)', text: 'var(--warning)', border: 'var(--warning)' },
                      escalation: { bg: 'rgba(109, 40, 217, 0.08)', text: 'var(--primary)', border: 'var(--primary)' }
                    };

                    const styleToken = typeColors[evt.event_type] || { bg: 'rgba(15, 23, 42, 0.05)', text: 'var(--text-muted)', border: 'var(--text-muted)' };

                    return (
                      <div 
                        key={idx}
                        className="glass" 
                        style={{ 
                          padding: '16px', 
                          display: 'flex', 
                          gap: '15px', 
                          alignItems: 'flex-start',
                          borderLeft: `4px solid ${styleToken.border}`,
                          background: styleToken.bg,
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease'
                        }}
                        onClick={() => {
                          const target = leases.find(l => l.id === evt.lease_id);
                          if (target) handleSelectLease(target);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(3px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0px)'}
                      >
                        <div style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: styleToken.text,
                          minWidth: '95px'
                        }}>
                          {evt.date}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{evt.event_title}</h4>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{evt.filename}</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{evt.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Panel: Alerts trigger configurations */}
            <div className="pane" style={{ flex: 1, overflowY: 'auto' }}>
              {!selectedLease ? (
                <div className="glass" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
                  <span style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🔔</span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Configure Real-Time Lease Alerts</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Select an active lease from the sidebar portfolio listing to set up custom email or webhook alert rules prior to upcoming key date milestones.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Configure Alerts for:</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{selectedLease.filename}</p>
                  </div>

                  {/* Create alert form */}
                  <div className="glass" style={{ padding: '20px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '15px' }}>Set Notification Trigger</h4>
                    <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Milestone Date</label>
                        <select 
                          className="chat-input"
                          style={{ border: '1px solid rgba(15, 23, 42, 0.15)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', background: '#ffffff' }}
                          value={alertForm.term_name}
                          onChange={(e) => setAlertForm({ ...alertForm, term_name: e.target.value })}
                        >
                          <option value="commencement_date">Lease Commencement Date</option>
                          <option value="expiration_date">Lease Expiration Date</option>
                          <option value="break_clause">Tenant Break Option Date</option>
                          <option value="rent_escalation">Rent Review / Escalation Date</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Alert Date Trigger</label>
                        <input 
                          type="date" 
                          required
                          className="chat-input"
                          style={{ border: '1px solid rgba(15, 23, 42, 0.15)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', background: '#ffffff', color: 'var(--foreground)' }}
                          value={alertForm.alert_date}
                          onChange={(e) => setAlertForm({ ...alertForm, alert_date: e.target.value })}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Channel Type</label>
                        <select 
                          className="chat-input"
                          style={{ border: '1px solid rgba(15, 23, 42, 0.15)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', background: '#ffffff' }}
                          value={alertForm.alert_type}
                          onChange={(e) => setAlertForm({ ...alertForm, alert_type: e.target.value })}
                        >
                          <option value="email">Email Alert Notification</option>
                          <option value="webhook">Webhook Callback Endpoint</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notification Recipient</label>
                        <input 
                          type="text" 
                          required
                          placeholder={alertForm.alert_type === 'email' ? 'manager@company.com' : 'https://api.company.com/webhook'}
                          className="chat-input"
                          style={{ border: '1px solid rgba(15, 23, 42, 0.15)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', background: '#ffffff', color: 'var(--foreground)' }}
                          value={alertForm.recipient}
                          onChange={(e) => setAlertForm({ ...alertForm, recipient: e.target.value })}
                        />
                      </div>

                      <button type="submit" className="btn" style={{ padding: '10px', fontSize: '0.85rem', width: '100%', marginTop: '5px' }}>
                        Create Notification Alert Rule
                      </button>
                    </form>
                  </div>

                  {/* Active alerts rules catalog list */}
                  <div className="glass" style={{ padding: '20px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '15px' }}>Lease Alerts Catalog</h4>
                    {loadingAlerts ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Retrieving rules catalog...</p>
                    ) : leaseAlerts.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>No alerts configured for this lease yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {leaseAlerts.map((alert) => (
                          <div 
                            key={alert.id}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '10px 12px', 
                              background: '#f8fafc', 
                              borderRadius: '6px', 
                              border: '1px solid rgba(15, 23, 42, 0.05)',
                              fontSize: '0.78rem'
                            }}
                          >
                            <div>
                              <p style={{ fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
                                {alert.term_name.replace(/_/g, ' ')}
                              </p>
                              <p style={{ color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                Trigger: {alert.alert_date.split('T')[0]} ({alert.alert_type})
                              </p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={alert.recipient}>
                                Recipient: {alert.recipient}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleDeleteAlert(alert.id)}
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--error)', 
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                padding: '4px'
                              }}
                              title="Delete Alert Rule"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'compliance' ? (
          <div className="pane" style={{ overflowY: 'auto' }}>
            {/* Exporter & Actions Panel */}
            <div className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', marginBottom: '25px', gap: '15px', background: 'var(--primary-light)', border: '1px solid rgba(139,92,246,0.1)' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>Compliance Reporting Actions</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Download structured lease data or print a beautifully formatted executive risk report.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleExportCSV}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.82rem', borderColor: 'var(--primary)', color: 'var(--primary)', background: '#ffffff' }}
                >
                  📊 Export Terms (CSV)
                </button>
                <button 
                  onClick={handlePrintPDFReport}
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  📄 Download PDF Report
                </button>
              </div>
            </div>

            {/* Compliance Statistics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' }}>
              
              {/* Compliance Rating Card */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Portfolio Compliance Rating</p>
                <h3 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>
                  {complianceReport.length > 0
                    ? ((complianceReport.filter(r => r.status === 'pass').length / complianceReport.length) * 100).toFixed(1)
                    : '100.0'}%
                </h3>
                <div className="progress-container" style={{ margin: '4px 0 0 0' }}>
                  <div className="progress-bar" style={{
                    width: `${complianceReport.length > 0 ? (complianceReport.filter(r => r.status === 'pass').length / complianceReport.length) * 100 : 100}%`,
                    background: 'linear-gradient(90deg, var(--primary) 0%, var(--success) 100%)'
                  }}></div>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Overall rules passing rate
                </p>
              </div>

              {/* Critical Failures Card */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Critical Failures</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--error)' }}>
                  {complianceReport.filter(r => r.status === 'fail').length}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Violations requiring immediate action
                </p>
              </div>

              {/* Compliance Warnings Card */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Compliance Warnings</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>
                  {complianceReport.filter(r => r.status === 'warn').length}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Medium risk details to review
                </p>
              </div>

              {/* Total Audited Rules Card */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Checks Audited</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--foreground)' }}>
                  {complianceReport.length}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Individual rule evaluations completed
                </p>
              </div>

            </div>

            {/* Compliance Issues Details List */}
            <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '15px' }}>Compliance Audit Violations & Risk Analysis</h3>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table className="terms-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Lease File</th>
                      <th>Rule / Constraint</th>
                      <th>Extracted Term Value</th>
                      <th>Status</th>
                      <th>Audit findings</th>
                      <th style={{ width: '110px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceReport.map((item, idx) => (
                      <tr key={idx} style={{ background: item.status === 'fail' ? 'rgba(220, 38, 38, 0.01)' : 'transparent' }}>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.filename}</td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.rule_name}</td>
                        <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{item.term_value}</td>
                        <td>
                          <span className={`badge badge-${item.status === 'fail' ? 'failed' : item.status === 'warn' ? 'pending' : 'completed'}`} style={{ textTransform: 'capitalize' }}>
                            {item.status === 'fail' ? 'critical' : item.status === 'warn' ? 'warning' : 'passing'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.message}</td>
                        <td>
                          <button 
                            onClick={() => handleViewViolation(item.lease_id, item.rule_id, item.term_name)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)', background: 'transparent' }}
                          >
                            🔎 View Clause
                          </button>
                        </td>
                      </tr>
                    ))}
                    {complianceReport.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px' }}>No active lease compliance audits found. Please upload a lease.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance Rules Manager */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '25px' }}>
              
              {/* Left Column: Active Rules List */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '15px' }}>Active Compliance Rules</h3>
                <div style={{ overflowY: 'auto', maxHeight: '420px' }}>
                  <table className="terms-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Rule Name</th>
                        <th>Target Term</th>
                        <th>Operator</th>
                        <th>Limit</th>
                        <th>Severity</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule) => (
                        <tr key={rule.id}>
                          <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{rule.rule_name}</td>
                          <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{rule.term_name}</td>
                          <td style={{ fontSize: '0.82rem' }}>
                            <span className="badge badge-secondary" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--foreground)' }}>
                              {rule.operator}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{rule.value_limit}</td>
                          <td>
                            <span className={`badge badge-${rule.severity === 'fail' ? 'failed' : 'pending'}`}>
                              {rule.severity}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleEditRuleClick(rule)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 6px', fontSize: '0.7rem', marginRight: '6px', minWidth: 'unset' }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 6px', fontSize: '0.7rem', color: 'var(--error)', borderColor: 'rgba(220, 38, 38, 0.2)', minWidth: 'unset' }}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                      {rules.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px' }}>
                            No compliance rules found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Rule Create/Edit Form */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '15px' }}>
                  {editingRuleId ? 'Edit Compliance Rule' : 'Create New Compliance Rule'}
                </h3>
                
                <form onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Rule Name</label>
                    <input
                      type="text"
                      value={newRule.rule_name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, rule_name: e.target.value }))}
                      placeholder="e.g. Min Insurance Cover"
                      required
                      style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'transparent' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Target Term Field</label>
                      <select
                        value={newRule.term_name}
                        onChange={(e) => setNewRule(prev => ({ ...prev, term_name: e.target.value }))}
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'white' }}
                      >
                        <option value="indemnity_covenants">Indemnity Covenants (Insurance)</option>
                        <option value="expiration_date">Expiration Date</option>
                        <option value="break_clause">Break Clause</option>
                        <option value="repair_obligations">Repair Obligations</option>
                        <option value="initial_rent">Initial Rent</option>
                        <option value="commencement_date">Commencement Date</option>
                        <option value="rent_escalation">Rent Escalation</option>
                        <option value="renewal_option">Renewal Option</option>
                        <option value="tenant_name">Tenant Name</option>
                        <option value="landlord_name">Landlord Name</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Operator</label>
                      <select
                        value={newRule.operator}
                        onChange={(e) => handleOperatorChange(e.target.value)}
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'white' }}
                      >
                        <option value="min_value">Numeric Greater/Equal</option>
                        <option value="min_year">Expiry Year Greater/Equal</option>
                        <option value="not_contains">Does Not Contain Phrases</option>
                        <option value="tenant_structural_repair">Tenant Structural Repair Check</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Limit Value</label>
                      <input
                        type="text"
                        value={newRule.value_limit}
                        onChange={(e) => setNewRule(prev => ({ ...prev, value_limit: e.target.value }))}
                        placeholder={newRule.operator === 'min_value' ? 'e.g. 5000000' : newRule.operator === 'min_year' ? 'e.g. 2028' : 'e.g. none, no break'}
                        required
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'transparent' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Severity</label>
                      <select
                        value={newRule.severity}
                        onChange={(e) => setNewRule(prev => ({ ...prev, severity: e.target.value }))}
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'white' }}
                      >
                        <option value="fail">Fail (Critical)</option>
                        <option value="warn">Warning</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Message Template</label>
                    <textarea
                      value={newRule.message_template}
                      onChange={(e) => setNewRule(prev => ({ ...prev, message_template: e.target.value }))}
                      placeholder="e.g. Insurance coverage limit ({actual}) is below required {limit}."
                      required
                      rows={2}
                      style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'transparent', resize: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                      {editingRuleId ? 'Update Rule' : 'Create Rule'}
                    </button>
                    {editingRuleId && (
                      <button
                        type="button"
                        onClick={handleCancelEditRule}
                        className="btn btn-secondary"
                        style={{ width: '80px', minWidth: 'unset' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

            </div>

          </div>
        ) : currentView === 'observability' ? (
          <div className="pane" style={{ overflowY: 'auto' }}>
            {/* Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
              
              {/* Financial Audit Card */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Pipeline Spend</p>
                <h3 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>
                  ${stats ? stats.total_cost.toFixed(6) : '0.000000'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Cumulative API usage cost (USD)
                </p>
              </div>

              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unit Cost per Lease</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--foreground)' }}>
                  ${stats && stats.total_leases > 0 ? (stats.total_cost / stats.total_leases).toFixed(6) : '0.000000'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Average cost per file processed
                </p>
              </div>

              {/* Pipeline Performance Card */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Extraction Time</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--foreground)' }}>
                  {stats ? (stats.avg_latency_ms / 1000).toFixed(2) : '0.00'}s
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  End-to-end pipeline latency
                </p>
              </div>

              {/* Model Accuracy Meter */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Machine Accuracy Rate</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
                  {stats ? stats.accuracy_rate.toFixed(1) : '100.0'}%
                </h3>
                <div className="progress-container" style={{ margin: '4px 0 0 0' }}>
                  <div className="progress-bar" style={{ width: `${stats ? stats.accuracy_rate : 100}%`, background: 'var(--success)' }}></div>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Unedited by reviewer after extraction
                </p>
              </div>

            </div>

            {/* Split view: Ingestion Jobs / Cost Breakdown AND Audit logs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, minHeight: '400px' }}>
              
              {/* Cost by Lease Table */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '15px' }}>Job Ingestion & Cost Audit</h3>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="terms-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Lease Document</th>
                        <th>API Cost (USD)</th>
                        <th>Latency (sec)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats && stats.cost_by_lease.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.filename}</td>
                          <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>${parseFloat(String(item.cost)).toFixed(6)}</td>
                          <td style={{ fontSize: '0.85rem' }}>{(item.latency_ms / 1000).toFixed(2)}s</td>
                        </tr>
                      ))}
                      {(!stats || stats.cost_by_lease.length === 0) && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px' }}>No ingestion records found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Logs Table */}
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '15px' }}>Human Reviewer Corrections</h3>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="terms-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Lease</th>
                        <th>Field / Action</th>
                        <th>Original AI Value</th>
                        <th>Corrected Human Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats && stats.audit_logs.map((log: any, idx: number) => {
                        let oldVal = '';
                        let newVal = '';
                        try {
                          const oldParsed = typeof log.old_values === 'string' ? JSON.parse(log.old_values) : log.old_values;
                          const newParsed = typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values;
                          oldVal = oldParsed?.extracted_value || '';
                          newVal = newParsed?.extracted_value || '';
                        } catch (e) {}
                        
                        return (
                          <tr key={idx}>
                            <td style={{ fontSize: '0.8rem', fontWeight: 600 }} title={log.filename}>{log.filename}</td>
                            <td style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{log.action.replace(/_/g, ' ')}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{oldVal}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>{newVal}</td>
                          </tr>
                        );
                      })}
                      {(!stats || stats.audit_logs.length === 0) && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px' }}>No reviewer corrections logged yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        ) : currentView === 'risk' ? (
          <div className="pane" style={{ overflowY: 'auto', gap: '20px' }}>
            {/* Header */}
            <div className="glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>🔥 Clause Risk & Deviation Heatmap Matrix</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Institutional RICS benchmark scoring matrix highlighting high-risk terms and lease clause deviations across your portfolio.
                </p>
              </div>
              <button onClick={fetchRiskMatrix} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                🔄 Refresh Risk Scores
              </button>
            </div>

            {/* Summary KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Portfolio Risk Index</p>
                <h3 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>
                  {riskMatrixData ? riskMatrixData.summary.overall_risk_score : 100} / 100
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Aggregate commercial safety score
                </p>
              </div>

              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>High Risk Clause Flags</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--error)' }}>
                  {riskMatrixData ? riskMatrixData.summary.high_risk : 0}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Deviations from market standards
                </p>
              </div>

              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Medium Risk Warnings</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>
                  {riskMatrixData ? riskMatrixData.summary.medium_risk : 0}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Near-term or flex option alerts
                </p>
              </div>

              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Low Risk Clauses</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
                  {riskMatrixData ? riskMatrixData.summary.low_risk : 0}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Standard institutional terms
                </p>
              </div>
            </div>

            {/* Heatmap Table */}
            <div className="glass" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '15px', color: 'var(--foreground)' }}>
                Portfolio Risk Matrix & RICS Deviation Grid
              </h4>

              {loadingRiskMatrix ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Calculating risk heatmap matrix...
                </div>
              ) : !riskMatrixData || riskMatrixData.matrix.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No completed leases to analyze. Upload lease PDFs to generate risk heatmaps.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', flex: 1 }}>
                  <table className="terms-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Lease Document</th>
                        <th>Property Asset</th>
                        <th style={{ textAlign: 'center' }}>Safety Score</th>
                        <th>Liability Insurance ($5M Min)</th>
                        <th>Commitment Expiry (2028+)</th>
                        <th>Tenant Break Clause</th>
                        <th>Structural Repair Obligation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskMatrixData.matrix.map((row: any) => {
                        const renderBadge = (item: any) => {
                          const level = item.level;
                          const bg = level === 'high' ? 'rgba(239, 68, 68, 0.15)' : level === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)';
                          const color = level === 'high' ? 'var(--error)' : level === 'medium' ? 'var(--warning)' : 'var(--success)';
                          return (
                            <span 
                              style={{ 
                                padding: '3px 8px', 
                                borderRadius: '4px', 
                                background: bg, 
                                color: color, 
                                fontWeight: 700, 
                                fontSize: '0.72rem',
                                textTransform: 'uppercase',
                                cursor: 'help'
                              }}
                              title={item.description}
                            >
                              {level === 'high' ? '⚠️ High Risk' : level === 'medium' ? '⚡ Med Risk' : '✅ Low Risk'}
                            </span>
                          );
                        };

                        return (
                          <tr key={row.lease_id}>
                            <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                              <a 
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  const target = leases.find(l => l.id === row.lease_id);
                                  if (target) handleSelectLease(target);
                                }}
                                style={{ color: 'var(--primary)', textDecoration: 'none' }}
                              >
                                {row.filename}
                              </a>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {row.property_name}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: row.score >= 80 ? 'var(--success)' : row.score >= 60 ? 'var(--warning)' : 'var(--error)' }}>
                              {row.score}%
                            </td>
                            <td>{renderBadge(row.risks.insurance)}</td>
                            <td>{renderBadge(row.risks.expiration)}</td>
                            <td>{renderBadge(row.risks.break_clause)}</td>
                            <td>{renderBadge(row.risks.repair)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'stacking' ? (
          <div className="pane" style={{ overflowY: 'auto', gap: '20px' }}>
            {/* Header */}
            <div className="glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>🏢 Multi-Tenant Rent Roll & Visual Stacking Plan</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Floor-by-floor visual suite allocation, annual rent rolls ($/sq ft), occupancy percentages, and expiration heatmaps.
                </p>
              </div>
              <button onClick={() => fetchStackingPlan(selectedPropertyFilter)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                🔄 Refresh Stacking Plan
              </button>
            </div>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Annual Revenue</p>
                <h3 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                  ${stackingPlanData ? stackingPlanData.total_annual_revenue.toLocaleString() : '0'}
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Aggregate annual gross rent roll
                </p>
              </div>

              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Building Occupancy Rate</p>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>
                  {stackingPlanData ? stackingPlanData.occupancy_rate : 100}%
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {stackingPlanData ? stackingPlanData.leased_sqft.toLocaleString() : '0'} / {stackingPlanData ? stackingPlanData.total_sqft.toLocaleString() : '0'} Sq Ft
                </p>
              </div>

              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Rent / Sq Ft</p>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                  ${stackingPlanData ? stackingPlanData.avg_rent_per_sqft : 0} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ sq ft</span>
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Weighted portfolio average rate
                </p>
              </div>

              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Asset Portfolio</p>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stackingPlanData ? stackingPlanData.property_name : 'All Portfolio Assets'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Filtered building asset
                </p>
              </div>
            </div>

            {/* Stacking Floors Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {loadingStackingPlan ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading stacking plan floor data...
                </div>
              ) : !stackingPlanData || stackingPlanData.floors.length === 0 ? (
                <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No tenant suite leases found for this property asset. Upload lease PDFs to generate visual floor stacking plans.
                </div>
              ) : (
                stackingPlanData.floors.map((floor: any, fIdx: number) => (
                  <div key={fIdx} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Floor Header Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(15,23,42,0.06)', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px' }}>
                          {floor.floor_name}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Total Area: {floor.total_sqft.toLocaleString()} Sq Ft
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '0.82rem', fontWeight: 600 }}>
                        <span>Annual Roll: <strong style={{ color: 'var(--success)' }}>${floor.annual_revenue.toLocaleString()}</strong></span>
                        <span>Avg Rate: <strong style={{ color: 'var(--primary)' }}>${floor.avg_rent_per_sqft}/sq ft</strong></span>
                      </div>
                    </div>

                    {/* Suite Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {floor.suites.map((suite: any, sIdx: number) => (
                        <div 
                          key={sIdx}
                          style={{
                            padding: '14px',
                            borderRadius: '8px',
                            background: suite.risk_flag === 'expiring_soon' ? 'rgba(245, 158, 11, 0.08)' : '#ffffff',
                            border: `1px solid ${suite.risk_flag === 'expiring_soon' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(15, 23, 42, 0.08)'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                          }}
                          onClick={() => {
                            const target = leases.find(l => l.id === suite.lease_id);
                            if (target) handleSelectLease(target);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>{suite.suite_number}</span>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              background: suite.risk_flag === 'expiring_soon' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                              color: suite.risk_flag === 'expiring_soon' ? 'var(--warning)' : 'var(--success)'
                            }}>
                              {suite.risk_flag === 'expiring_soon' ? '⚡ Expiring Soon' : '✅ Occupied'}
                            </span>
                          </div>

                          <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={suite.tenant_name}>
                            👤 {suite.tenant_name}
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <span>Area: <strong>{suite.sqft.toLocaleString()} sq ft</strong></span>
                            <span>Rate: <strong>${suite.rent_per_sqft}/sq ft</strong></span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '6px', marginTop: '2px' }}>
                            <span>Annual: <strong style={{ color: 'var(--success)' }}>${suite.annual_rent.toLocaleString()}</strong></span>
                            <span>Expires: <strong style={{ fontFamily: 'monospace' }}>{suite.expiration_date}</strong></span>
                          </div>
                        </div>
                      ))}
                      {floor.suites.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          No suites assigned to this floor yet.
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : currentView === 'compare' ? (
          <div className="pane" style={{ overflowY: 'auto', gap: '20px' }}>
            {/* Selector Panel */}
            <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>⚖️ AI Lease Comparison & Redline Diff Engine</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Select any two lease documents or amendments to generate side-by-side covenant comparison matrices and commercial variance scores.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base Lease Document</label>
                  <select 
                    value={compareLeaseId1}
                    onChange={(e) => setCompareLeaseId1(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Select Base Lease Document --</option>
                    {leases.map(l => (
                      <option key={l.id} value={l.id}>{l.filename} ({l.property_name || 'General'})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Comparison Document / Amendment</label>
                  <select 
                    value={compareLeaseId2}
                    onChange={(e) => setCompareLeaseId2(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Select Comparison Lease --</option>
                    {leases.map(l => (
                      <option key={l.id} value={l.id}>{l.filename} ({l.property_name || 'General'})</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={() => handleRunComparison()}
                  disabled={!compareLeaseId1 || !compareLeaseId2 || loadingComparison}
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.85rem' }}
                >
                  {loadingComparison ? 'Comparing...' : '⚡ Compare Leases'}
                </button>
              </div>
            </div>

            {/* Results Grid */}
            {comparisonData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Commercial Variance Index</p>
                    <h3 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>
                      {comparisonData.summary.commercial_variance_score}%
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Overall clause divergence rate
                    </p>
                  </div>

                  <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Modified Terms</p>
                    <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>
                      {comparisonData.summary.modified_count}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Terms with language/value shifts
                    </p>
                  </div>

                  <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Added Provisions</p>
                    <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
                      {comparisonData.summary.added_count}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      New covenants introduced
                    </p>
                  </div>

                  <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Removed Provisions</p>
                    <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--error)' }}>
                      {comparisonData.summary.removed_count}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Covenants omitted from comparison
                    </p>
                  </div>
                </div>

                {/* Diff Table */}
                <div className="glass" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '15px', color: 'var(--foreground)' }}>
                    Comparative Redline Matrix: {comparisonData.lease_1.filename} vs {comparisonData.lease_2.filename}
                  </h4>

                  <div style={{ overflowX: 'auto', flex: 1 }}>
                    <table className="terms-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Term Provision</th>
                          <th>Status</th>
                          <th>{comparisonData.lease_1.filename} (Base)</th>
                          <th>{comparisonData.lease_2.filename} (Comparison)</th>
                          <th>Variance & Commercial Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.diff_matrix.map((row: any, idx: number) => {
                          const status = row.status;
                          const bg = status === 'modified' ? 'rgba(245, 158, 11, 0.06)' : status === 'added' ? 'rgba(16, 185, 129, 0.06)' : status === 'removed' ? 'rgba(239, 68, 68, 0.06)' : 'transparent';
                          const badgeBg = status === 'modified' ? 'rgba(245, 158, 11, 0.2)' : status === 'added' ? 'rgba(16, 185, 129, 0.2)' : status === 'removed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.08)';
                          const badgeColor = status === 'modified' ? 'var(--warning)' : status === 'added' ? 'var(--success)' : status === 'removed' ? 'var(--error)' : 'var(--text-muted)';

                          return (
                            <tr key={idx} style={{ background: bg }}>
                              <td style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'capitalize' }}>
                                {row.term_name.replace(/_/g, ' ')}
                              </td>
                              <td>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', background: badgeBg, color: badgeColor, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                  {status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: status === 'removed' ? 'var(--error)' : 'var(--foreground)' }}>
                                {row.lease_1_value}
                              </td>
                              <td style={{ fontSize: '0.8rem', color: status === 'added' ? 'var(--success)' : 'var(--foreground)', fontWeight: status === 'added' || status === 'modified' ? 700 : 400 }}>
                                {row.lease_2_value}
                              </td>
                              <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {row.delta_summary}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : currentView === 'anomalies' ? (
          <div className="pane" style={{ overflowY: 'auto', gap: '20px' }}>
            <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>⚡ Portfolio-Wide Anomaly & Data Discrepancy Auditor</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Automated audit scanning across all portfolio leases to detect missing terms, uncapped liabilities, and covenant risks.
                  </p>
                </div>
                <button onClick={fetchPortfolioAnomalies} disabled={loadingAnomalies} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  {loadingAnomalies ? 'Auditing...' : '🔄 Re-scan Portfolio'}
                </button>
              </div>

              {loadingAnomalies ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Scanning portfolio leases for data discrepancies...
                </div>
              ) : !portfolioAnomaliesData ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Click Re-scan Portfolio to evaluate anomaly health.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Health Banner */}
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: '8px',
                    background: portfolioAnomaliesData.portfolio_health_score >= 80 ? 'rgba(16, 185, 129, 0.08)' : portfolioAnomaliesData.portfolio_health_score >= 60 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${portfolioAnomaliesData.portfolio_health_score >= 80 ? 'rgba(16, 185, 129, 0.25)' : portfolioAnomaliesData.portfolio_health_score >= 60 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Portfolio Anomaly Health Index</span>
                      <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '2px 0 0 0', color: portfolioAnomaliesData.portfolio_health_score >= 80 ? 'var(--success)' : portfolioAnomaliesData.portfolio_health_score >= 60 ? 'var(--warning)' : 'var(--error)' }}>
                        {portfolioAnomaliesData.portfolio_health_score} / 100
                      </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Leases Audited</span>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0 0' }}>{portfolioAnomaliesData.total_leases_audited}</h4>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--error)', textTransform: 'uppercase', fontWeight: 700 }}>High Severity</span>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--error)', margin: '2px 0 0 0' }}>{portfolioAnomaliesData.high_severity_anomalies}</h4>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--warning)', textTransform: 'uppercase', fontWeight: 700 }}>Medium Severity</span>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--warning)', margin: '2px 0 0 0' }}>{portfolioAnomaliesData.medium_severity_anomalies}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Anomalies Table */}
                  <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                    <table className="terms-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Severity</th>
                          <th>Lease Document</th>
                          <th>Property Asset</th>
                          <th>Issue Classification</th>
                          <th>Discrepancy Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioAnomaliesData.anomalies.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                background: item.severity === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: item.severity === 'high' ? 'var(--error)' : 'var(--warning)'
                              }}>
                                {item.severity}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, fontSize: '0.82rem' }}>{item.filename}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.property_name}</td>
                            <td style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>{item.issue_type.replace(/_/g, ' ')}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--foreground)' }}>{item.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'stresstest' ? (
          <div className="pane" style={{ overflowY: 'auto', gap: '20px' }}>
            <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>📊 Rent Roll Stress-Testing & Vacancy Risk Scenario Simulator</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Simulate economic shocks (Tenant Defaults %, Vacancy Spikes %, OpEx Inflation %) to stress-test Portfolio Net Operating Income (NOI) and Debt Service Coverage Ratios (DSCR).
                </p>
              </div>

              {/* Stress Test Input Controls */}
              <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '20px', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tenant Default Shock: {stressTestParams.default_rate_pct}%</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={stressTestParams.default_rate_pct}
                    onChange={(e) => setStressTestParams({ ...stressTestParams, default_rate_pct: parseInt(e.target.value) })}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vacancy Rate Shock: {stressTestParams.vacancy_rate_pct}%</label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={stressTestParams.vacancy_rate_pct}
                    onChange={(e) => setStressTestParams({ ...stressTestParams, vacancy_rate_pct: parseInt(e.target.value) })}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>OpEx Inflation Surge: {stressTestParams.inflation_surge_pct}%</label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={stressTestParams.inflation_surge_pct}
                    onChange={(e) => setStressTestParams({ ...stressTestParams, inflation_surge_pct: parseInt(e.target.value) })}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                </div>
                <button onClick={handleRunStressTest} disabled={loadingStressTest} className="btn btn-accent" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
                  {loadingStressTest ? 'Simulating...' : '⚡ Run Simulation'}
                </button>
              </div>

              {/* Simulation Output */}
              {loadingStressTest ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Calculating economic scenario shocks on portfolio NOI & DSCR...
                </div>
              ) : !stressTestData ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Adjust parameters and click Run Simulation to view financial stress metrics.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Solvency Status Banner */}
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: '8px',
                    background: stressTestData.stress_test.solvency_status === 'SAFE' ? 'rgba(16, 185, 129, 0.08)' : stressTestData.stress_test.solvency_status === 'MODERATE_RISK' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${stressTestData.stress_test.solvency_status === 'SAFE' ? 'rgba(16, 185, 129, 0.25)' : stressTestData.stress_test.solvency_status === 'MODERATE_RISK' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Portfolio Solvency & Debt Service Status</span>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '2px 0 0 0', color: stressTestData.stress_test.solvency_status === 'SAFE' ? 'var(--success)' : stressTestData.stress_test.solvency_status === 'MODERATE_RISK' ? 'var(--warning)' : 'var(--error)' }}>
                        {stressTestData.stress_test.solvency_status === 'SAFE' ? '✅ SOLVENT (DSCR > 1.25x)' : stressTestData.stress_test.solvency_status === 'MODERATE_RISK' ? '⚠️ MODERATE COVENANT RISK' : '🚨 CRITICAL DEBT DEFAULT RISK'}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Baseline DSCR</span>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0 0' }}>{stressTestData.baseline.dscr}x</h4>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: stressTestData.stress_test.stress_dscr < 1.25 ? 'var(--error)' : 'var(--success)', textTransform: 'uppercase', fontWeight: 700 }}>Stressed DSCR</span>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: stressTestData.stress_test.stress_dscr < 1.25 ? 'var(--error)' : 'var(--success)', margin: '2px 0 0 0' }}>{stressTestData.stress_test.stress_dscr}x</h4>
                      </div>
                    </div>
                  </div>

                  {/* Financial Comparison Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Annual Gross Revenue</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline: </span>
                          <strong style={{ fontSize: '0.9rem' }}>${stressTestData.baseline.annual_gross_revenue.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>Stressed: </span>
                          <strong style={{ fontSize: '1rem', color: 'var(--error)' }}>${stressTestData.stress_test.stress_annual_revenue.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Net Operating Income (NOI)</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline: </span>
                          <strong style={{ fontSize: '0.9rem' }}>${stressTestData.baseline.net_operating_income.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>Stressed: </span>
                          <strong style={{ fontSize: '1rem', color: 'var(--error)' }}>${stressTestData.stress_test.stress_net_operating_income.toLocaleString()}</strong>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '4px', fontWeight: 700 }}>
                        NOI Variance: {stressTestData.stress_test.noi_variance_pct}%
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Annual OpEx & Debt Obligations</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Baseline OpEx (35%):</span>
                          <strong>${stressTestData.baseline.operating_expenses.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--warning)' }}>Stressed OpEx:</span>
                          <strong style={{ color: 'var(--warning)' }}>${stressTestData.stress_test.stress_operating_expenses.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Annual Debt Service:</span>
                          <strong>${stressTestData.baseline.annual_debt_service.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'concentration' ? (
          <div className="pane" style={{ overflowY: 'auto', gap: '20px' }}>
            <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>🏢 Tenant Concentration & Credit Risk Exposure Engine</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Herfindahl-Hirschman Index (HHI) concentration scoring and corporate tenant revenue reliance analysis across portfolio assets.
                  </p>
                </div>
                <button onClick={fetchTenantConcentration} disabled={loadingConcentration} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  {loadingConcentration ? 'Analyzing...' : '🔄 Refresh Risk Data'}
                </button>
              </div>

              {loadingConcentration ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Calculating corporate tenant concentration & HHI index...
                </div>
              ) : !tenantConcentrationData ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Click Refresh Risk Data to load tenant exposure analysis.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* HHI Scorecard Banner */}
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: '8px',
                    background: tenantConcentrationData.hhi_index < 1500 ? 'rgba(16, 185, 129, 0.08)' : tenantConcentrationData.hhi_index <= 2500 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${tenantConcentrationData.hhi_index < 1500 ? 'rgba(16, 185, 129, 0.25)' : tenantConcentrationData.hhi_index <= 2500 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Herfindahl-Hirschman Index (HHI Score)</span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '2px 0 0 0', color: tenantConcentrationData.hhi_index < 1500 ? 'var(--success)' : tenantConcentrationData.hhi_index <= 2500 ? 'var(--warning)' : 'var(--error)' }}>
                        {tenantConcentrationData.hhi_index} - {tenantConcentrationData.concentration_category.replace(/_/g, ' ')}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Annual Revenue</span>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0 0' }}>${tenantConcentrationData.total_portfolio_annual_revenue.toLocaleString()}</h4>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: tenantConcentrationData.top_3_tenant_revenue_share_pct > 50 ? 'var(--error)' : 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Top 3 Tenant Share</span>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: tenantConcentrationData.top_3_tenant_revenue_share_pct > 50 ? 'var(--error)' : 'var(--primary)', margin: '2px 0 0 0' }}>{tenantConcentrationData.top_3_tenant_revenue_share_pct}%</h4>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Table */}
                  <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                    <table className="terms-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Corporate Tenant Name</th>
                          <th>Annual Rent Value</th>
                          <th>Portfolio Revenue Share (%)</th>
                          <th>Active Leases</th>
                          <th>Property Assets Occupied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenantConcentrationData.tenants.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.tenant_name}</td>
                            <td style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success)' }}>${item.total_annual_rent.toLocaleString()}/yr</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1, height: '8px', background: 'rgba(15,23,42,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, item.revenue_share_pct)}%`, background: item.revenue_share_pct > 30 ? 'var(--error)' : item.revenue_share_pct > 15 ? 'var(--warning)' : 'var(--primary)' }} />
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{item.revenue_share_pct}%</span>
                              </div>
                            </td>
                            <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.lease_count} lease(s)</td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.properties.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : !selectedLease ? (
          <div className="pane" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div className="glass" style={{ padding: '40px', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(139,92,246,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <svg style={{ width: '32px', height: '32px', color: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '12px' }}>AI Lease Abstraction Hub</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
                Upload commercial lease PDF documents in the sidebar. LeaseLogic will parse layout schedules, run comparative clause boundary chunking, generate vector embeddings, and extract structured terms.
              </p>
              
              <div style={{ width: '100%', textAlign: 'left' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '12px' }}>Quick Query Prompts</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => { setActiveTab('chat'); sendChatMessage('Which leases expire before 2030?'); }} className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }}>
                    🔍 "Which leases expire before 2030?"
                  </button>
                  <button onClick={() => { setActiveTab('chat'); sendChatMessage('What are my maintenance/repair obligations?'); }} className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }}>
                    🔍 "What are my maintenance/repair obligations?"
                  </button>
                  <button onClick={() => { setActiveTab('chat'); sendChatMessage('Summarize break clauses in the portfolio'); }} className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }}>
                    🔍 "Summarize break clauses in the portfolio"
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* Split Screen Left: Terms Abstract */}
            <div className="pane pane-border">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Lease Terms Sheet</h3>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedLease && selectedLease.status === 'completed' && (
                    <>
                      <button
                        onClick={() => window.open(`${API_BASE}/leases/${selectedLease.id}/export-memo`, '_blank')}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        📄 Executive Memo
                      </button>
                      <button
                        onClick={() => window.open(`${API_BASE}/leases/${selectedLease.id}/export-abstract-pdf`, '_blank')}
                        className="btn btn-secondary"
                        style={{ padding: '8px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Export Printable White-Label PDF Abstract"
                      >
                        📄 PDF Abstract
                      </button>
                      <button
                        onClick={() => window.open(`${API_BASE}/leases/${selectedLease.id}/export-erp?format=yardi`, '_blank')}
                        className="btn btn-secondary"
                        style={{ padding: '8px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Export Yardi Voyager XML Schema"
                      >
                        ⚡ Yardi XML
                      </button>
                      <button
                        onClick={() => window.open(`${API_BASE}/leases/${selectedLease.id}/export-erp?format=mri`, '_blank')}
                        className="btn btn-secondary"
                        style={{ padding: '8px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Export MRI Software XML Schema"
                      >
                        ⚡ MRI XML
                      </button>
                    </>
                  )}
                  <button 
                    onClick={triggerRegistryAutomation}
                    disabled={automationRunning}
                    className="btn btn-accent"
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {automationRunning ? 'Filing...' : 'Submit to Registry'}
                  </button>
                </div>
              </div>

              {selectedLease.status !== 'completed' ? (
                <div className="glass" style={{ padding: '40px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>This lease is currently processing.</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>Please wait for extraction pipeline to finish.</p>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  <table className="terms-table">
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}>Approve</th>
                        <th>Term Name</th>
                        <th>Extracted Value</th>
                        <th style={{ width: '70px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terms.map(term => {
                        const termDisplay = term.term_name.replace(/_/g, ' ');
                        const isSelected = selectedTerm?.id === term.id;
                        
                        return (
                          <tr 
                            key={term.id} 
                            className={`term-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedTerm(term)}
                          >
                            <td onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={term.reviewer_status === 'approved'}
                                onChange={() => toggleApprove(term)}
                                style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                              />
                            </td>
                            <td style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                              {termDisplay}
                            </td>
                            <td>
                              {editingTerm === term.id ? (
                                <input 
                                  type="text" 
                                  value={editValue} 
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="chat-input"
                                  style={{ border: '1px solid var(--primary)', borderRadius: '4px', padding: '4px 8px', background: '#ffffff', color: 'var(--foreground)', width: '100%' }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <p style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                                  {term.extracted_value}
                                </p>
                              )}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {editingTerm === term.id ? (
                                  <button onClick={() => saveEdit(term)} className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Save</button>
                                ) : (
                                  <>
                                    <button onClick={() => startEdit(term)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                                    <button onClick={() => handleCompareTerm(term.term_name)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)', background: 'transparent' }} title="Compare across portfolio">Compare</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Document Settings & Relationship Mapping */}
                  <div className="glass" style={{ marginTop: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--primary)', margin: 0, fontWeight: 700 }}>
                      Document Hierarchy & Classification
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Document Type</label>
                        <select
                          className="chat-input"
                          style={{ padding: '6px', fontSize: '0.8rem', border: '1px solid rgba(15,23,42,0.1)', borderRadius: '4px', background: '#ffffff', color: 'var(--foreground)' }}
                          value={selectedLease.document_type || 'original_lease'}
                          onChange={(e) => handleUpdateRelationship(selectedLease.parent_lease_id || null, e.target.value)}
                        >
                          <option value="original_lease">Original Lease (Parent)</option>
                          <option value="amendment">Amendment</option>
                          <option value="addendum">Addendum</option>
                          <option value="side_letter">Side Letter</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Parent Lease Mapping</label>
                        <select
                          className="chat-input"
                          style={{ padding: '6px', fontSize: '0.8rem', border: '1px solid rgba(15,23,42,0.1)', borderRadius: '4px', background: '#ffffff', color: 'var(--foreground)' }}
                          value={selectedLease.parent_lease_id || ''}
                          onChange={(e) => handleUpdateRelationship(e.target.value || null, selectedLease.document_type || 'original_lease')}
                          disabled={selectedLease.document_type === 'original_lease'}
                        >
                          <option value="">-- No Parent (Root) --</option>
                          {leases
                            .filter(l => l.id !== selectedLease.id && (!l.document_type || l.document_type === 'original_lease'))
                            .map(l => (
                              <option key={l.id} value={l.id}>{l.filename}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2', marginTop: '4px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Building Asset / Property Tag</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="chat-input"
                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', border: '1px solid rgba(15,23,42,0.1)', borderRadius: '4px', background: '#ffffff', color: 'var(--foreground)' }}
                            value={selectedLease.property_name || 'General Portfolio'}
                            onChange={(e) => setSelectedLease(prev => prev ? { ...prev, property_name: e.target.value } : null)}
                            placeholder="e.g. Oxford Street Retail Complex"
                          />
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                            onClick={() => handleUpdateProperty(selectedLease.property_name || 'General Portfolio')}
                          >
                            Save Tag
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Playwright filing console logs */}
                  {automationLogs.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent)' }}>Land Registry Automation Logs</h4>
                      <div className="terminal">
                        {automationLogs.map((log, idx) => (
                          <div key={idx} style={{ marginBottom: '6px' }}>{log}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Split Screen Right: Explorer / Chat / Schedule */}
            <div className="pane">
              <div className="tabs">
                <div className={`tab ${activeTab === 'abstract' ? 'active' : ''}`} onClick={() => setActiveTab('abstract')}>
                  Document Explorer
                </div>
                <div className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                  Compliance Q&A
                </div>
                <div className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
                  Rent Schedule
                </div>
                <div className={`tab ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>
                  📝 Review & History
                </div>
                <div className={`tab ${activeTab === 'effective' ? 'active' : ''}`} onClick={() => setActiveTab('effective')}>
                  🌿 Net Effective Terms
                </div>
                <div className={`tab ${activeTab === 'cam_audit' ? 'active' : ''}`} onClick={() => { setActiveTab('cam_audit'); handleRunCamAudit(); }}>
                  💰 CAM Audit
                </div>
                <div className={`tab ${activeTab === 'esg' ? 'active' : ''}`} onClick={() => { setActiveTab('esg'); handleFetchEsgAudit(); }}>
                  🌱 ESG Audit
                </div>
                <div className={`tab ${activeTab === 'negotiation' ? 'active' : ''}`} onClick={() => { setActiveTab('negotiation'); handleGenerateCounterOffer(); }}>
                  🤖 Negotiation
                </div>
                <div className={`tab ${activeTab === 'sublease' ? 'active' : ''}`} onClick={() => { setActiveTab('sublease'); handleRunSubleaseAnalysis(); }}>
                  🏢 Sublease
                </div>
                <div className={`tab ${activeTab === 'accounting' ? 'active' : ''}`} onClick={() => { setActiveTab('accounting'); handleRunLeaseAccounting(); }}>
                  ⚖️ Accounting
                </div>
                <div className={`tab ${activeTab === 'strategy' ? 'active' : ''}`} onClick={() => { setActiveTab('strategy'); handleRunRenewalStrategy(); }}>
                  📈 Strategy
                </div>
                <div className={`tab ${activeTab === 'spatial' ? 'active' : ''}`} onClick={() => { setActiveTab('spatial'); handleFetchSpatialAnalytics(); }}>
                  📍 Spatial
                </div>
              </div>

              {activeTab === 'abstract' ? (
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Original Lease Document Text</h4>
                    {selectedLease && (
                      <button
                        onClick={() => window.open(`${API_BASE}/leases/${selectedLease.id}/export-redlines`, '_blank')}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        📄 Export Redlined Draft
                      </button>
                    )}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                    {clauses.map(clause => {
                      // Check if this clause is referenced by the selected term
                      const isHighlighted = selectedTerm?.source_clause_ids?.includes(clause.id);
                      const activeRedline = leaseRedlines.find(r => r.clause_id === clause.id);

                      return (
                        <div 
                          key={clause.id} 
                          className={`clause-block ${isHighlighted ? 'highlighted-clause' : ''}`}
                          style={{ 
                            marginBottom: '16px', 
                            fontSize: '0.85rem', 
                            lineHeight: 1.6,
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(15, 23, 42, 0.04)',
                            background: isHighlighted ? 'rgba(109, 40, 217, 0.05)' : 'rgba(255, 255, 255, 0.6)',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            {(clause.clause_number || clause.clause_title) && (
                              <p style={{ fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
                                Page {clause.page_number} - {clause.clause_number ? `Section ${clause.clause_number}` : ''} {clause.clause_title || ''}
                              </p>
                            )}
                            
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                              {selectedTerm && (
                                <button
                                  onClick={() => handleToggleGrounding(clause.id)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: '0.72rem',
                                    borderRadius: '4px',
                                    height: '22px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    borderColor: isHighlighted ? 'var(--accent)' : 'rgba(15, 23, 42, 0.15)',
                                    color: isHighlighted ? 'var(--accent)' : 'var(--text-muted)',
                                    background: isHighlighted ? 'rgba(219, 39, 119, 0.05)' : '#ffffff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {isHighlighted ? '✕ Unlink' : '🔗 Link Term'}
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  if (editingClauseId === clause.id) {
                                    setEditingClauseId(null);
                                    setRedlineTextValue('');
                                  } else {
                                    setEditingClauseId(clause.id);
                                    setRedlineTextValue(activeRedline ? activeRedline.redline_text : clause.text_content);
                                  }
                                }}
                                className="btn btn-secondary"
                                style={{
                                  padding: '2px 8px',
                                  fontSize: '0.72rem',
                                  borderRadius: '4px',
                                  height: '22px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  borderColor: 'rgba(15, 23, 42, 0.15)',
                                  color: 'var(--text-muted)',
                                  background: '#ffffff',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                ✍️ {editingClauseId === clause.id ? 'Cancel' : 'Redline'}
                              </button>
                            </div>
                          </div>

                          {editingClauseId === clause.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Redline Author</label>
                                  <input 
                                    type="text" 
                                    value={redlineAuthorName}
                                    onChange={(e) => setRedlineAuthorName(e.target.value)}
                                    placeholder="Your Name"
                                    required
                                    className="chat-input"
                                    style={{ padding: '6px', fontSize: '0.78rem', border: '1px solid rgba(15,23,42,0.1)', borderRadius: '4px', background: '#ffffff', color: 'var(--foreground)' }}
                                  />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Amend Clause Text</label>
                                  <textarea
                                    value={redlineTextValue}
                                    onChange={(e) => setRedlineTextValue(e.target.value)}
                                    rows={4}
                                    className="chat-input"
                                    style={{ padding: '8px', fontSize: '0.8rem', border: '1px solid rgba(15,23,42,0.1)', borderRadius: '6px', background: '#ffffff', color: 'var(--foreground)', resize: 'vertical', minHeight: '80px' }}
                                  />
                                </div>
                              </div>

                              <div style={{ borderTop: '1px dashed rgba(15,23,42,0.1)', paddingTop: '8px' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Diff Live Preview</span>
                                <div style={{ fontSize: '0.82rem', lineHeight: 1.5, background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.06)', maxHeight: '150px', overflowY: 'auto' }}>
                                  {diffWords(clause.text_content, redlineTextValue).map((part, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        backgroundColor: part.type === 'added' ? 'rgba(16, 185, 129, 0.15)' : part.type === 'removed' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                        color: part.type === 'added' ? '#10b981' : part.type === 'removed' ? '#ef4444' : 'inherit',
                                        textDecoration: part.type === 'removed' ? 'line-through' : 'none',
                                        padding: part.type !== 'normal' ? '2px 4px' : '0',
                                        borderRadius: part.type !== 'normal' ? '4px' : '0',
                                        margin: part.type !== 'normal' ? '0 1px' : '0',
                                        whiteSpace: 'pre-wrap',
                                        display: 'inline-block'
                                      }}
                                    >
                                      {part.text}{' '}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                {activeRedline && (
                                  <button
                                    onClick={() => handleDeleteRedline(activeRedline.id)}
                                    className="btn"
                                    style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#ef4444', color: 'white', borderColor: '#ef4444' }}
                                  >
                                    🗑️ Remove Proposal
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSaveRedline(clause.id, clause.text_content)}
                                  className="btn"
                                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                >
                                  💾 Save Draft Redline
                                </button>
                              </div>
                            </div>
                          ) : activeRedline ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                                {diffWords(clause.text_content, activeRedline.redline_text).map((part, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      backgroundColor: part.type === 'added' ? 'rgba(16, 185, 129, 0.15)' : part.type === 'removed' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                      color: part.type === 'added' ? '#10b981' : part.type === 'removed' ? '#ef4444' : 'inherit',
                                      textDecoration: part.type === 'removed' ? 'line-through' : 'none',
                                      padding: part.type !== 'normal' ? '2px 4px' : '0',
                                      borderRadius: part.type !== 'normal' ? '4px' : '0',
                                      margin: part.type !== 'normal' ? '0 1px' : '0',
                                      whiteSpace: 'pre-wrap',
                                      display: 'inline-block'
                                    }}
                                  >
                                    {part.text}{' '}
                                  </span>
                                ))}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(139, 92, 246, 0.06)', borderRadius: '6px', fontSize: '0.72rem', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                  ✍️ Proposed Amendment Draft by {activeRedline.author_name}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>
                                  {new Date(activeRedline.updated_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p style={{ color: 'var(--foreground)', whiteSpace: 'pre-line', margin: 0 }}>
                              {clause.text_content}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeTab === 'chat' ? (
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
                  {/* Chat messages */}
                  <div className="chat-messages">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`chat-bubble ${msg.sender}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8 }}>
                            {msg.sender === 'user' ? 'You' : 'LeaseLogic AI'}
                          </span>
                          {msg.sender === 'assistant' && msg.text && (
                            <button 
                              onClick={() => speakBack(msg.text)} 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                              title="Listen to response"
                            >
                              🔊
                            </button>
                          )}
                        </div>
                        <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Bouncing Voice Wave Visualizer */}
                  {(isRecording || speechActive) && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                      <div className={`voice-wave active`}>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {isRecording ? 'Listening to your voice...' : 'Speaking answer...'}
                      </span>
                      {speechActive && (
                        <button onClick={stopSpeaking} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                          Stop Voice
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cross-Query Search Results Overlay Card */}
                  {crossQueryData && (
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                          🔍 Cross-Portfolio Search Synthesis ({crossQueryData.total_matches} Matched Leases)
                        </span>
                        <button onClick={() => setCrossQueryData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ✕ Clear
                        </button>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--foreground)', margin: '0 0 8px 0', fontWeight: 600 }}>
                        {crossQueryData.ai_summary}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                        {crossQueryData.results.map((res: any, idx: number) => (
                          <div key={idx} style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ fontWeight: 700 }}>📄 {res.property_name || res.filename}</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{res.match_count} Term Match(es)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat Input */}
                  <div className="chat-input-area">
                    <input 
                      type="text" 
                      placeholder="Ask a question..."
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                      className="chat-input"
                      disabled={isStreaming}
                    />
                    
                    {/* Voice Assistant Mic Button */}
                    <button 
                      onClick={toggleRecording} 
                      className={`btn ${isRecording ? 'btn-accent' : 'btn-secondary'}`}
                      style={{ padding: '8px', borderRadius: '50%', width: '40px', height: '40px' }}
                      title={isRecording ? 'Stop voice recording' : 'Talk to portfolio'}
                    >
                      <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>

                    <button 
                      onClick={() => handleRunCrossQuery(chatQuery)} 
                      disabled={loadingCrossQuery} 
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Run cross-portfolio natural language term search"
                    >
                      🤖 {loadingCrossQuery ? 'Searching...' : 'Cross-Query'}
                    </button>

                    <button 
                      onClick={() => sendChatMessage()} 
                      disabled={isStreaming} 
                      className="btn"
                      style={{ padding: '8px 16px' }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : activeTab === 'schedule' ? (
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Rent Projection & Payment Forecast</h3>
                    {rentProjection && (
                      <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontSize: '0.75rem', padding: '4px 8px' }}>
                        Currency: {rentProjection.currency}
                      </span>
                    )}
                  </div>

                  {loadingProjection ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generating rent schedule projections...</span>
                    </div>
                  ) : !rentProjection ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No rent data available. Verify initial rent and lease dates.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                      
                      {/* Multi-Currency & CPI Adjuster Control Bar */}
                      <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>🌐 Target FX Currency:</span>
                          <select 
                            value={targetCurrency}
                            onChange={(e) => setTargetCurrency(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '0.8rem' }}
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="JPY">JPY (¥)</option>
                            <option value="AUD">AUD (A$)</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>📈 Annual CPI Inflation %:</span>
                          <input 
                            type="number" 
                            value={cpiAnnualRate}
                            onChange={(e) => setCpiAnnualRate(parseFloat(e.target.value) || 0)}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '70px' }}
                          />
                        </div>

                        <button 
                          onClick={handleRunFxCpiAdjustment}
                          disabled={loadingFxCpi}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          {loadingFxCpi ? 'Converting...' : '⚡ Convert FX & CPI Projections'}
                        </button>

                        {fxCpiData && (
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <span>FX Rate: <strong>1 USD = {fxCpiData.fx_rate} {fxCpiData.target_currency}</strong></span>
                            <span>Converted Annual: <strong style={{ color: 'var(--success)' }}>{fxCpiData.currency_symbol}{fxCpiData.converted_initial_annual_rent.toLocaleString()}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Metric summary boxes */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                        <div className="glass" style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border)' }}>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Initial Rent (PA)</p>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                            {rentProjection.currency}{rentProjection.initial_rent_annual.toLocaleString()}
                          </h4>
                        </div>
                        <div className="glass" style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border)' }}>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Escalation Rule</p>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-all', lineHeight: 1.2 }}>
                            {rentProjection.escalation_type === 'percent' 
                              ? `+${rentProjection.escalation_rate}% Compound` 
                              : rentProjection.escalation_type === 'flat' 
                                ? `+${rentProjection.currency}${rentProjection.escalation_rate.toLocaleString()} Flat` 
                                : 'No Escalation'}
                          </h4>
                        </div>
                        <div className="glass" style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border)' }}>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Lease Duration</p>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{rentProjection.duration_years} Years</h4>
                        </div>
                        <div className="glass" style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border)' }}>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Cumulative Rent</p>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                            {rentProjection.currency}{rentProjection.total_rent_cumulative.toLocaleString()}
                          </h4>
                        </div>
                      </div>

                      {/* SVG Line/Area Chart */}
                      <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Projected Annual Rent Trend</h4>
                        <div style={{ position: 'relative', width: '100%', height: '220px' }}>
                          <svg viewBox="0 0 500 220" width="100%" height="100%" style={{ overflow: 'visible' }}>
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Render grid lines */}
                            {[0, 1, 2, 3, 4].map(idx => {
                              const y = 20 + idx * 40;
                              return (
                                <line 
                                  key={idx}
                                  x1="40" 
                                  y1={y} 
                                  x2="480" 
                                  y2={y} 
                                  stroke="rgba(0,0,0,0.05)" 
                                  strokeDasharray="4"
                                />
                              );
                            })}

                            {/* Render chart line paths */}
                            {(() => {
                              const points = rentProjection.schedule.map((p: any, idx: number) => {
                                const x = 40 + (idx / Math.max(1, rentProjection.schedule.length - 1)) * 440;
                                const maxRent = Math.max(...rentProjection.schedule.map((sp: any) => sp.annual_rent));
                                const minRent = Math.min(...rentProjection.schedule.map((sp: any) => sp.annual_rent));
                                const diff = maxRent - minRent || 1;
                                // Scale Y between 20 and 180
                                const y = 180 - ((p.annual_rent - minRent * 0.9) / (maxRent * 1.1 - minRent * 0.9)) * 160;
                                return { x, y, val: p.annual_rent, year: p.year, monthly: p.monthly_rent };
                              });

                              const linePath = points.map((pt: any, idx: number) => 
                                `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`
                              ).join(' ');

                              const areaPath = points.length > 0 
                                ? `${linePath} L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z` 
                                : '';

                              return (
                                <>
                                  {/* Area under the line */}
                                  {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

                                  {/* The trend line */}
                                  {linePath && <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" />}

                                  {/* Data points */}
                                  {points.map((pt: any, idx: number) => (
                                    <g key={idx}>
                                      <circle 
                                        cx={pt.x} 
                                        cy={pt.y} 
                                        r={activeChartYear === pt.year ? 7 : 4} 
                                        fill="var(--background)" 
                                        stroke="var(--primary)" 
                                        strokeWidth="2" 
                                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                                        onMouseEnter={() => setActiveChartYear(pt.year)}
                                        onMouseLeave={() => setActiveChartYear(null)}
                                      />
                                      {/* Axis year labels */}
                                      <text 
                                        x={pt.x} 
                                        y="200" 
                                        textAnchor="middle" 
                                        style={{ fontSize: '0.75rem', fill: 'var(--text-muted)' }}
                                      >
                                        Yr {pt.year}
                                      </text>
                                    </g>
                                  ))}

                                  {/* Interactive Tooltip Card overlay on hover */}
                                  {points.map((pt: any, idx: number) => {
                                    if (activeChartYear !== pt.year) return null;
                                    
                                    // Tooltip coordinates
                                    const tooltipX = pt.x > 250 ? pt.x - 130 : pt.x + 10;
                                    const tooltipY = pt.y - 45;

                                    return (
                                      <g key={`tooltip-${idx}`} style={{ pointerEvents: 'none' }}>
                                        <rect 
                                          x={tooltipX} 
                                          y={tooltipY} 
                                          width="120" 
                                          height="55" 
                                          rx="6" 
                                          fill="var(--background)" 
                                          stroke="var(--primary)" 
                                          strokeWidth="1"
                                          style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.06))' }}
                                        />
                                        <text x={tooltipX + 8} y={tooltipY + 16} style={{ fontSize: '0.7rem', fontWeight: 700, fill: 'var(--text-muted)' }}>
                                          Year {pt.year} Projection
                                        </text>
                                        <text x={tooltipX + 8} y={tooltipY + 32} style={{ fontSize: '0.75rem', fontWeight: 800, fill: 'var(--foreground)' }}>
                                          Annual: {rentProjection.currency}{pt.val.toLocaleString()}
                                        </text>
                                        <text x={tooltipX + 8} y={tooltipY + 46} style={{ fontSize: '0.7rem', fill: 'var(--text-muted)' }}>
                                          Monthly: {rentProjection.currency}{pt.monthly.toLocaleString()}
                                        </text>
                                      </g>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      </div>

                      {/* Detailed Schedule Table */}
                      <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '15px' }}>Yearly Payment Schedule Breakdowns</h4>
                        <table className="terms-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ width: '60px' }}>Year</th>
                              <th>Dates Range</th>
                              <th>Monthly Payments</th>
                              <th>Annual Rent</th>
                              <th>Cumulative Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rentProjection.schedule.map((item: any) => (
                              <tr key={item.year}>
                                <td style={{ fontWeight: 700 }}>Year {item.year}</td>
                                <td style={{ fontSize: '0.8rem' }}>
                                  {item.start_date} to {item.end_date}
                                </td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                  {rentProjection.currency}{item.monthly_rent.toLocaleString()}
                                </td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                                  {rentProjection.currency}{item.annual_rent.toLocaleString()}
                                </td>
                                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                  {rentProjection.currency}{item.cumulative_rent.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  )}
                </div>
              ) : activeTab === 'review' ? (
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', gap: '24px' }}>
                  {/* Part A: Term comments/reviewer notes */}
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                      <span>📝</span> Reviewer Comments & Term Notes
                    </h3>

                    {!selectedTerm ? (
                      <div className="glass" style={{ padding: '20px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                          Select a term from the <strong>Terms Sheet</strong> on the left to view notes and add reviewer comments.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Selected term summary header */}
                        <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.06)', borderLeft: '3px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Term</span>
                            <h4 style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)' }}>
                              {selectedTerm.term_name.split('_').join(' ')}
                            </h4>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status:</span>
                            <span style={{ marginLeft: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: selectedTerm.reviewer_status === 'approved' ? 'var(--success)' : 'var(--accent)' }}>
                              {selectedTerm.reviewer_status}
                            </span>
                          </div>
                        </div>

                        {/* Comments feed */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '6px' }}>
                          {loadingComments ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Loading comments...</p>
                          ) : termComments.length === 0 ? (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', padding: '12px', background: 'rgba(0,0,0,0.01)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                              No reviewer notes yet. Leave a note below.
                            </p>
                          ) : (
                            termComments.map((comment: any) => (
                              <div 
                                key={comment.id} 
                                style={{ 
                                  padding: '10px 12px', 
                                  borderRadius: '8px', 
                                  background: 'var(--background)', 
                                  border: '1px solid var(--border)',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                  fontSize: '0.82rem',
                                  lineHeight: 1.45
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '4px' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>👤</span> {comment.reviewer_name}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {new Date(comment.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p style={{ margin: 0, color: 'var(--foreground)', whiteSpace: 'pre-wrap' }}>
                                  {comment.comment_text}
                                </p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Comment Form */}
                        <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Reviewer Name</label>
                              <input 
                                type="text" 
                                value={reviewerName}
                                onChange={(e) => setReviewerName(e.target.value)}
                                placeholder="Your Name"
                                required
                                className="chat-input"
                                style={{ padding: '8px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent' }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Reviewer Note / Comment</label>
                              <textarea
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                placeholder="Write reviewer note/comment here..."
                                required
                                rows={2}
                                className="chat-input"
                                style={{ padding: '8px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', resize: 'vertical' }}
                              />
                            </div>
                          </div>
                          <button 
                            type="submit" 
                            className="btn" 
                            style={{ alignSelf: 'flex-end', padding: '6px 16px', fontSize: '0.8rem' }}
                          >
                            ➕ Add Reviewer Note
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  <hr style={{ border: 0, borderTop: '1px dashed var(--border)', margin: '4px 0' }} />

                  {/* Part B: Full Lease Revision History & Audit Trail */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                      <span>📜</span> Revision History & Audit Logs
                    </h3>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
                      {loadingAuditLogs ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading audit trail...</p>
                      ) : leaseAuditLogs.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>
                          No audit trail history registered for this lease.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '12px', borderLeft: '2px solid var(--border)', marginLeft: '8px', paddingTop: '8px', paddingBottom: '8px' }}>
                          {leaseAuditLogs.map((log: any) => {
                            let actionLabel = 'Action';
                            let actionColor = 'var(--primary)';
                            let description = '';

                            if (log.action === 'edit_term' || log.action === 'edit_value') {
                              actionLabel = '✏️ Value Edit';
                              actionColor = '#ea580c';
                              const oldV = JSON.parse(log.old_values || '{}');
                              const newV = JSON.parse(log.new_values || '{}');
                              description = `Updated term value to "${newV.extracted_value || ''}" (was "${oldV.extracted_value || ''}")`;
                            } else if (log.action === 'update_grounding') {
                              actionLabel = '🔗 Grounding';
                              actionColor = 'var(--primary)';
                              description = 'Re-mapped source clause text links inside Document Explorer';
                            } else if (log.action === 'add_comment') {
                              actionLabel = '💬 Note Added';
                              actionColor = 'var(--success)';
                              const newV = JSON.parse(log.new_values || '{}');
                              description = `${newV.reviewer_name || 'Reviewer'} left a note on ${newV.term_name ? newV.term_name.split('_').join(' ') : 'term'}`;
                            } else {
                              actionLabel = log.action;
                              description = `Modified table ${log.table_name}`;
                            }

                            return (
                              <div key={log.id} style={{ position: 'relative' }}>
                                {/* Timeline Dot indicator */}
                                <div style={{
                                  position: 'absolute',
                                  left: '-18px',
                                  top: '4px',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: actionColor,
                                  border: '2px solid var(--background)'
                                }} />
                                
                                <div style={{ paddingLeft: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: actionColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                      {actionLabel}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                      {new Date(log.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--foreground)', lineHeight: 1.45 }}>
                                    {description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeTab === 'effective' ? (
                /* activeTab === 'effective' */
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', gap: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                      <span>🌿</span> Lease Hierarchy & Net Effective Terms
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Consolidated terms sheets mapped across original parent leases and child amendments.
                    </p>
                  </div>

                  {loadingEffectiveTerms ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading net effective terms sheet...
                    </div>
                  ) : !effectiveTermsData ? (
                    <div className="glass" style={{ padding: '20px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                        Configure the document type and parent lease mapping on the left to evaluate Net Effective Terms.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Hierarchy Summary */}
                      <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)', fontSize: '0.82rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Hierarchy</span>
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {effectiveTermsData.leases.map((l: any, idx: number) => (
                            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: idx > 0 ? `${idx * 12}px` : '0' }}>
                              <span>{idx === 0 ? '📁' : '↳ 📄'}</span>
                              <strong style={{ color: l.id === selectedLease.id ? 'var(--primary)' : 'inherit' }}>{l.filename}</strong>
                              <span style={{ fontSize: '0.65rem', background: 'rgba(15, 23, 42, 0.05)', padding: '1px 6px', borderRadius: '4px', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                                {l.document_type.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Net Effective Comparison Grid */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Consolidated Terms Sheet</h4>
                        <table className="terms-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>Term Name</th>
                              <th>Original Value (Root Parent)</th>
                              <th>Net Effective (Amended)</th>
                              <th>Effective Source Document</th>
                            </tr>
                          </thead>
                          <tbody>
                            {effectiveTermsData.effective_terms.map((item: any) => (
                              <tr key={item.term_name}>
                                <td style={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize' }}>
                                  {item.term_name.replace(/_/g, ' ')}
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {item.original_value || <em style={{ color: '#ccc' }}>Not Extracted</em>}
                                </td>
                                <td style={{ fontSize: '0.8rem', fontWeight: item.is_amended ? 700 : 'normal', color: item.is_amended ? 'var(--primary)' : 'inherit' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{item.effective_value || <em style={{ color: '#ccc' }}>Not Extracted</em>}</span>
                                    {item.is_amended && (
                                      <span style={{ fontSize: '0.62rem', background: 'rgba(139, 92, 246, 0.12)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                        Amended
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} title={item.source_filename}>
                                  <span style={{ display: 'inline-block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.source_filename}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Timeline / History of Amendments */}
                      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '15px' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Chronological Override Timelines</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {effectiveTermsData.effective_terms.map((item: any) => {
                            if (item.history.length <= 1) return null;
                            return (
                              <div key={item.term_name} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.04)' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--foreground)' }}>
                                  {item.term_name.replace(/_/g, ' ')} Timeline
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                  {item.history.map((step: any, sIdx: number) => (
                                    <React.Fragment key={step.lease_id}>
                                      {sIdx > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>➔</span>}
                                      <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 10px', background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '6px', minWidth: '130px' }}>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={step.filename}>
                                          {step.filename}
                                        </span>
                                        <strong style={{ fontSize: '0.8rem', color: sIdx === item.history.length - 1 ? 'var(--primary)' : 'inherit', marginTop: '2px' }}>
                                          {step.value}
                                        </strong>
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'cam_audit' ? (
                /* activeTab === 'cam_audit' */
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', gap: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                      <span>💰</span> Common Area Maintenance (CAM) & Service Charge Reconciliation Audit
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Audit pro-rata tenant expense allocations against contractually agreed cap limits (e.g. 5% non-cumulative cap).
                    </p>
                  </div>

                  {/* Audit Input Form */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Building Total OpEx ($)</label>
                      <input 
                        type="number" 
                        value={camInputs.total_building_opex}
                        onChange={(e) => setCamInputs({ ...camInputs, total_building_opex: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Building Gross Area (Sq Ft)</label>
                      <input 
                        type="number" 
                        value={camInputs.building_gross_area_sqft}
                        onChange={(e) => setCamInputs({ ...camInputs, building_gross_area_sqft: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tenant Leased Area (Sq Ft)</label>
                      <input 
                        type="number" 
                        value={camInputs.tenant_leased_area_sqft}
                        onChange={(e) => setCamInputs({ ...camInputs, tenant_leased_area_sqft: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CAM Expense Cap %</label>
                      <input 
                        type="number" 
                        value={camInputs.cap_percentage}
                        onChange={(e) => setCamInputs({ ...camInputs, cap_percentage: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cap Calculation Structure</label>
                      <select 
                        value={camInputs.cap_type}
                        onChange={(e) => setCamInputs({ ...camInputs, cap_type: e.target.value })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem', background: '#ffffff' }}
                      >
                        <option value="non_cumulative">5% Non-Cumulative Cap</option>
                        <option value="cumulative">5% Cumulative Compounded Cap</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button onClick={handleRunCamAudit} disabled={loadingCamAudit} className="btn btn-primary" style={{ width: '100%', padding: '9px', fontSize: '0.82rem' }}>
                        {loadingCamAudit ? 'Auditing...' : '🔍 Audit Reconciliation'}
                      </button>
                    </div>
                  </div>

                  {/* Audit Results */}
                  {camAuditData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {/* Alert Card */}
                      <div style={{
                        padding: '16px',
                        borderRadius: '8px',
                        background: camAuditData.audit_status === 'OVERBILLING_ANOMALY_DETECTED' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: `1px solid ${camAuditData.audit_status === 'OVERBILLING_ANOMALY_DETECTED' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: camAuditData.audit_status === 'OVERBILLING_ANOMALY_DETECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: camAuditData.audit_status === 'OVERBILLING_ANOMALY_DETECTED' ? 'var(--error)' : 'var(--success)',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase'
                          }}>
                            {camAuditData.audit_status === 'OVERBILLING_ANOMALY_DETECTED' ? '⚠️ Overbilling Anomaly Detected' : '✅ Audit Passed Cleanly'}
                          </span>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '8px 0 2px 0' }}>
                            Pro-Rata Share: {camAuditData.pro_rata_share_pct}%
                          </h4>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                            {camAuditData.tenant_leased_area_sqft.toLocaleString()} Sq Ft leased out of {camAuditData.building_gross_area_sqft.toLocaleString()} Sq Ft total building area
                          </p>
                        </div>

                        {camAuditData.audit_status === 'OVERBILLING_ANOMALY_DETECTED' && (
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Disputed Overbill Amount</span>
                            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--error)', margin: 0 }}>
                              ${camAuditData.overbilled_anomaly_amount.toLocaleString()}
                            </h3>
                          </div>
                        )}
                      </div>

                      {/* Summary Metrics */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Uncapped Tenant Share</span>
                          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--foreground)', margin: '4px 0 0 0' }}>
                            ${camAuditData.uncapped_tenant_share.toLocaleString()}
                          </h4>
                        </div>

                        <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Contractual Cap Rule</span>
                          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', margin: '4px 0 0 0' }}>
                            {camAuditData.cap_rule}
                          </h4>
                        </div>

                        <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Max Allowed Capped Share</span>
                          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)', margin: '4px 0 0 0' }}>
                            ${camAuditData.max_allowed_share.toLocaleString()}
                          </h4>
                        </div>
                      </div>

                      {/* Line Item Table */}
                      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                        <table className="terms-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>OpEx Category</th>
                              <th style={{ textAlign: 'right' }}>Building Total Cost</th>
                              <th style={{ textAlign: 'right' }}>Tenant Pro-Rata Share ({camAuditData.pro_rata_share_pct}%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {camAuditData.line_items.map((item: any, idx: number) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{item.category}</td>
                                <td style={{ textAlign: 'right', fontSize: '0.8rem' }}>${item.building_cost.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>${item.tenant_share.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'esg' ? (
                /* activeTab === 'esg' */
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', gap: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                      <span>🌱</span> ESG & Green Lease Environmental Audit
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Evaluate lease agreement compliance against GRESB, BREEAM, and Energy Performance Certificate (EPC) sustainability standards.
                    </p>
                  </div>

                  {loadingEsgAudit ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Evaluating Green Lease compliance & ESG metrics...
                    </div>
                  ) : !esgAuditData ? (
                    <div className="glass" style={{ padding: '20px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                        Select a lease document on the left to view ESG compliance metrics.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Grade Banner */}
                      <div style={{
                        padding: '16px 20px',
                        borderRadius: '8px',
                        background: esgAuditData.esg_score >= 75 ? 'rgba(16, 185, 129, 0.08)' : esgAuditData.esg_score >= 50 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        border: `1px solid ${esgAuditData.esg_score >= 75 ? 'rgba(16, 185, 129, 0.25)' : esgAuditData.esg_score >= 50 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Overall ESG Rating</span>
                          <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '2px 0 0 0', color: esgAuditData.esg_score >= 75 ? 'var(--success)' : esgAuditData.esg_score >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                            Grade {esgAuditData.esg_grade}
                          </h2>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sustainability Index Score</span>
                          <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '2px 0 0 0', color: 'var(--foreground)' }}>
                            {esgAuditData.esg_score} / 100
                          </h2>
                        </div>
                      </div>

                      {/* 4 Pillar Breakdown */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {Object.entries(esgAuditData.compliance_categories).map(([key, cat]: [string, any]) => (
                          <div key={key} style={{ padding: '14px', background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>{cat.detail}</span>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                background: cat.status === 'COMPLIANT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: cat.status === 'COMPLIANT' ? 'var(--success)' : 'var(--warning)'
                              }}>
                                {cat.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)' }}>
                              Score: {cat.score} / {cat.max} pts
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Recommendations */}
                      {esgAuditData.recommendations.length > 0 && (
                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>🌱 Green Lease Upgrade Recommendations</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {esgAuditData.recommendations.map((rec: string, idx: number) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--foreground)' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>•</span> {rec}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : activeTab === 'negotiation' ? (
                /* activeTab === 'negotiation' */
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', gap: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                      <span>🤖</span> AI Lease Negotiation Copilot & Counter-Offer Generator
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Automated legal counter-proposal drafts and commercial negotiation strategies generated for high-risk covenants.
                    </p>
                  </div>

                  {loadingNegotiation ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Synthesizing legal counter-proposals and market negotiation scripts...
                    </div>
                  ) : !negotiationData ? (
                    <div className="glass" style={{ padding: '20px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                        Select a lease document on the left to generate negotiation counter-offers.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {negotiationData.counter_proposals.map((item: any, idx: number) => (
                        <div key={idx} style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.08)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                              {item.covenant_name}
                            </h4>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                              Counter-Proposal #{idx + 1}
                            </span>
                          </div>

                          <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.04)', fontSize: '0.8rem' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Original Extracted Covenant</span>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--foreground)' }}>{item.original_value}</p>
                          </div>

                          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.82rem' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase' }}>⚖️ Recommended Counter-Offer Clause</span>
                            <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: 'var(--foreground)' }}>{item.counter_proposal_text}</p>
                          </div>

                          <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.15)', fontSize: '0.78rem' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase' }}>💡 Negotiation Strategy & Market Talking Points</span>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--foreground)' }}>{item.negotiation_strategy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'sublease' ? (
                /* activeTab === 'sublease' */
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', gap: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                      <span>🏢</span> Sublease Rights & Secondary Space Monetization Calculator
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Evaluate tenant subletting covenanted rights, landlord profit share splits, and potential revenue from unutilized square footage.
                    </p>
                  </div>

                  {/* Calculator Form */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unutilized Vacant Space (Sq Ft)</label>
                      <input 
                        type="number" 
                        value={subleaseInputs.unutilized_sqft}
                        onChange={(e) => setSubleaseInputs({ ...subleaseInputs, unutilized_sqft: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Market Sublease Rent ($/Sq Ft)</label>
                      <input 
                        type="number" 
                        value={subleaseInputs.estimated_market_rate_sqft}
                        onChange={(e) => setSubleaseInputs({ ...subleaseInputs, estimated_market_rate_sqft: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button onClick={handleRunSubleaseAnalysis} disabled={loadingSublease} className="btn btn-primary" style={{ width: '100%', padding: '9px', fontSize: '0.82rem' }}>
                        {loadingSublease ? 'Calculating...' : '📊 Calculate Revenue'}
                      </button>
                    </div>
                  </div>

                  {/* Results */}
                  {subleaseData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {/* Governance Alert Card */}
                      <div style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        background: subleaseData.subletting_status === 'PROHIBITED' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: `1px solid ${subleaseData.subletting_status === 'PROHIBITED' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: subleaseData.subletting_status === 'PROHIBITED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: subleaseData.subletting_status === 'PROHIBITED' ? 'var(--error)' : 'var(--success)',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase'
                          }}>
                            {subleaseData.subletting_status.replace(/_/g, ' ')}
                          </span>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, margin: '6px 0 0 0', color: 'var(--foreground)' }}>
                            {subleaseData.governance_notes}
                          </p>
                        </div>
                      </div>

                      {/* Revenue Financial Summary */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div style={{ padding: '14px', background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Gross Annual Revenue</span>
                          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foreground)', margin: '4px 0 0 0' }}>
                            ${subleaseData.gross_annual_sublease_income.toLocaleString()}
                          </h3>
                        </div>

                        <div style={{ padding: '14px', background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Landlord Profit Share ({subleaseData.landlord_profit_share_pct}%)</span>
                          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)', margin: '4px 0 0 0' }}>
                            ${subleaseData.landlord_annual_profit_share.toLocaleString()}
                          </h3>
                        </div>

                        <div style={{ padding: '14px', background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tenant Net Retained Income</span>
                          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', margin: '4px 0 0 0' }}>
                            ${subleaseData.tenant_net_retained_annual_income.toLocaleString()}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'accounting' ? (
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', overflowY: 'auto' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>⚖️ IFRS 16 / ASC 842 Lease Accounting & Balance Sheet Calculator</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Automated Right-of-Use (ROU) Asset valuation, discounted lease liabilities, interest expense amortization, and monthly depreciation schedules.
                    </p>
                  </div>

                  {/* Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Discount Rate / Incremental Borrowing Rate (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={accountingParams.discount_rate_pct}
                        onChange={(e) => setAccountingParams({ ...accountingParams, discount_rate_pct: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lease Commitment Duration (Months)</label>
                      <input 
                        type="number" 
                        value={accountingParams.lease_term_months}
                        onChange={(e) => setAccountingParams({ ...accountingParams, lease_term_months: parseInt(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>
                    <button onClick={handleRunLeaseAccounting} disabled={loadingAccounting} className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '0.82rem' }}>
                      {loadingAccounting ? 'Calculating...' : '⚖️ Recalculate Balance Sheet'}
                    </button>
                  </div>

                  {/* Summary Cards */}
                  {accountingData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
                        <div style={{ background: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Initial ROU Asset</span>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--primary)' }}>${accountingData.rou_asset_initial.toLocaleString()}</h3>
                        </div>
                        <div style={{ background: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Initial Lease Liability</span>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--error)' }}>${accountingData.lease_liability_initial.toLocaleString()}</h3>
                        </div>
                        <div style={{ background: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Year 1 Interest Expense</span>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--warning)' }}>${accountingData.annual_first_year_interest.toLocaleString()}</h3>
                        </div>
                        <div style={{ background: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Monthly ROU Depreciation</span>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--foreground)' }}>${accountingData.monthly_depreciation.toLocaleString()}/mo</h3>
                        </div>
                      </div>

                      {/* Amortization Table */}
                      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, padding: '12px 16px', margin: 0, borderBottom: '1px solid rgba(15,23,42,0.06)', background: '#f8fafc' }}>
                          12-Month Lease Amortization & Depreciation Schedule
                        </h4>
                        <table className="terms-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th>Beg. Liability</th>
                              <th>Payment</th>
                              <th>Interest Exp.</th>
                              <th>Principal Red.</th>
                              <th>End. Liability</th>
                              <th>ROU Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accountingData.schedule.map((row: any, idx: number) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 700 }}>M{row.month}</td>
                                <td>${row.beginning_liability.toLocaleString()}</td>
                                <td>${row.payment.toLocaleString()}</td>
                                <td style={{ color: 'var(--warning)', fontWeight: 600 }}>${row.interest_expense.toLocaleString()}</td>
                                <td style={{ color: 'var(--success)', fontWeight: 600 }}>${row.principal_reduction.toLocaleString()}</td>
                                <td style={{ fontWeight: 700 }}>${row.ending_liability.toLocaleString()}</td>
                                <td style={{ color: 'var(--primary)', fontWeight: 600 }}>${row.rou_asset_balance.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'strategy' ? (
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', overflowY: 'auto' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>📈 AI Lease Renewal vs. Relocation Strategy Decision Matrix</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Comparative 5-year financial modeling contrasting stay & renew escalations against relocation market rates and tenant fit-out CAPEX.
                    </p>
                  </div>

                  {/* Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sub-Market Benchmark Rent ($/Sq Ft)</label>
                      <input 
                        type="number" 
                        value={strategyParams.market_rent_sqft}
                        onChange={(e) => setStrategyParams({ ...strategyParams, market_rent_sqft: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fit-Out CAPEX ($/Sq Ft)</label>
                      <input 
                        type="number" 
                        value={strategyParams.fitout_capex_sqft}
                        onChange={(e) => setStrategyParams({ ...strategyParams, fitout_capex_sqft: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Leased Space (Sq Ft)</label>
                      <input 
                        type="number" 
                        value={strategyParams.lease_sqft}
                        onChange={(e) => setStrategyParams({ ...strategyParams, lease_sqft: parseFloat(e.target.value) || 0 })}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                      />
                    </div>
                    <button onClick={handleRunRenewalStrategy} disabled={loadingStrategy} className="btn btn-accent" style={{ padding: '10px 16px', fontSize: '0.82rem' }}>
                      {loadingStrategy ? 'Evaluating...' : '📈 Evaluate Strategy'}
                    </button>
                  </div>

                  {/* Verdict & Financial Cards */}
                  {strategyData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Verdict Banner */}
                      <div style={{
                        padding: '16px 20px',
                        borderRadius: '8px',
                        background: strategyData.verdict === 'RECOMMEND_RENEWAL' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                        border: `1px solid ${strategyData.verdict === 'RECOMMEND_RENEWAL' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>AI Strategic Recommendation</span>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: strategyData.verdict === 'RECOMMEND_RENEWAL' ? 'var(--success)' : 'var(--primary)' }}>
                          {strategyData.verdict === 'RECOMMEND_RENEWAL' ? '✅ RECOMMEND RENEWAL & STAY' : '🚀 RECOMMEND RELOCATION'}
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--foreground)', margin: 0, lineHeight: 1.5 }}>
                          {strategyData.reasoning}
                        </p>
                      </div>

                      {/* Cards Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>5-Year Stay & Renew Cost</span>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--foreground)' }}>${strategyData.renewal_5yr_total.toLocaleString()}</h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assumes +3% annual escalation</span>
                        </div>

                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>5-Year Relocate & Fit-Out Cost</span>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--foreground)' }}>${strategyData.relocation_5yr_total.toLocaleString()}</h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Includes CAPEX: ${strategyData.fitout_capex_total.toLocaleString()}</span>
                        </div>

                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Net 5-Year Savings</span>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--success)' }}>${strategyData.net_savings_5yr.toLocaleString()}</h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>Optimal Strategy Benefit</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'spatial' ? (
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>📍 Geo-Spatial Micro-Market Rent & Location Analytics Hub</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        Geo-spatial location metrics, micro-market rent per sq ft benchmark comparisons, and transit accessibility scores.
                      </p>
                    </div>
                    <button onClick={handleFetchSpatialAnalytics} disabled={loadingSpatial} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                      {loadingSpatial ? 'Loading...' : '🔄 Refresh Location Data'}
                    </button>
                  </div>

                  {loadingSpatial ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Fetching geo-spatial micro-market location data...
                    </div>
                  ) : !spatialData ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Click Refresh Location Data to load spatial benchmarks.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Location Badge Banner */}
                      <div style={{
                        padding: '16px 20px',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sub-Market Geographic Zone</span>
                          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--primary)' }}>
                            📍 {spatialData.property_name} - {spatialData.submarket_zone}
                          </h2>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sub-Market Vacancy Rate</span>
                          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--foreground)' }}>{spatialData.submarket_vacancy_rate_pct}%</h4>
                        </div>
                      </div>

                      {/* Rent Benchmarks Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Current Lease Rate</span>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--foreground)' }}>${spatialData.current_rent_sqft}/sqft</h3>
                        </div>

                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sub-Market Benchmark</span>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--primary)' }}>${spatialData.submarket_benchmark_rent_sqft}/sqft</h3>
                        </div>

                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Transit Accessibility</span>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--success)' }}>{spatialData.transit_score} / 100</h3>
                        </div>

                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Walkability Score</span>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--success)' }}>{spatialData.walk_score} / 100</h3>
                        </div>
                      </div>

                      {/* Nearby Transit Hubs */}
                      <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.06)' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nearby Major Transit Nodes</h4>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {spatialData.nearby_transit_nodes.map((node: string, idx: number) => (
                            <span key={idx} style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
                              🚆 {node}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Cross-Lease Comparison Overlay Modal */}
      {isComparing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          animation: 'slideIn 0.25s ease'
        }}>
          <div className="glass" style={{
            width: '90vw',
            height: '85vh',
            maxWidth: '1200px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '30px',
            background: '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', paddingBottom: '15px' }}>
              <div>
                <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em' }}>Portfolio Analyzer</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'capitalize', marginTop: '4px' }}>
                  Comparing: {comparingTermName?.replace(/_/g, ' ')}
                </h2>
              </div>
              <button 
                onClick={() => { setIsComparing(false); setComparingTermName(null); setCompareData([]); }}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', borderRadius: '8px' }}
              >
                ✕ Close Analyzer
              </button>
            </div>

            <div style={{ flex: 1, overflowX: 'auto', display: 'flex', gap: '20px', paddingBottom: '10px', alignItems: 'stretch' }}>
              {compareData.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                  Loading comparative lease data...
                </div>
              ) : (
                compareData.map((item, idx) => {
                  const isCurrentSelected = item.lease_id === selectedLease?.id;
                  
                  return (
                    <div 
                      key={idx} 
                      className="glass" 
                      style={{ 
                        flex: '1 0 320px', 
                        maxWidth: '400px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        border: isCurrentSelected ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                        background: isCurrentSelected ? 'rgba(109, 40, 217, 0.01)' : 'var(--card-bg)',
                        boxShadow: isCurrentSelected ? '0 4px 20px rgba(109, 40, 217, 0.08)' : 'none',
                        transition: 'all 0.2s ease',
                        borderRadius: '12px',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Column Header */}
                      <div style={{ 
                        padding: '16px', 
                        background: isCurrentSelected ? 'rgba(109, 40, 217, 0.04)' : 'rgba(15, 23, 42, 0.01)', 
                        borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }} title={item.filename}>
                          {item.filename}
                        </h4>
                        {isCurrentSelected && (
                          <span className="badge badge-completed" style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem' }}>Active</span>
                        )}
                      </div>

                      {/* Column Content */}
                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                        {/* Extracted Value */}
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Extracted Value</span>
                          <div style={{ 
                            marginTop: '6px', 
                            padding: '12px', 
                            background: '#f8fafc', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(15, 23, 42, 0.04)',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            fontWeight: 500,
                            color: 'var(--foreground)'
                          }}>
                            {item.extracted_value}
                          </div>
                          <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className={`badge badge-${item.reviewer_status}`}>
                              {item.reviewer_status}
                            </span>
                          </div>
                        </div>

                        {/* Grounding Clause */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Grounding Source Clause</span>
                          <div style={{ 
                            flex: 1, 
                            padding: '12px', 
                            background: '#f8fafc', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(15, 23, 42, 0.04)',
                            fontSize: '0.82rem',
                            lineHeight: 1.6,
                            color: 'var(--text-muted)',
                            overflowY: 'auto',
                            maxHeight: '220px',
                            whiteSpace: 'pre-line'
                          }}>
                            {item.clauses && item.clauses.length > 0 ? (
                              item.clauses.map((clause: any, cIdx: number) => (
                                <div key={cIdx} style={{ marginBottom: cIdx < item.clauses.length - 1 ? '10px' : 0 }}>
                                  <p style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.75rem', marginBottom: '2px' }}>
                                    {clause.clause_number ? `Section ${clause.clause_number}` : ''} {clause.clause_title || ''} (Page {clause.page_number})
                                  </p>
                                  <p>{clause.text_content}</p>
                                </div>
                              ))
                            ) : (
                              <em style={{ color: 'var(--text-muted)' }}>No source clause link found</em>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
