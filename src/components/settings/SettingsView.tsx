import React, { useState, useEffect, useCallback } from 'react';
import { useSettings, type IntegrationKeys } from '../../context/SettingsContext';
import { useCRM } from '../../context/CRMContext';
import { Bot, Palette, CheckCircle2, Save, Globe, Sun, Moon, Monitor, Sliders, Kanban, Plus, X, Edit3, Key, MessageCircle, MessageSquare, Eye, EyeOff, Shield, Users, Radio, Lock, Building2, Loader2, Database, Mail, Phone, Headphones } from 'lucide-react';
import { STAGE_COLORS } from '../../data/mockData';
import type { SettingsTab } from '../../types/crm';
import { usePermissions } from '../../lib/permissions';
import { api } from '../../lib/api';
import type { TenantCompany } from '../../types/crm';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';
import { ChannelManagement } from './ChannelManagement';
import { AccessControl } from './AccessControl';
import { CustomObjectsManager } from './CustomObjectsManager';
import { ChatbotSettings } from './ChatbotSettings';
import { CsAdminSettings } from './CsAdminSettings';
import { LeadAllocationSettings } from './LeadAllocationSettings';

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: 'General', icon: <Sliders className="w-3.5 h-3.5" /> },
  { key: 'users', label: 'Users', icon: <Users className="w-3.5 h-3.5" /> },
  { key: 'roles', label: 'Roles', icon: <Shield className="w-3.5 h-3.5" /> },
  { key: 'channels', label: 'Channels', icon: <Radio className="w-3.5 h-3.5" /> },
  { key: 'access', label: 'Access', icon: <Lock className="w-3.5 h-3.5" /> },
  { key: 'chatbot', label: 'Chatbot', icon: <Bot className="w-3.5 h-3.5" /> },
  { key: 'cs-admin', label: 'CS Admin', icon: <Headphones className="w-3.5 h-3.5" /> },
  { key: 'lead-allocation', label: 'Lead Allocation', icon: <Users className="w-3.5 h-3.5" /> },
  { key: 'integrations', label: 'Integrations', icon: <Key className="w-3.5 h-3.5" /> },
  { key: 'companies', label: 'Companies', icon: <Building2 className="w-3.5 h-3.5" /> },
  { key: 'custom-objects', label: 'Custom Objects', icon: <Database className="w-3.5 h-3.5" /> },
];

