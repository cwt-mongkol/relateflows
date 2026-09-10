import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../context/ToastContext';
import { Key, Plus, Trash2, Copy, AlertTriangle, Loader2 } from 'lucide-react';

const SCOPES = ['contacts:read', 'contacts:write', 'leads:read', 'leads:write', 'deals:read', 'deals:write', 'events:write'];

export const DeveloperSettings: React.FC = () => {
  const { apiKeys, createApiKey, revokeApiKey } = useCRM();
  const { addToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const toggleScope = (s: string) => setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const created = await createApiKey(name.trim(), scopes);
      setNewKey(created.key || null);
      setName('');
      setScopes([]);
      setShowCreate(false);
    } catch (err) {
      addToast('Could not create API key.', 'error');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      addToast('API key revoked.', 'success');
    } catch (err) {
      addToast('Could not revoke API key.', 'error');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Developer</span>
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Public API Keys</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Let external systems (n8n, an ERP, a custom script) call the RelateFlows public API at <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">/api/v1/*</code> using
          <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded ml-1">Authorization: Bearer &lt;key&gt;</code>.
        </p>
      </div>

      {newKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" /> Copy this key now — you won't be able to see it again
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 overflow-x-auto">{newKey}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(newKey).catch(() => {}); addToast('Copied to clipboard.', 'success'); }}
              className="p-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs font-bold text-amber-700 hover:text-amber-900">I've saved it, dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="space-y-2.5">
          {apiKeys.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No API keys yet.</p>
          )}
          {apiKeys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{k.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{k.keyPrefix}… · {k.scopes.join(', ') || 'no scopes'}</p>
              </div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${k.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {k.status.toUpperCase()}
              </span>
              {k.status === 'active' && (
                <button onClick={() => handleRevoke(k.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {showCreate ? (
          <div className="mt-3 p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Key name, e.g. n8n Production"
              className="w-full text-xs font-bold bg-white border border-blue-300 rounded-lg px-3 py-2 focus:outline-none"
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5">
              {SCOPES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleScope(s)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${scopes.includes(s) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!name.trim() || creating} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2">
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Key
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-3 py-2 rounded-lg transition-all">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 text-xs font-bold transition-all">
            <Plus className="w-4 h-4" /> Create API Key
          </button>
        )}
      </div>
    </div>
  );
};
