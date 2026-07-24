import React, { useState, useEffect } from 'react';
import { useSettings, type IntegrationKeys } from '../../context/SettingsContext';
import { useCRM } from '../../context/CRMContext';
import { Palette, CheckCircle2, Save, Globe, Sun, Moon, Monitor, Sliders, Kanban, Plus, X, Edit3, Key, MessageCircle, MessageSquare, Eye, EyeOff, Shield, Users, Radio, Lock } from 'lucide-react';
import { STAGE_COLORS } from '../../data/mockData';
import type { SettingsTab } from '../../types/crm';
import { usePermissions } from '../../lib/permissions';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';
import { ChannelManagement } from './ChannelManagement';
import { AccessControl } from './AccessControl';

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: 'General', icon: <Sliders className="w-3.5 h-3.5" /> },
  { key: 'users', label: 'Users', icon: <Users className="w-3.5 h-3.5" /> },
  { key: 'roles', label: 'Roles', icon: <Shield className="w-3.5 h-3.5" /> },
  { key: 'channels', label: 'Channels', icon: <Radio className="w-3.5 h-3.5" /> },
  { key: 'access', label: 'Access', icon: <Lock className="w-3.5 h-3.5" /> },
  { key: 'integrations', label: 'Integrations', icon: <Key className="w-3.5 h-3.5" /> },
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
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="w-5 h-5 text-blue-300" />
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Settings</span>
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight">{t('settings.title')}</h3>
          <p className="text-sm text-blue-200 mt-1 max-w-md">{t('settings.subtitle')}</p>
          <span className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold bg-white/15 text-white/90 px-2.5 py-1 rounded-full">
            <Shield className="w-3 h-3" />
            {roleName}
          </span>
        </div>
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
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-5 h-5 text-yellow-300" />
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">API Credentials</span>
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight">{t('integrations.title')}</h3>
              <p className="text-sm text-blue-200 mt-1 max-w-2xl">{t('integrations.subtitle')}</p>
            </div>
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
