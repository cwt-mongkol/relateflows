import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Bot, Globe, Clock, MessageCircle, Save, Loader2, CheckCircle2, Power,
  Plus, Trash2, Sparkles, ChevronDown, ChevronUp, Zap, User, Building2,
} from 'lucide-react';

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PERSONALITY_OPTIONS = [
  { value: 'friendly', label: 'Friendly', desc: 'Warm, approachable, casual tone' },
  { value: 'professional', label: 'Professional', desc: 'Formal, polished, business-ready' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed, conversational, simple' },
  { value: 'helpful', label: 'Helpful', desc: 'Supportive, detailed, solution-oriented' },
  { value: 'custom', label: 'Custom', desc: 'Use custom instructions below' },
];

const STYLE_OPTIONS = [
  { value: 'concise', label: 'Concise', desc: 'Short, direct answers' },
  { value: 'balanced', label: 'Balanced', desc: 'Moderate detail' },
  { value: 'detailed', label: 'Detailed', desc: 'Thorough, in-depth responses' },
];

const LANG_OPTIONS = [
  { value: 'auto', label: 'Auto-detect', desc: 'Respond in user\'s language' },
  { value: 'th', label: 'ไทย', desc: 'Always respond in Thai' },
  { value: 'en', label: 'English', desc: 'Always respond in English' },
  { value: 'zn', label: '中文', desc: 'Always respond in Chinese' },
];

interface TimeSlot {
  start: string;
  end: string;
}

interface Schedule {
  [day: string]: TimeSlot[];
}

interface TenantCompany {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface ChatbotConfig {
  enabled: boolean;
  autoRespond: boolean;
  timezone: string;
  botName: string;
  personality: string;
  responseStyle: string;
  language: string;
  customInstructions: string;
  greetingMessage: string;
  fallbackMessage: string;
  schedule: Schedule;
}

const DEFAULT_CONFIG: ChatbotConfig = {
  enabled: false,
  autoRespond: false,
  timezone: 'Asia/Bangkok',
  botName: 'AI Assistant',
  personality: 'friendly',
  responseStyle: 'balanced',
  language: 'auto',
  customInstructions: '',
  greetingMessage: 'Hello! How can I help you today?',
  fallbackMessage: 'A human agent will get back to you shortly.',
  schedule: {
    monday: [{ start: '09:00', end: '18:00' }],
    tuesday: [{ start: '09:00', end: '18:00' }],
    wednesday: [{ start: '09:00', end: '18:00' }],
    thursday: [{ start: '09:00', end: '18:00' }],
    friday: [{ start: '09:00', end: '18:00' }],
    saturday: [],
    sunday: [],
  },
};

export const ChatbotSettings: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.roleId === 1;

  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CONFIG);
  const [scope, setScope] = useState<'tenant' | 'global'>('tenant');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  useEffect(() => {
    if (isSuperAdmin) {
      api.get<TenantCompany[]>('/api/admin/tenants')
        .then((data) => {
          setCompanies(data);
          if (data.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(data[0].id);
          }
        })
        .catch((err) => console.error('Failed to load companies:', err));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (scope === 'global') {
        params.set('scope', 'global');
      } else if (isSuperAdmin && selectedCompanyId) {
        params.set('companyId', selectedCompanyId);
      }
      const qs = params.toString();
      const data = await api.get<ChatbotConfig>(`/api/chat/settings${qs ? `?${qs}` : ''}`);
      setConfig({ ...DEFAULT_CONFIG, ...data });
    } catch {
      setConfig(DEFAULT_CONFIG);
    }
    setLoading(false);
  }, [scope, selectedCompanyId]);

  useEffect(() => { load(); }, [load]);

  const updateConfig = (patch: Partial<ChatbotConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const updateSchedule = (day: string, slots: TimeSlot[]) => {
    setConfig((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, [day]: slots },
    }));
    setSaved(false);
  };

  const addSlot = (day: string) => {
    const slots = config.schedule[day] || [];
    updateSchedule(day, [...slots, { start: '09:00', end: '18:00' }]);
  };

  const removeSlot = (day: string, idx: number) => {
    const slots = [...(config.schedule[day] || [])];
    slots.splice(idx, 1);
    updateSchedule(day, slots);
  };

  const updateSlot = (day: string, idx: number, field: 'start' | 'end', value: string) => {
    const slots = [...(config.schedule[day] || [])];
    slots[idx] = { ...slots[idx], [field]: value };
    updateSchedule(day, slots);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { scope, config };
      if (isSuperAdmin && scope !== 'global' && selectedCompanyId) {
        body.companyId = selectedCompanyId;
      }
      await api.put('/api/chat/settings', body);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save chatbot settings:', err);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Chatbot</span>
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Chatbot Settings</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Configure your AI chatbot personality, schedule, and auto-respond behavior
        </p>
        <span className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
          {isSuperAdmin ? (
            <>
              <button onClick={() => setScope(scope === 'tenant' ? 'global' : 'tenant')}
                className="flex items-center gap-1 hover:text-slate-800 transition-colors">
                {scope === 'global' ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                {scope === 'global' ? 'Global' : 'Per Company'}
              </button>
              {scope === 'tenant' && companies.length > 0 && (
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="ml-1 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} className="text-slate-800">{c.name}</option>
                  ))}
                  </select>
                )}
              </>
            ) : (
              <><User className="w-3 h-3" /> This Company</>
            )}
          </span>
      </div>

      {/* Main Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${config.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Enable Chatbot</h4>
              <p className="text-[11px] text-slate-500">{config.enabled ? 'Chatbot is active' : 'Chatbot is disabled'}</p>
            </div>
          </div>
          <button
            onClick={() => updateConfig({ enabled: !config.enabled })}
            className={`relative w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${config.enabled ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${config.autoRespond ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Auto-Respond</h4>
              <p className="text-[11px] text-slate-500">Auto-reply to customer messages when within schedule</p>
            </div>
          </div>
          <button
            onClick={() => updateConfig({ autoRespond: !config.autoRespond })}
            className={`relative w-12 h-6 rounded-full transition-colors ${config.autoRespond ? 'bg-blue-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${config.autoRespond ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bot Personality */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-900">Bot Personality</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Bot Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Bot Name</label>
            <input
              value={config.botName}
              onChange={(e) => updateConfig({ botName: e.target.value })}
              placeholder="e.g. Sales Assistant, CS Bot"
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          {/* Language */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Response Language</label>
            <select
              value={config.language}
              onChange={(e) => updateConfig({ language: e.target.value })}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              {LANG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
              ))}
            </select>
          </div>

          {/* Personality */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Personality / Tone</label>
            <div className="space-y-1.5">
              {PERSONALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateConfig({ personality: opt.value })}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    config.personality === opt.value
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className={`text-[10px] font-medium ${config.personality === opt.value ? 'text-indigo-500' : 'text-slate-400'}`}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Response Style */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Response Style</label>
            <div className="space-y-1.5">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateConfig({ responseStyle: opt.value })}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    config.responseStyle === opt.value
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className={`text-[10px] font-medium ${config.responseStyle === opt.value ? 'text-indigo-500' : 'text-slate-400'}`}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="mt-4">
          <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
            Custom Instructions {config.personality !== 'custom' && <span className="text-slate-300 font-normal">(optional — applies regardless of personality above)</span>}
          </label>
          <textarea
            value={config.customInstructions}
            onChange={(e) => updateConfig({ customInstructions: e.target.value })}
            placeholder="e.g. Always mention our promotion, Never share pricing without authorization, Use Thai language first..."
            rows={3}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-extrabold text-slate-900">Operating Schedule</h4>
            <p className="text-[10px] text-slate-500">When the chatbot is available to auto-respond</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Globe className="w-3 h-3" />
            <select
              value={config.timezone}
              onChange={(e) => updateConfig({ timezone: e.target.value })}
              className="text-[10px] font-bold bg-transparent border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none"
            >
              <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
              <option value="America/New_York">America/New_York (UTC-5)</option>
              <option value="America/Chicago">America/Chicago (UTC-6)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
              <option value="Europe/London">Europe/London (UTC+0)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          {DAY_ORDER.map((day) => {
            const slots = config.schedule[day] || [];
            const isExpanded = expandedDay === day;
            return (
              <div key={day} className="border border-slate-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${slots.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                      {DAY_LABELS[day]}
                    </span>
                    {slots.length > 0 ? (
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {slots.map((s) => `${s.start}-${s.end}`).join(', ')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Off</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2 border-t border-slate-50 pt-2">
                    {slots.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-2">No operating hours for {DAY_LABELS[day]}</p>
                    )}
                    {slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateSlot(day, idx, 'start', e.target.value)}
                          className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                        />
                        <span className="text-[10px] text-slate-400">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateSlot(day, idx, 'end', e.target.value)}
                          className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                        />
                        <button onClick={() => removeSlot(day, idx)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addSlot(day)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                      <Plus className="w-3 h-3" /> Add time range
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <MessageCircle className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-900">Auto-Response Messages</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Greeting Message</label>
            <textarea
              value={config.greetingMessage}
              onChange={(e) => updateConfig({ greetingMessage: e.target.value })}
              rows={3}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Fallback Message</label>
            <textarea
              value={config.fallbackMessage}
              onChange={(e) => updateConfig({ fallbackMessage: e.target.value })}
              rows={3}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Settings
        </button>
      </div>
    </div>
  );
};