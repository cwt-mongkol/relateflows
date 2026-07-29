import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit3, Trash2, Table, Database, List, Columns, ChevronLeft, Loader2, Check, GripVertical } from 'lucide-react';
import type { CustomObject, CustomField, CustomRecord } from '../../types/crm';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'relation', label: 'Relation' },
];

export const CustomObjectsManager: React.FC = () => {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<CustomObject[]>('/api/admin/objects');
      if (Array.isArray(res)) setObjects(res);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <ObjectList objects={objects} onRefresh={load} />
  );
};

const ObjectList: React.FC<{ objects: CustomObject[]; onRefresh: () => void }> = ({ objects, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', icon: 'table', color: '#6366f1' });
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<CustomObject | null>(null);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setCreating(true);
    try {
      await api.post('/api/admin/objects', form);
      setShowForm(false);
      setForm({ name: '', slug: '', description: '', icon: 'table', color: '#6366f1' });
      onRefresh();
    } catch {}
    setCreating(false);
  };

  if (selected) {
    return <ObjectDetail object={selected} onBack={() => setSelected(null)} />;
  }

  const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900">Custom Objects</h4>
          <p className="text-xs text-slate-500 mt-0.5">Create and manage custom data tables</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all">
          <Plus className="w-3.5 h-3.5" />
          Create Object
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '') })}
              placeholder="Object name *" className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
              placeholder="Slug *" className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)" className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 w-16">Color</span>
            <div className="flex gap-1.5">
              {colors.map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className={`w-6 h-6 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleCreate} disabled={creating || !form.name.trim() || !form.slug.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 transition-all">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {objects.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
            <Database className="w-8 h-8 mx-auto mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium">No custom objects yet</p>
          </div>
        ) : objects.map(obj => (
          <button key={obj.id} onClick={() => setSelected(obj)}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: obj.color + '20', color: obj.color }}>
                <Table className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{obj.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{obj.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1"><Columns className="w-3 h-3" />{obj.field_count ?? 0}</span>
              <span className="flex items-center gap-1"><List className="w-3 h-3" />{obj.record_count ?? 0}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const ObjectDetail: React.FC<{ object: CustomObject; onBack: () => void }> = ({ object, onBack }) => {
  const [tab, setTab] = useState<'fields' | 'records'>('fields');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: object.color + '20', color: object.color }}>
          <Database className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold text-slate-900 truncate">{object.name}</h4>
          <p className="text-[10px] text-slate-500 truncate">{object.description || object.slug}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setTab('fields')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'fields' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Columns className="w-3.5 h-3.5" />
          Fields
        </button>
        <button onClick={() => setTab('records')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'records' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <List className="w-3.5 h-3.5" />
          Records
        </button>
      </div>

      {tab === 'fields' ? <FieldsTab object={object} /> : <RecordsTab object={object} />}
    </div>
  );
};

const FieldsTab: React.FC<{ object: CustomObject }> = ({ object }) => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', field_type: 'text', options: '', reference_owner: '', required: false, placeholder: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<CustomField[]>(`/api/admin/objects/${object.id}/fields`);
      if (Array.isArray(res)) setFields(res);
    } catch {}
    setLoading(false);
  }, [object.id]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ name: '', slug: '', field_type: 'text', options: '', reference_owner: '', required: false, placeholder: '' });

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        owner_type: 'custom',
        owner_id: object.id,
        name: form.name,
        slug: form.slug,
        field_type: form.field_type,
        placeholder: form.placeholder,
        required: form.required,
      };
      if (form.field_type === 'select' || form.field_type === 'multi_select') {
        payload.options = form.options.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (form.field_type === 'relation') {
        payload.reference_owner = form.reference_owner;
      }
      if (editing) {
        await api.put(`/api/admin/fields/${editing}`, payload);
      } else {
        await api.post('/api/admin/fields', payload);
      }
      resetForm();
      setShowForm(false);
      setEditing(null);
      load();
    } catch {}
    setSaving(false);
  };

  const handleEdit = (f: CustomField) => {
    setForm({
      name: f.name,
      slug: f.slug,
      field_type: f.field_type,
      options: Array.isArray(f.options) ? f.options.join(', ') : '',
      reference_owner: f.reference_owner || '',
      required: f.required,
      placeholder: f.placeholder || '',
    });
    setEditing(f.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this field?')) return;
    try {
      await api.delete(`/api/admin/fields/${id}`);
      load();
    } catch {}
  };

  const typeBadge = (t: string) => {
    const colors: Record<string, string> = { text: 'bg-blue-50 text-blue-600', textarea: 'bg-indigo-50 text-indigo-600', number: 'bg-emerald-50 text-emerald-600', date: 'bg-amber-50 text-amber-600', select: 'bg-purple-50 text-purple-600', multi_select: 'bg-pink-50 text-pink-600', boolean: 'bg-cyan-50 text-cyan-600', url: 'bg-sky-50 text-sky-600', email: 'bg-orange-50 text-orange-600', phone: 'bg-teal-50 text-teal-600', relation: 'bg-rose-50 text-rose-600' };
    return colors[t] || 'bg-slate-50 text-slate-600';
  };

  if (loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{fields.length} Fields</span>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(!showForm); }}
          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-all">
          <Plus className="w-3 h-3" />
          {showForm ? 'Cancel' : 'Add Field'}
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '_') })}
              placeholder="Field name *" className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
              placeholder="Field slug *" className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.field_type} onChange={e => setForm({ ...form, field_type: e.target.value })}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
              {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
            </select>
            <input value={form.placeholder} onChange={e => setForm({ ...form, placeholder: e.target.value })}
              placeholder="Placeholder" className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {(form.field_type === 'select' || form.field_type === 'multi_select') && (
            <input value={form.options} onChange={e => setForm({ ...form, options: e.target.value })}
              placeholder="Options (comma-separated)" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={form.required} onChange={e => setForm({ ...form, required: e.target.checked })} className="rounded border-slate-300" />
            Required
          </label>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.slug.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {editing ? 'Update' : 'Add'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {fields.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <Columns className="w-6 h-6 mx-auto mb-1 stroke-[1.5]" />
            <p className="text-[11px] font-medium">No fields yet</p>
          </div>
        ) : fields.map(f => (
          <div key={f.id} className="flex items-center gap-3 px-4 py-3">
            <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{f.name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${typeBadge(f.field_type)}`}>{f.field_type}</span>
                {f.required && <span className="text-[10px] text-red-400">*</span>}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{f.slug}</p>
            </div>
            <button onClick={() => handleEdit(f)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all">
              <Edit3 className="w-3 h-3" />
            </button>
            <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecordsTab: React.FC<{ object: CustomObject }> = ({ object }) => {
  const [records, setRecords] = useState<CustomRecord[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, fldRes] = await Promise.all([
        api.get<CustomRecord[]>(`/api/admin/objects/${object.id}/records`),
        api.get<CustomField[]>(`/api/admin/objects/${object.id}/fields`),
      ]);
      if (Array.isArray(recRes)) setRecords(recRes);
      if (Array.isArray(fldRes)) setFields(fldRes);
    } catch {}
    setLoading(false);
  }, [object.id]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    const defaults: Record<string, any> = {};
    fields.forEach(f => defaults[f.slug] = f.default_value || '');
    setForm(defaults);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, any> = {};
      fields.forEach(f => {
        const val = form[f.slug];
        if (f.field_type === 'number') data[f.slug] = val ? Number(val) : null;
        else if (f.field_type === 'boolean') data[f.slug] = val === true || val === 'true';
        else data[f.slug] = val || '';
      });
      if (editing) {
        await api.put(`/api/admin/records/${editing}`, { data });
      } else {
        await api.post(`/api/admin/objects/${object.id}/records`, { data });
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch {}
    setSaving(false);
  };

  const handleEdit = (rec: CustomRecord) => {
    setForm({ ...rec.data });
    setEditing(rec.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    try {
      await api.delete(`/api/admin/records/${id}`);
      load();
    } catch {}
  };

  if (loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{records.length} Records</span>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(!showForm); }}
          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-all">
          <Plus className="w-3 h-3" />
          {showForm ? 'Cancel' : 'Add Record'}
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 space-y-3">
          {fields.map(f => (
            <div key={f.id}>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">{f.name}{f.required ? ' *' : ''}</label>
              {f.field_type === 'textarea' ? (
                <textarea value={form[f.slug] || ''} onChange={e => setForm({ ...form, [f.slug]: e.target.value })}
                  placeholder={f.placeholder} rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ) : f.field_type === 'select' ? (
                <select value={form[f.slug] || ''} onChange={e => setForm({ ...form, [f.slug]: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">--</option>
                  {Array.isArray(f.options) && f.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.field_type === 'multi_select' ? (
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(f.options) && f.options.map((o: string) => {
                    const sel = (form[f.slug] || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                    const active = sel.includes(o);
                    return (
                      <button key={o} onClick={() => {
                        const next = active ? sel.filter((s: string) => s !== o) : [...sel, o];
                        setForm({ ...form, [f.slug]: next.join(', ') });
                      }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                        {o}
                      </button>
                    );
                  })}
                </div>
              ) : f.field_type === 'boolean' ? (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input type="checkbox" checked={form[f.slug] === true || form[f.slug] === 'true'}
                    onChange={e => setForm({ ...form, [f.slug]: e.target.checked })}
                    className="rounded border-slate-300" />
                  {f.placeholder || 'Enabled'}
                </label>
              ) : f.field_type === 'number' ? (
                <input type="number" value={form[f.slug] || ''} onChange={e => setForm({ ...form, [f.slug]: e.target.value })}
                  placeholder={f.placeholder} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ) : (
                <input value={form[f.slug] || ''} onChange={e => setForm({ ...form, [f.slug]: e.target.value })}
                  placeholder={f.placeholder} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {records.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <List className="w-6 h-6 mx-auto mb-1 stroke-[1.5]" />
            <p className="text-[11px] font-medium">No records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {fields.slice(0, 5).map(f => (
                    <th key={f.id} className="px-3 py-2.5 text-left font-bold text-slate-500">{f.name}</th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-bold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    {fields.slice(0, 5).map(f => (
                      <td key={f.id} className="px-3 py-2.5 text-slate-800 max-w-[200px] truncate">
                        {f.field_type === 'boolean' ? (rec.data[f.slug] ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : '—') : String(rec.data[f.slug] ?? '—')}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => handleEdit(rec)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600">
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDelete(rec.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
