import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import type { WorkflowTriggerType, WebhookDelivery } from '../../types/crm';
import { TRIGGER_TYPES } from '../../data/workflowMeta';
import {
  Zap,
  Plus,
  ArrowRight,
  Activity,
  Gauge,
  Webhook,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type SubTab = 'workflows' | 'scoring' | 'webhooks';

const STATUS_BADGE: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-slate-100 text-slate-600',
  retrying: 'bg-amber-100 text-amber-700',
  failed: 'bg-rose-100 text-rose-700',
};

export const WorkflowsView: React.FC = () => {
  const { isLoading, workflows, toggleWorkflowStatus, setIsAddWorkflowModalOpen } = useCRM();
  const { t } = useSettings();
  const [subTab, setSubTab] = useState<SubTab>('workflows');

  const totalExecutions = workflows.reduce((acc, w) => acc + w.executionsCount, 0);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="skeleton h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-48 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Engine Overview Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
            <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
            RelateFlows Smart Automation Engine
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Automate Sales & Lead Workflows</h2>
          <p className="text-slate-500 text-xs leading-relaxed">
            Eliminate repetitive tasks. Automatically route deals, send onboarding emails, escalate high-score leads, and trigger Slack notifications.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400 font-semibold">Total Execution Runs</p>
            <p className="text-2xl font-extrabold text-blue-600">{totalExecutions.toLocaleString()}</p>
          </div>

          {subTab === 'workflows' && (
            <button
              onClick={() => setIsAddWorkflowModalOpen(true)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Workflow</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-slate-100 rounded-xl p-1 inline-flex items-center gap-0.5">
        {([
          { key: 'workflows', label: 'Workflows', icon: <Zap className="w-3.5 h-3.5" /> },
          { key: 'scoring', label: 'Lead Scoring', icon: <Gauge className="w-3.5 h-3.5" /> },
          { key: 'webhooks', label: 'Webhooks', icon: <Webhook className="w-3.5 h-3.5" /> },
        ] as { key: SubTab; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {subTab === 'workflows' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className={`bg-white rounded-2xl border ${
                wf.status === 'active' ? 'border-blue-200 shadow-sm' : 'border-slate-200 opacity-75'
              } p-6 space-y-4 hover:shadow-md transition-all duration-200 relative overflow-hidden`}
            >
              {/* Top Bar: Title, Category, Toggle */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
                    wf.status === 'active' ? 'bg-yellow-500 rf-yellow-glow' : 'bg-slate-400'
                  }`}>
                    <Zap className="w-5 h-5 fill-current" />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{wf.title}</h3>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {wf.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    wf.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {wf.status === 'active' ? t('status.active').toUpperCase() : t('status.paused').toUpperCase()}
                  </span>

                  <input
                    type="checkbox"
                    checked={wf.status === 'active'}
                    onChange={() => toggleWorkflowStatus(wf.id)}
                    className="toggle toggle-primary toggle-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {wf.description}
              </p>

              {/* Visual Workflow Nodes Flow Diagram */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Trigger Node */}
                <div className="w-full sm:w-1/2 p-2.5 rounded-lg bg-white border border-blue-200 shadow-2xs">
                  <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block mb-0.5">
                    WHEN (Trigger)
                  </span>
                  <p className="font-bold text-slate-800 text-xs truncate">{wf.trigger}</p>
                </div>

                <ArrowRight className="w-4 h-4 text-yellow-500 shrink-0 hidden sm:block stroke-[2.5]" />

                {/* Action Node */}
                <div className="w-full sm:w-1/2 p-2.5 rounded-lg bg-white border border-yellow-200 shadow-2xs">
                  <span className="text-[9px] font-extrabold text-yellow-600 uppercase tracking-wider block mb-0.5">
                    THEN (Action)
                  </span>
                  <p className="font-bold text-slate-800 text-xs truncate">{wf.action}</p>
                </div>
              </div>

              {/* Footer Metrics */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1 font-medium">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  {wf.executionsCount} total executions
                </span>
                <span className="font-semibold text-slate-600">Last triggered: {wf.lastExecuted}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'scoring' && <LeadScoringPanel />}
      {subTab === 'webhooks' && <WebhooksPanel />}
    </div>
  );
};

const LeadScoringPanel: React.FC = () => {
  const { leadScoringRules, addLeadScoringRule, toggleLeadScoringRule, deleteLeadScoringRule } = useCRM();
  const { addToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [eventType, setEventType] = useState<WorkflowTriggerType>('lead.created');
  const [points, setPoints] = useState(10);

  const handleAdd = async () => {
    if (!label.trim()) return;
    try {
      await addLeadScoringRule({ label: label.trim(), eventType, points, status: 'active' });
      setLabel('');
      setPoints(10);
      setShowAdd(false);
    } catch (err) {
      addToast('Could not create scoring rule.', 'error');
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900">Lead Scoring Rules</h4>
          <p className="text-xs text-slate-500 mt-0.5">Each rule adds (or subtracts) points on <code className="bg-slate-100 px-1 rounded text-[10px]">leads.lead_score</code> when its event fires. 70+ is HOT, 40-69 WARM, below is COLD.</p>
        </div>
      </div>

      <div className="space-y-2">
        {leadScoringRules.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No scoring rules yet.</p>}
        {leadScoringRules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${rule.points >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {rule.points >= 0 ? '+' : ''}{rule.points}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{rule.label}</p>
              <p className="text-[10px] text-slate-400 font-mono">{rule.eventType}</p>
            </div>
            <input
              type="checkbox"
              checked={rule.status === 'active'}
              onChange={() => toggleLeadScoringRule(rule.id)}
              className="toggle toggle-primary toggle-sm"
            />
            <button onClick={() => deleteLeadScoringRule(rule.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Rule label, e.g. Lead requested pricing" className="w-full text-xs font-bold bg-white border border-blue-300 rounded-lg px-3 py-2 focus:outline-none" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <select value={eventType} onChange={(e) => setEventType(e.target.value as WorkflowTriggerType)} className="text-xs font-bold bg-white border border-blue-300 rounded-lg px-3 py-2 focus:outline-none">
              {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} placeholder="Points" className="text-xs font-bold bg-white border border-blue-300 rounded-lg px-3 py-2 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!label.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all">Add Rule</button>
            <button onClick={() => setShowAdd(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-3 py-2 rounded-lg transition-all">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 text-xs font-bold transition-all">
          <Plus className="w-4 h-4" /> Add Scoring Rule
        </button>
      )}
    </div>
  );
};

const WebhooksPanel: React.FC = () => {
  const { webhooks, addWebhook, toggleWebhook, deleteWebhook, getWebhookDeliveries, retryWebhookDelivery } = useCRM();
  const { addToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<WorkflowTriggerType>('deal.won');
  const [targetUrl, setTargetUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !targetUrl.trim()) return;
    try {
      await addWebhook({ name: name.trim(), eventType, targetUrl: targetUrl.trim(), secret: secret.trim() || undefined });
      setName(''); setTargetUrl(''); setSecret(''); setShowAdd(false);
    } catch (err) {
      addToast('Could not create webhook — check the URL.', 'error');
      console.error(err);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setLoadingDeliveries(true);
    setDeliveries(await getWebhookDeliveries(id));
    setLoadingDeliveries(false);
  };

  const handleRetry = async (webhookId: string, deliveryId: string) => {
    try {
      await retryWebhookDelivery(webhookId, deliveryId);
      setDeliveries(await getWebhookDeliveries(webhookId));
      addToast('Retry attempted.', 'success');
    } catch (err) {
      addToast('Retry failed to send.', 'error');
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div>
        <h4 className="text-sm font-extrabold text-slate-900">Outbound Webhooks</h4>
        <p className="text-xs text-slate-500 mt-0.5">Push RelateFlows events to n8n, an ERP, or any HTTPS endpoint — signed with HMAC, retried on failure.</p>
      </div>

      <div className="space-y-2">
        {webhooks.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No webhooks yet.</p>}
        {webhooks.map((wh) => (
          <div key={wh.id} className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 p-3 group">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Webhook className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{wh.name}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{wh.eventType} → {wh.targetUrl}</p>
              </div>
              <button onClick={() => toggleExpand(wh.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                {expandedId === wh.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <input
                type="checkbox"
                checked={wh.status === 'active'}
                onChange={() => toggleWebhook(wh.id)}
                className="toggle toggle-primary toggle-sm"
              />
              <button onClick={() => deleteWebhook(wh.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {expandedId === wh.id && (
              <div className="border-t border-slate-200 bg-white p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recent Deliveries</p>
                {loadingDeliveries && <p className="text-xs text-slate-400">Loading…</p>}
                {!loadingDeliveries && deliveries.length === 0 && <p className="text-xs text-slate-400">No deliveries yet.</p>}
                {!loadingDeliveries && deliveries.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-[11px] py-1.5 border-b border-slate-50 last:border-0">
                    <span className={`px-2 py-0.5 rounded-full font-extrabold text-[9px] ${STATUS_BADGE[d.status] || 'bg-slate-100 text-slate-600'}`}>{d.status.toUpperCase()}</span>
                    <span className="text-slate-500">{d.eventType}</span>
                    <span className="text-slate-400">{d.lastStatusCode ? `HTTP ${d.lastStatusCode}` : d.lastError}</span>
                    <span className="text-slate-300 ml-auto">{new Date(d.createdAt).toLocaleString()}</span>
                    {(d.status === 'failed' || d.status === 'retrying') && (
                      <button onClick={() => handleRetry(wh.id, d.id)} className="p-1 rounded text-blue-500 hover:bg-blue-50">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Webhook name, e.g. n8n — deal won" className="w-full text-xs font-bold bg-white border border-blue-300 rounded-lg px-3 py-2 focus:outline-none" autoFocus />
          <select value={eventType} onChange={(e) => setEventType(e.target.value as WorkflowTriggerType)} className="w-full text-xs font-bold bg-white border border-blue-300 rounded-lg px-3 py-2 focus:outline-none">
            {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://your-endpoint.example.com/webhook" className="w-full text-xs font-bold bg-white border border-blue-300 rounded-lg px-3 py-2 focus:outline-none" />
          <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Signing secret (optional)" className="w-full text-xs font-bold bg-white border border-blue-300 rounded-lg px-3 py-2 focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!name.trim() || !targetUrl.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all">Add Webhook</button>
            <button onClick={() => setShowAdd(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-3 py-2 rounded-lg transition-all">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 text-xs font-bold transition-all">
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      )}
    </div>
  );
};
