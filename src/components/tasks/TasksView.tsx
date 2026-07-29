import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import { Plus, Filter, Search, CheckCircle2, Circle, Clock, Calendar, Trash2 } from 'lucide-react';
import type { Task } from '../../types/crm';

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  todo: <Circle className="w-4 h-4 text-slate-300" />,
  in_progress: <Clock className="w-4 h-4 text-blue-500" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};

export const TasksView: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask } = useCRM();
  const { t } = useSettings();
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as Task['priority'], status: 'todo' as Task['status'], dueDate: '', assigneeName: '' });

  const filtered = tasks.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => {
    if (!form.title.trim()) return;
    addTask({
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || new Date().toISOString().split('T')[0],
      assignee: { name: form.assigneeName || t('tasks.me'), avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    });
    setForm({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assigneeName: '' });
    setShowForm(false);
  };

  const grouped = (groupBy: Task['status'][]) => {
    return groupBy.map((status) => ({
      status,
      label: status === 'todo' ? t('tasks.column.todo') : status === 'in_progress' ? t('tasks.column.inProgress') : t('tasks.column.done'),
      tasks: filtered.filter((t) => t.status === status),
    }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">{t('tasks.title')}</h3>
          <p className="text-xs text-slate-500">{t('tasks.openCompleted').replace('{open}', String(tasks.filter((t) => t.status !== 'done').length)).replace('{completed}', String(tasks.filter((t) => t.status === 'done').length))}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('tasks.search')} className="bg-transparent font-medium text-slate-800 focus:outline-none w-32 placeholder:text-slate-300" />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer">
              <option value="all">{t('tasks.filter.all')}</option>
              <option value="todo">{t('tasks.filter.todo')}</option>
              <option value="in_progress">{t('tasks.filter.inProgress')}</option>
              <option value="done">{t('tasks.filter.done')}</option>
            </select>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md rf-yellow-glow flex items-center gap-1.5 transition-all hover:scale-105">
            <Plus className="w-4 h-4 stroke-[3]" /><span>{t('tasks.addTask')}</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-5 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
        {grouped(['todo', 'in_progress', 'done']).map((col) => (
          <div key={col.status} className="min-w-[300px] w-[300px] shrink-0 flex flex-col">
            <div className="flex items-center gap-2 mb-3 px-1">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">{col.label}</h4>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{col.tasks.length}</span>
            </div>
            <div className="flex-1 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2.5 space-y-2.5">
              {col.tasks.length === 0 ? (
                <div className="h-24 border-2 border-dashed border-slate-200/60 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">{t('tasks.empty')}</div>
              ) : (
                col.tasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-3.5 space-y-2.5 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })} className="mt-0.5 shrink-0">
                        {STATUS_ICONS[task.status]}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h5 className={`text-xs font-bold ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</h5>
                        {task.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {task.relatedTo && (
                            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                              {task.relatedTo.label}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLES[task.priority] || ''}`}>
                            {t('tasks.priority.' + task.priority)}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <img src={task.assignee.avatar} alt={task.assignee.name} className="w-4 h-4 rounded-full ring-1 ring-slate-200" />
                        <span>{task.assignee.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{task.dueDate}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">{t('tasks.modal.newTask')}</h3>
            </div>
            <div className="p-5 space-y-4">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('tasks.modal.title')} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400" autoFocus />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('tasks.modal.description')} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400 resize-none h-20" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">{t('tasks.modal.priority')}</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none">
                    <option value="low">{t('tasks.priority.low')}</option>
                    <option value="medium">{t('tasks.priority.medium')}</option>
                    <option value="high">{t('tasks.priority.high')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">{t('tasks.modal.dueDate')}</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none" />
                </div>
              </div>
              <input value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })} placeholder={t('tasks.modal.assignee')} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all">{t('tasks.modal.cancel')}</button>
                <button onClick={handleCreate} disabled={!form.title.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all">{t('tasks.modal.create')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
