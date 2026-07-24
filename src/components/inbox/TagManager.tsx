import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { X, Tag, Plus, Search, Edit3, Trash2, Check } from 'lucide-react';
import type { CustomerTag } from '../../types/crm';

const TAG_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

interface Props {
  leadId: string;
  onClose: () => void;
}

export const TagManager: React.FC<Props> = ({ leadId, onClose }) => {
  const { tags, leadTags, addTagToLead, removeTagFromLead, addTag, updateTag, deleteTag } = useCRM();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [editingTag, setEditingTag] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const leadTagIds = useMemo(() => (leadTags[leadId] || []).map(t => t.id), [leadTags, leadId]);
  const myTags = useMemo(() => {
    return (leadTags[leadId] || []).sort((a: CustomerTag, b: CustomerTag) => a.name.localeCompare(b.name));
  }, [leadTags, leadId]);

  const availableTags = useMemo(() => {
    let filtered = tags.filter((t: CustomerTag) => !leadTagIds.includes(t.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((t: CustomerTag) => t.name.toLowerCase().includes(q));
    }
    return filtered.sort((a: CustomerTag, b: CustomerTag) => a.name.localeCompare(b.name));
  }, [tags, leadTagIds, search]);

  const handleToggle = async (tag: CustomerTag) => {
    if (leadTagIds.includes(tag.id)) {
      await removeTagFromLead(leadId, tag.id);
    } else {
      await addTagToLead(leadId, tag.id);
    }
  };

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    await addTag({ name: newTagName.trim(), color: newTagColor });
    setNewTagName('');
    setNewTagColor('#6366f1');
    setShowCreate(false);
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await updateTag(id, { name: editName.trim(), color: editColor });
    setEditingTag(null);
  };

  const handleDelete = async (id: number) => {
    await deleteTag(id);
    if (editingTag === id) setEditingTag(null);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            Manage Tags
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current tags on this lead */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-2">Current Tags</h4>
            {myTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {myTags.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all hover:opacity-80"
                    style={{ backgroundColor: t.color + '20', color: t.color, borderColor: t.color + '40', borderWidth: 1 }}
                    onClick={() => handleToggle(t)}
                  >
                    {t.name}
                    <X className="w-2.5 h-2.5" />
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No tags assigned yet</p>
            )}
          </div>

          {/* Search + Available Tags */}
          <div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tags..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {availableTags.length > 0 ? (
                availableTags.map((t: CustomerTag) => (
                  <button
                    key={t.id}
                    onClick={() => handleToggle(t)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all text-left"
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="truncate">{t.name}</span>
                    <Plus className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                  </button>
                ))
              ) : search.trim() ? (
                <p className="text-xs text-slate-400 text-center py-3">No tags found. Click below to create one.</p>
              ) : (
                <p className="text-xs text-slate-400 text-center py-3">All tags assigned</p>
              )}
            </div>
          </div>

          {/* Create new tag */}
          {showCreate ? (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    className={`w-5 h-5 rounded-full transition-all ${newTagColor === c ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleCreate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all">
                  Create Tag
                </button>
                <button onClick={() => setShowCreate(false)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2.5 rounded-xl transition-all border border-blue-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New Tag
            </button>
          )}

          {/* All tags management */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-2">All Tags</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {[...tags].sort((a: CustomerTag, b: CustomerTag) => a.name.localeCompare(b.name)).map((t: CustomerTag) => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all">
                  {editingTag === t.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        {TAG_COLORS.slice(0, 5).map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className={`w-4 h-4 rounded-full ${editColor === c ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <button onClick={() => handleUpdate(t.id)} className="text-emerald-600 hover:text-emerald-700 p-0.5">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingTag(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-xs font-medium text-slate-700 flex-1">{t.name}</span>
                      <button onClick={() => { setEditingTag(t.id); setEditName(t.name); setEditColor(t.color); }} className="text-slate-400 hover:text-blue-600 p-0.5">
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-500 p-0.5">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
