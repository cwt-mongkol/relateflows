import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Headphones, Clock, Plus, Trash2, Save, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, User, Calendar,
} from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6];

const DEFAULT_SLOTS: TimeSlot[] = [
  { start: '09:00', end: '12:00' },
  { start: '13:00', end: '18:00' },
];

export const CsAdminSettings: React.FC = () => {
  const { user } = useAuth();

  const [schedules, setSchedules] = useState<Record<number, TimeSlot[]>>({});
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Clock in/out state
  const [clockStatus, setClockStatus] = useState<{ isClockedIn: boolean; clockIn: string | null; logId: string | null }>({ isClockedIn: false, clockIn: null, logId: null });
  const [clockLoading, setClockLoading] = useState(false);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [showTimeLogs, setShowTimeLogs] = useState(false);

  useEffect(() => {
    loadSchedule();
    loadClockStatus();
    loadTimeLogs();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>('/api/cs-admin/schedules');
      const map: Record<number, TimeSlot[]> = {};
      for (const s of data) {
        if (s.is_active) {
          if (!map[s.day_of_week]) map[s.day_of_week] = [];
          map[s.day_of_week].push({ start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) });
        }
      }
      setSchedules(map);
    } catch {
      // default to empty
    }
    setLoading(false);
  };

  const loadClockStatus = async () => {
    try {
      const data = await api.get<{ isClockedIn: boolean; clockIn: string | null; logId: string | null }>('/api/cs-admin/clock-status');
      setClockStatus(data);
    } catch {
      // ignore
    }
  };

  const loadTimeLogs = async () => {
    try {
      const data = await api.get<any[]>('/api/cs-admin/time-logs?limit=20');
      setTimeLogs(data);
    } catch {
      // ignore
    }
  };

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      await api.post('/api/cs-admin/clock-in', {});
      await loadClockStatus();
    } catch (err) {
      console.error('Clock in failed:', err);
    }
    setClockLoading(false);
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    try {
      await api.post('/api/cs-admin/clock-out', {});
      await loadClockStatus();
      await loadTimeLogs();
    } catch (err) {
      console.error('Clock out failed:', err);
    }
    setClockLoading(false);
  };

  const updateSlots = (day: number, slots: TimeSlot[]) => {
    setSchedules(prev => ({ ...prev, [day]: slots }));
    setSaved(false);
  };

  const addSlot = (day: number) => {
    const slots = schedules[day] || [];
    updateSlots(day, [...slots, { start: '09:00', end: '18:00' }]);
  };

  const removeSlot = (day: number, idx: number) => {
    const slots = [...(schedules[day] || [])];
    slots.splice(idx, 1);
    updateSlots(day, slots);
  };

  const updateSlot = (day: number, idx: number, field: 'start' | 'end', value: string) => {
    const slots = [...(schedules[day] || [])];
    slots[idx] = { ...slots[idx], [field]: value };
    updateSlots(day, slots);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [dayStr, slots] of Object.entries(schedules)) {
        const day = parseInt(dayStr);
        if (slots.length > 0) {
          for (const slot of slots) {
            await api.put('/api/cs-admin/schedules', {
              dayOfWeek: day,
              startTime: slot.start,
              endTime: slot.end,
              isActive: true,
            });
          }
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const durationStr = (clockIn: string) => {
    const diff = Math.round((Date.now() - new Date(clockIn).getTime()) / 60000);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
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
          <Headphones className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CS Admin</span>
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">CS Admin Schedule & Time Tracking</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Manage your weekly schedule and clock in/out to track your working hours
        </p>
        <span className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
          <User className="w-3 h-3" /> {user?.name || 'CS Admin'}
        </span>
      </div>

      {/* Clock In/Out Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${clockStatus.isClockedIn ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Time Tracking</h4>
              <p className="text-[11px] text-slate-500">
                {clockStatus.isClockedIn
                  ? `Clocked in — ${durationStr(clockStatus.clockIn!)} elapsed`
                  : 'Not clocked in'}
              </p>
            </div>
          </div>
          <button
            onClick={clockStatus.isClockedIn ? handleClockOut : handleClockIn}
            disabled={clockLoading}
            className={`text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 ${
              clockStatus.isClockedIn
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {clockLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : clockStatus.isClockedIn ? (
              <><Clock className="w-3.5 h-3.5" /> Clock Out</>
            ) : (
              <><Clock className="w-3.5 h-3.5" /> Clock In</>
            )}
          </button>
        </div>

        {/* Today's time logs */}
        {timeLogs.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowTimeLogs(!showTimeLogs)}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              {showTimeLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Recent time logs ({timeLogs.length})
            </button>
            {showTimeLogs && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {timeLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                    <span>{new Date(log.clock_in).toLocaleString()}</span>
                    <span className="text-slate-400">→</span>
                    <span>{log.clock_out ? new Date(log.clock_out).toLocaleString() : 'Active'}</span>
                    {log.clock_out && (
                      <span className="text-[10px] font-bold text-slate-400 ml-2">
                        {Math.round((new Date(log.clock_out).getTime() - new Date(log.clock_in).getTime()) / 3600000)}h
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-900">Weekly Schedule</h4>
        </div>

        <div className="space-y-1.5">
          {DAY_ORDER.map((day) => {
            const slots = schedules[day] || [];
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
                      <span className="text-[10px] text-slate-400">Day off</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2 border-t border-slate-50 pt-2">
                    {slots.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-2">No working hours — day off</p>
                    )}
                    {slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateSlot(day, idx, 'start', e.target.value)}
                          className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                        />
                        <span className="text-[10px] text-slate-400">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateSlot(day, idx, 'end', e.target.value)}
                          className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                        />
                        <button onClick={() => removeSlot(day, idx)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addSlot(day)} className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors">
                      <Plus className="w-3 h-3" /> Add time range
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Schedule
          </button>
        </div>
      </div>

      {/* Quick schedule preset */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-900">Quick Fill</h4>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">Apply a standard schedule to all weekdays at once:</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              for (let d = 1; d <= 5; d++) {
                updateSlots(d, [...DEFAULT_SLOTS]);
              }
            }}
            className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
          >
            Mon–Fri 09:00–18:00
          </button>
          <button
            onClick={() => {
              for (let d = 1; d <= 5; d++) {
                updateSlots(d, [{ start: '08:00', end: '17:00' }]);
              }
              updateSlots(6, [{ start: '09:00', end: '13:00' }]);
            }}
            className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
          >
            Mon–Fri 08:00–17:00 + Sat
          </button>
        </div>
      </div>
    </div>
  );
};
