import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { X, DollarSign, Calendar, Target, Tag, FileText, User, Layers, Edit3, Check, Link } from 'lucide-react';

export const DealDetailModal: React.FC = () => {
  const { selectedDeal, setSelectedDeal, stages, updateDealStage, activities, tasks } = useCRM();

  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');

  const dealActivities = useMemo(() => {
    if (!selectedDeal) return [];
    return activities.filter(a =>
      a.targetName?.includes(selectedDeal.company) ||
      a.description?.includes(selectedDeal.title)
    );
  }, [activities, selectedDeal]);

  const linkedTasks = useMemo(() => {
    if (!selectedDeal) return [];
    return tasks.filter(t => t.relatedTo?.type === 'deal' && t.relatedTo?.id === selectedDeal.id);
  }, [tasks, selectedDeal]);

  if (!selectedDeal) return null;

  const handleSaveNotes = () => {
    setSavedNotes(editNotes);
    setEditing(false);
  };

  const openEdit = () => {
    setEditNotes(selectedDeal.notes || '');
    setSavedNotes(selectedDeal.notes || '');
    setEditing(true);
  };

  const currentNotes = editing ? editNotes : (savedNotes || selectedDeal.notes);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onClick={() => setSelectedDeal(null)}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold shrink-0">
              {selectedDeal.title.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">{selectedDeal.title}</h3>
              <p className="text-xs text-slate-500">{selectedDeal.company}</p>
            </div>
          </div>
          <button onClick={() => setSelectedDeal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5">
                <DollarSign className="w-3.5 h-3.5" />Value
              </div>
              <p className="text-lg font-extrabold text-slate-900">${selectedDeal.value.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5">
                <Target className="w-3.5 h-3.5" />Win Probability
              </div>
              <p className="text-lg font-extrabold text-slate-900">{selectedDeal.probability}%</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5">
                <Layers className="w-3.5 h-3.5" />Stage
              </div>
              <select
                value={selectedDeal.stage}
                onChange={(e) => updateDealStage(selectedDeal.id, e.target.value)}
                className="text-sm font-extrabold text-blue-700 bg-transparent focus:outline-none cursor-pointer w-full"
              >
                {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5">
                <Calendar className="w-3.5 h-3.5" />Close Date
              </div>
              <p className="text-sm font-extrabold text-slate-900">{selectedDeal.expectedCloseDate}</p>
            </div>
          </div>

          {/* Priority & Tags */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
              <Tag className="w-3.5 h-3.5" />Priority & Tags
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                selectedDeal.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                selectedDeal.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {selectedDeal.priority}
              </span>
              {selectedDeal.tags.map((tag, i) => (
                <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">{tag}</span>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
              <User className="w-3.5 h-3.5" />Contact
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <img src={selectedDeal.owner.avatar} alt={selectedDeal.owner.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-200" />
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedDeal.contactName}</p>
                <p className="text-xs text-slate-500">{selectedDeal.contactEmail}</p>
              </div>
            </div>
          </div>

          {/* Notes — editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <FileText className="w-3.5 h-3.5" />Notes
              </div>
              {editing ? (
                <div className="flex gap-1">
                  <button onClick={handleSaveNotes} className="p-1 text-emerald-600 hover:text-emerald-800"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={openEdit} className="p-1 text-slate-400 hover:text-blue-600"><Edit3 className="w-3.5 h-3.5" /></button>
              )}
            </div>
            {editing ? (
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full text-sm text-slate-700 p-3 rounded-xl bg-white border border-blue-300 leading-relaxed focus:outline-none resize-none h-24" autoFocus />
            ) : (
              <p className={`text-sm p-3 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed ${currentNotes ? 'text-slate-700' : 'text-slate-300 italic'}`}>
                {currentNotes || 'No notes yet. Click edit to add notes.'}
              </p>
            )}
          </div>

          {/* Linked Tasks */}
          {linkedTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
                <Link className="w-3.5 h-3.5" />Linked Tasks
              </div>
              <div className="space-y-1.5">
                {linkedTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'done' ? 'bg-emerald-500' : t.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    <span className="text-xs font-medium text-slate-700">{t.title}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{t.dueDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          {dealActivities.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-3">
                <Calendar className="w-3.5 h-3.5" />Activity Timeline
              </div>
              <div className="space-y-3">
                {dealActivities.slice(0, 6).map((act) => (
                  <div key={act.id} className="flex gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                      {act.type === 'deal_won' ? '🎉' : act.type === 'meeting' ? '📅' : act.type === 'email' ? '📧' : act.type === 'call' ? '📞' : '⚡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">{act.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                      <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">{act.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
            <span>Created: {selectedDeal.createdAt}</span>
            <span>Source: {selectedDeal.leadSource}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
