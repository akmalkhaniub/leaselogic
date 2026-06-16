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
  
  // Views: 'workspace' | 'observability'
  const [currentView, setCurrentView] = useState<'workspace' | 'observability'>('workspace');
  
  // Observability stats state
  const [stats, setStats] = useState<any>(null);

  // Tabs: 'abstract' | 'chat'
  const [activeTab, setActiveTab] = useState<'abstract' | 'chat'>('abstract');
  
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

  useEffect(() => {
    fetchLeases();
    const interval = setInterval(fetchLeases, 3000);
    return () => clearInterval(interval);
  }, [selectedLease]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
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
            style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('workspace')}
          >
            📂 Workspace
          </button>
          <button 
            className={`btn ${currentView === 'observability' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '6px' }}
            onClick={() => setCurrentView('observability')}
          >
            📊 Analytics
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
            {currentView === 'observability' ? (
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

        {/* Workspace Dashboard vs Observability Dashboard */}
        {currentView === 'observability' ? (
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
                              {editingTerm === term.id ? (
                                <button onClick={() => saveEdit(term)} className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Save</button>
                              ) : (
                                <button onClick={() => startEdit(term)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                              )}
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

            {/* Split Screen Right: Explorer / Chat */}
            <div className="pane">
              <div className="tabs">
                <div className={`tab ${activeTab === 'abstract' ? 'active' : ''}`} onClick={() => setActiveTab('abstract')}>
                  Document Explorer
                </div>
                <div className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                  Compliance Q&A
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
                          style={{ marginBottom: '16px', fontSize: '0.85rem', lineHeight: 1.6 }}
                        >
                          {(clause.clause_number || clause.clause_title) && (
                            <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                              Page {clause.page_number} - {clause.clause_number ? `Section ${clause.clause_number}` : ''} {clause.clause_title || ''}
                            </p>
                          )}
                          <p style={{ color: isHighlighted ? '#ffffff' : 'var(--text-muted)', whiteSpace: 'pre-line' }}>
                            {clause.text_content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
