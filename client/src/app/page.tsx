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
  
  // Views: 'workspace' | 'observability' | 'compliance'
  const [currentView, setCurrentView] = useState<'workspace' | 'observability' | 'compliance'>('workspace');
  
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

  // Tabs: 'abstract' | 'chat' | 'schedule'
  const [activeTab, setActiveTab] = useState<'abstract' | 'chat' | 'schedule'>('abstract');
  
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

  // Fetch Leases
  const fetchLeases = async () => {
    try {
      const res = await fetch(`${API_BASE}/leases`);
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
    fetchLeases();
    const interval = setInterval(fetchLeases, 3000);
    return () => clearInterval(interval);
  }, [selectedLease]);

  useEffect(() => {
    fetchStats();
    fetchCompliance();
    fetchRules();
    const interval = setInterval(() => {
      fetchStats();
      fetchCompliance();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
      } catch (err) {
        console.error('Error loading lease details:', err);
      }
    }
  };

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
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', gap: '8px', background: '#f8fafc' }}>
          <button 
            className={`btn ${currentView === 'workspace' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 4px', fontSize: '0.75rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('workspace')}
          >
            📂 Workspace
          </button>
          <button 
            className={`btn ${currentView === 'observability' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 4px', fontSize: '0.75rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('observability')}
          >
            📊 Analytics
          </button>
          <button 
            className={`btn ${currentView === 'compliance' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 4px', fontSize: '0.75rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('compliance')}
          >
            ⚖️ Compliance
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

          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Lease Portfolio</h3>
          
          <div className="card-list">
            {leases.map(lease => (
              <div 
                key={lease.id} 
                className={`lease-card glass ${selectedLease?.id === lease.id ? 'active' : ''}`}
                onClick={() => handleSelectLease(lease)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={lease.filename}>
                    {lease.filename}
                  </p>
                  <span className={`badge badge-${lease.status}`}>
                    {lease.status}
                  </span>
                </div>
                
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(lease.file_size / 1024 / 1024).toFixed(2)} MB
                </p>

                {lease.status === 'pending' && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span>Extracting clauses & terms...</span>
                      <span>{lease.job_progress || 0}%</span>
                    </div>
                    <div className="progress-container">
                      <div className="progress-bar" style={{ width: `${lease.job_progress || 0}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
        {currentView === 'compliance' ? (
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
              </div>

              {activeTab === 'abstract' ? (
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Original Lease Document Text</h4>
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                    {clauses.map(clause => {
                      // Check if this clause is referenced by the selected term
                      const isHighlighted = selectedTerm?.source_clause_ids?.includes(clause.id);
                      
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
                          </div>
                          <p style={{ color: 'var(--foreground)', whiteSpace: 'pre-line', margin: 0 }}>
                            {clause.text_content}
                          </p>
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
                      onClick={() => sendChatMessage()} 
                      disabled={isStreaming} 
                      className="btn"
                      style={{ padding: '8px 16px' }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
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
  </div>
);
}