export const SettingsView: React.FC = () => {
  const { t, language, setLanguage, theme, setTheme, primaryColor, setPrimaryColor, accentColor, setAccentColor, saveSettings, savedSuccess } = useSettings();
  const { stages, addStage, renameStage, deleteStage } = useCRM();
  const { canSettingsTab, roleName } = usePermissions();
  const visibleTabs = TABS.filter(t => canSettingsTab(t.key));
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);
  const [showNewStage, setShowNewStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // Redirect if active tab is not visible
  useEffect(() => {
    if (visibleTabs.length > 0 && !canSettingsTab(activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [activeTab, visibleTabs, canSettingsTab]);

  const usedColors = stages.map((s) => s.color);

  const handleAddStage = () => {
    if (!newStageLabel.trim()) return;
    const id = newStageLabel.toLowerCase().replace(/\s+/g, '_');
    addStage({ id, label: newStageLabel.trim(), color: newStageColor });
    setNewStageLabel('');
    setNewStageColor(STAGE_COLORS[0]);
    setShowNewStage(false);
  };

  const handleRename = (id: string) => {
    if (!editLabel.trim()) return;
    renameStage(id, editLabel.trim());
    setEditingStageId(null);
    setEditLabel('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settings</span>
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('settings.title')}</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md">{t('settings.subtitle')}</p>
        <span className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
          <Shield className="w-3 h-3" />
          {roleName}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5">
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Language */}
          <div className="md:col-span-1 md:row-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">{t('settings.language')}</h4>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {(['en', 'th', 'zn'] as const).map((lang) => (
                <button key={lang} onClick={() => setLanguage(lang)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold border transition-all ${
                    language === lang ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50'
                  }`}>
                  <span className="text-lg">{lang === 'en' ? '🇬🇧' : lang === 'th' ? '🇹🇭' : '🇨🇳'}</span>
                  <div className="text-left">
                    <p className="font-bold text-sm">{lang === 'en' ? 'English' : lang === 'th' ? 'ภาษาไทย' : '中文'}</p>
                    <p className={`text-[10px] font-medium ${language === lang ? 'text-blue-200' : 'text-slate-400'}`}>{lang === 'en' ? 'English' : lang === 'th' ? 'ไทย' : '简体中文'}</p>
                  </div>
                  {language === lang && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">{t('settings.theme')}</h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button key={mode} onClick={() => setTheme(mode)}
                  className={`flex flex-col items-center gap-2 px-4 py-5 rounded-xl text-xs font-bold border transition-all ${
                    theme === mode ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50'
                  }`}>
                  {mode === 'light' ? <Sun className="w-6 h-6" /> : mode === 'dark' ? <Moon className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                  <span>{mode === 'light' ? t('theme.light') : mode === 'dark' ? t('theme.dark') : t('theme.system')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Colors */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">{t('brand.palette')}</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2 hover:border-blue-300 transition-all">
                <label className="text-xs font-bold text-slate-700 block">{t('brand.primary')}</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-blue-200">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-12 -m-1 cursor-pointer" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 uppercase">{primaryColor}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50/50 space-y-2 hover:border-yellow-300 transition-all">
                <label className="text-xs font-bold text-slate-700 block">{t('brand.accent')}</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-yellow-200">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-12 h-12 -m-1 cursor-pointer" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 uppercase">{accentColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Pipeline Stages */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Kanban className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Sales Pipeline Stages</h4>
            </div>
            <div className="space-y-2.5">
              {stages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  {editingStageId === stage.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1 text-xs font-bold bg-white border border-blue-300 rounded-lg px-2 py-1 focus:outline-none" autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(stage.id); if (e.key === 'Escape') setEditingStageId(null); }} />
                      <button onClick={() => handleRename(stage.id)} className="p-1 text-blue-600 hover:text-blue-800"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingStageId(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-xs font-bold text-slate-800">{stage.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{stage.color}</span>
                      <button onClick={() => { setEditingStageId(stage.id); setEditLabel(stage.label); }} className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteStage(stage.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {showNewStage ? (
              <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                <input value={newStageLabel} onChange={(e) => setNewStageLabel(e.target.value)} placeholder="Stage name..." className="w-full text-xs font-bold bg-white border border-blue-300 rounded-lg px-3 py-2 focus:outline-none" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddStage(); if (e.key === 'Escape') setShowNewStage(false); }} />
                <div className="flex flex-wrap gap-1.5">
                  {STAGE_COLORS.map((color) => {
                    const isUsed = usedColors.includes(color);
                    return (<button key={color} onClick={() => !isUsed && setNewStageColor(color)} disabled={isUsed}
                      className={`w-6 h-6 rounded-full transition-all ${newStageColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''} ${isUsed ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }} />);
                  })}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddStage} disabled={!newStageLabel.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all">Add</button>
                  <button onClick={() => setShowNewStage(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-3 py-2 rounded-lg transition-all">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewStage(true)} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 text-xs font-bold transition-all">
                <Plus className="w-4 h-4" /> Add Stage
              </button>
            )}
          </div>

          {/* Save Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
            <div className={`transition-all duration-300 ${savedSuccess ? 'scale-100 opacity-100' : 'scale-90 opacity-0 h-0 overflow-hidden'}`}>
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-emerald-600">{t('settings.saved')}</p>
              </div>
            </div>
            <div className={`transition-all duration-300 ${savedSuccess ? 'scale-90 opacity-0 h-0 overflow-hidden' : 'scale-100 opacity-100'}`}>
              <p className="text-[10px] text-slate-400 mb-4">{t('settings.save')}</p>
            </div>
            <button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-md flex items-center gap-2 transition-all hover:scale-105 w-full justify-center">
              <Save className="w-4 h-4" /> <span>{t('settings.save')}</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'roles' && <RoleManagement />}
      {activeTab === 'channels' && <ChannelManagement />}
      {activeTab === 'access' && <AccessControl />}

      {activeTab === 'integrations' && (
        <>
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-yellow-600" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Credentials</span>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('integrations.title')}</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">{t('integrations.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <IntegrationCard icon={<MessageSquare className="w-4 h-4" />} iconBg="bg-red-100 text-red-600" title={t('integrations.google')} desc={t('integrations.google.desc')}
              fields={[
                { key: 'googleClientId', label: t('integrations.google.clientId'), placeholder: 'xxx.apps.googleusercontent.com' },
                { key: 'googleClientSecret', label: t('integrations.google.clientSecret'), placeholder: 'GOCSPX-...' },
              ]}
            />
            <IntegrationCard icon={<MessageCircle className="w-4 h-4" />} iconBg="bg-green-100 text-green-600" title={t('integrations.line')} desc={t('integrations.line.desc')}
              fields={[
                { key: 'lineChannelAccessToken', label: t('integrations.line.token'), placeholder: 'your-channel-access-token' },
                { key: 'lineChannelSecret', label: t('integrations.line.secret'), placeholder: 'your-channel-secret' },
              ]}
            />
            <IntegrationCard icon={<MessageCircle className="w-4 h-4" />} iconBg="bg-blue-100 text-blue-600" title={t('integrations.facebook')} desc={t('integrations.facebook.desc')}
              fields={[
                { key: 'fbAppId', label: t('integrations.facebook.appId'), placeholder: '1234567890' },
                { key: 'fbAppSecret', label: t('integrations.facebook.appSecret'), placeholder: 'your-app-secret' },
                { key: 'fbPageAccessToken', label: t('integrations.facebook.pageToken'), placeholder: 'EAAx...' },
                { key: 'fbPageId', label: t('integrations.facebook.pageId'), placeholder: '1234567890' },
              ]}
            />
            <IntegrationCard icon={<MessageSquare className="w-4 h-4" />} iconBg="bg-pink-100 text-pink-600" title={t('integrations.instagram')} desc={t('integrations.instagram.desc')}
              fields={[
                { key: 'instagramBusinessId', label: t('integrations.instagram.businessId'), placeholder: '1784...' },
                { key: 'instagramAccessToken', label: t('integrations.instagram.token'), placeholder: 'IGQVJ...' },
              ]}
            />
          </div>
        </>
      )}

      {activeTab === 'chatbot' && (
        <ChatbotSettings />
      )}

      {activeTab === 'cs-admin' && (
        <CsAdminSettings />
      )}

      {activeTab === 'lead-allocation' && (
        <LeadAllocationSettings />
      )}

      {activeTab === 'companies' && (
        <CompanyManager />
      )}

      {activeTab === 'custom-objects' && (
        <CustomObjectsManager />
      )}
    </div>
  );
};

const CompanyManager: React.FC = () => {
  const { roleId } = usePermissions();
  const isSuperAdmin = roleId === 1;

  if (isSuperAdmin) return <SuperAdminCompanyManager />;
  return <CompanyProfile />;
};

const CompanyProfile: React.FC = () => {
  const [profile, setProfile] = useState<{ id?: string; name: string; email: string; phone: string; billingPlan: string; status: string; companyCount?: number } | null>(null);
  const [tenants, setTenants] = useState<TenantCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, tenantsData] = await Promise.all([
        api.get<{ id: string; name: string; email: string; phone: string; billingPlan: string; status: string; companyCount: number }>('/api/enterprise/profile'),
        api.get<TenantCompany[]>('/api/enterprise/tenants'),
      ]);
      setProfile(profileData);
      setTenants(tenantsData);
      setForm({ name: profileData.name || '', email: profileData.email || '', phone: profileData.phone || '' });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    try {
      await api.put('/api/enterprise/profile', form);
      setEditing(false);
      load();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
        <p className="text-xs font-bold text-slate-500">No enterprise account configured</p>
        <p className="text-[10px] text-slate-400 mt-1">Contact your administrator</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enterprise Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Enterprise Profile</h4>
            <p className="text-xs text-slate-500 mt-0.5">{profile.billingPlan === 'enterprise' ? 'Enterprise Plan' : 'Free Plan'}</p>
          </div>
          <button onClick={() => { setEditing(!editing); if (!editing) setForm({ name: profile.name, email: profile.email, phone: profile.phone }); }}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <div className="space-y-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Company name" className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            <button onClick={saveProfile} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">Save</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">Name</span>
              <span className="font-bold text-slate-800">{profile.name}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">Email</span>
              <span className="font-bold text-slate-800 flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{profile.email || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block">Phone</span>
              <span className="font-bold text-slate-800 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{profile.phone || '-'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Company list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <h4 className="text-sm font-extrabold text-slate-900">Companies ({tenants.length})</h4>
        </div>
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Building2 className="w-8 h-8 mx-auto mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium">No companies</p>
          </div>
        ) : tenants.map(t => (
          <div key={t.id} className="flex items-center gap-3 p-4 border-b border-slate-50">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{t.name}</p>
              <p className="text-[10px] text-slate-500">{t.slug}{t.domain ? ` · ${t.domain}` : ''}</p>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SuperAdminCompanyManager: React.FC = () => {
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', domain: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/api/admin/tenants');
      if (Array.isArray(res)) setCompanies(res);
      else if (res?.data) setCompanies(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setCreating(true);
    try {
      const res = await api.post<any>('/api/admin/tenants', form);
      if (Array.isArray(res)) setCompanies(res);
      else if (res?.data) { setCompanies(res.data); }
      setShowForm(false);
      setForm({ name: '', slug: '', domain: '' });
      load();
    } catch {}
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900">Companies</h4>
          <p className="text-xs text-slate-500 mt-0.5">Manage all registered companies/tenants</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all">
          <Plus className="w-3.5 h-3.5" />
          Create Company
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Company name *" className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, '') })} placeholder="Slug (e.g. my-company) *" className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="Domain (optional)" className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleCreate} disabled={creating || !form.name.trim() || !form.slug.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 transition-all">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {companies.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Building2 className="w-8 h-8 mx-auto mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium">No companies yet</p>
          </div>
        ) : companies.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{c.slug}{c.domain ? ` · ${c.domain}` : ''}</p>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

type FieldDef = { key: keyof IntegrationKeys; label: string; placeholder: string };

const IntegrationCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
  fields: FieldDef[];
}> = ({ icon, iconBg, title, desc, fields }) => {
  const { integrations, setIntegrationKey } = useSettings();
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>{icon}</div>
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
          <p className="text-[10px] text-slate-500 truncate">{desc}</p>
        </div>
      </div>
      <div className="space-y-3">
        {fields.map(field => {
          const isVis = visible[field.key];
          return (
            <div key={field.key}>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">{field.label}</label>
              <div className="relative">
                <input type={isVis ? 'text' : 'password'} value={integrations?.[field.key] ?? ''} onChange={e => setIntegrationKey(field.key, e.target.value)}
                  placeholder={field.placeholder} className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-9 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-slate-800 placeholder:text-slate-300" />
                <button type="button" onClick={() => toggle(field.key)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                  {isVis ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {integrations?.[field.key] && <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">&check; Saved</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
