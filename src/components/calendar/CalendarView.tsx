import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import type { Appointment, AppointmentFormData, AppointmentType, AppointmentStatus } from '../../types/crm';
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, Trash2, Edit3, Users, CheckCircle2, Calendar, Star, UserPlus, Copy, Bell, Search, ExternalLink, Check
} from 'lucide-react';

type ViewMode = 'month' | 'week' | 'day';

function getTypeConfig(t: (key: string) => string): Record<AppointmentType, { label: string; color: string; icon: React.ReactNode }> {
  return {
    activity: { label: t('type.activity'), color: 'bg-green-100 text-green-700 border-green-200', icon: <Star className="w-3.5 h-3.5" /> },
    meeting: { label: t('type.meeting'), color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Users className="w-3.5 h-3.5" /> },
    appointment: { label: t('type.appointment'), color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Calendar className="w-3.5 h-3.5" /> },
  };
}

function getStatusConfig(t: (key: string) => string): Record<AppointmentStatus, { label: string; color: string }> {
  return {
    0: { label: t('status.scheduled'), color: 'bg-blue-50 text-blue-600' },
    1: { label: t('status.completed'), color: 'bg-green-50 text-green-600' },
    2: { label: t('status.cancelled'), color: 'bg-red-50 text-red-500' },
  };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthDays(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  while (week.length < 7) week.push(null);
  if (week.length > 0) weeks.push(week);
  return weeks;
}

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const TEAM_MEMBERS = [
  { id: 'emp-1', name: 'Sarah Connor', role: 'Account Executive', email: 'sarah.connor@relateflows.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { id: 'emp-2', name: 'Alex Rivera', role: 'Sales Manager', email: 'alex.r@relateflows.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'emp-3', name: 'Marcus Brody', role: 'Sales Representative', email: 'marcus.b@relateflows.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 'emp-4', name: 'Elena Rostova', role: 'Sales Operations', email: 'elena.r@relateflows.com', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 'emp-5', name: 'Catherine Hayes', role: 'Customer Success', email: 'catherine.h@relateflows.com', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
];

export interface GuestInfo {
  name: string;
  status: 0 | 1 | 2;
  email: string;
  avatar?: string;
  role?: string;
}

export const GUEST_STATUS_LABELS: Record<0 | 1 | 2, string> = {
  0: 'Yes',
  1: 'No',
  2: 'Awaiting',
};

export function parseGuests(guestStrings: string[] | undefined): GuestInfo[] {
  if (!guestStrings) return [];
  return guestStrings.map(g => {
    const parts = g.split(':');
    const name = parts[0];
    const statusNum = parseInt(parts[1], 10);
    const status = (statusNum === 0 || statusNum === 1 ? statusNum : 2) as 0 | 1 | 2;
    const emp = TEAM_MEMBERS.find(e => e.name.toLowerCase() === name.toLowerCase());
    const email = parts[2] || emp?.email || '';
    return {
      name,
      status,
      email,
      avatar: emp?.avatar,
      role: emp?.role
    };
  });
}

export function serializeGuests(guests: GuestInfo[]): string[] {
  return guests.map(g => `${g.name}:${g.status}:${g.email}`);
}

export const CalendarView: React.FC = () => {
  const { user } = useAuth();
  const { appointments, addAppointment, updateAppointment, deleteAppointment, leads } = useCRM();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [syncToGoogle, setSyncToGoogle] = useState(false);

  const { t, language } = useSettings();

  const TYPE_CONFIG = useMemo(() => getTypeConfig(t), [t, language]);
  const STATUS_CONFIG = useMemo(() => getStatusConfig(t), [t, language]);

  // Check Google Calendar connection on mount (auto-detected from Google login)
  useEffect(() => {
    async function check() {
      try {
        const status = await api.get<{ connected: boolean }>('/api/calendar/status');
        setCalendarConnected(status.connected);
      } catch {
        // Not configured or unavailable
      }
      setCheckingStatus(false);
    }
    check();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const weeks = useMemo(() => getMonthDays(year, month), [year, month]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const today = new Date();

  const getApptsForDay = (day: number): Appointment[] => {
    if (!day) return [];
    const target = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(a => a.startTime.startsWith(target));
  };

  const getApptsForDate = (date: Date): Appointment[] => {
    const target = toLocalDateStr(date);
    return appointments.filter(a => a.startTime.startsWith(target));
  };

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const openAddModal = (date?: Date) => {
    setEditingAppt(null);
    setSelectedDate(date || new Date());
    setShowAddModal(true);
  };

  const openEditModal = (appt: Appointment) => {
    setEditingAppt(appt);
    setSelectedDate(new Date(appt.startTime));
    setShowAddModal(true);
  };

  const handleDelete = async (id: number, googleEventId?: string) => {
    await deleteAppointment(id);
    if (googleEventId && calendarConnected) {
      try {
        await api.delete(`/api/calendar/events/${googleEventId}`);
      } catch (err) {
        console.warn('Failed to delete Google Calendar event:', err);
      }
    }
    setSelectedAppt(null);
  };

  const getViewTitle = (): string => {
    if (viewMode === 'month') return `${MONTHS[month]} ${year}`;
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${year}`;
      return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${MONTHS[end.getMonth()]} ${end.getDate()}, ${year}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${year}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{t('page.calendar')}</h2>
            <p className="text-xs text-slate-500 font-medium">{t('page.calendar.desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Google Calendar Status */}
          {!checkingStatus && calendarConnected && (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 text-xs font-bold">
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Calendar</span>
            </span>
          )}
          {/* Sync Toggle */}
          {calendarConnected && (
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold cursor-pointer select-none" title="Sync events to Google Calendar">
              <input
                type="checkbox"
                checked={syncToGoogle}
                onChange={(e) => setSyncToGoogle(e.target.checked)}
                className="checkbox checkbox-xs checkbox-primary [--chkbg:theme(colors.blue.600)] rounded"
              />
              <span className="hidden sm:inline">Auto-sync</span>
            </label>
          )}
          {/* View Switcher */}
          <div className="bg-slate-100 rounded-xl p-1 flex items-center gap-0.5">
            {(['month', 'week', 'day'] as ViewMode[]).map((vm) => (
              <button
                key={vm}
                onClick={() => setViewMode(vm)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === vm ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('calendar.' + vm)}
              </button>
            ))}
          </div>
          <button
            onClick={() => openAddModal(new Date())}
            className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md rf-yellow-glow transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('calendar.newEvent')}</span>
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-extrabold text-slate-900 min-w-[200px] text-center">{getViewTitle()}</h3>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-all"
        >
          {t('calendar.today')}
        </button>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {DAYS.map((d) => (
              <div key={d} className="py-3 text-center text-xs font-bold text-slate-500 bg-slate-50/50 border-r border-slate-200 last:border-r-0">
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-slate-200 last:border-b-0">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="min-h-[120px] bg-slate-50/30 border-r border-slate-200 last:border-r-0" />;
                const dayAppts = getApptsForDay(day);
                const cellDate = new Date(year, month, day);
                const isToday = isSameDay(cellDate, today);
                const isSelected = selectedDate && isSameDay(cellDate, selectedDate);
                return (
                  <div
                    key={di}
                    onClick={() => setSelectedDate(cellDate)}
                    className={`min-h-[120px] p-2 border-r border-slate-200 last:border-r-0 cursor-pointer transition-all hover:bg-blue-50/30 ${
                      isToday ? 'bg-blue-50/50' : ''
                    } ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-blue-600 text-white' : 'text-slate-600'
                      }`}>
                        {day}
                      </span>
                      {dayAppts.length > 0 && (
                        <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                          {dayAppts.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayAppts.slice(0, 3).map((appt) => (
                        <div
                          key={appt.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedAppt(appt); }}
                          className={`text-[10px] font-semibold px-1.5 py-1 rounded-md truncate border cursor-pointer transition-all hover:opacity-80 flex items-center gap-1 ${
                            appt.status === 1 ? 'bg-green-50 text-green-700 border-green-200' :
                            appt.status === 2 ? 'bg-red-50 text-red-400 border-red-200 line-through' :
                            TYPE_CONFIG[appt.type]?.color || 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <span className="truncate">{formatTime(appt.startTime)} {appt.title}</span>
                          {appt.guests && appt.guests.length > 0 && (
                            <span className="shrink-0 flex -space-x-1 ml-auto">
                              {appt.guests.slice(0, 3).map((g, gi) => {
                                const emp = TEAM_MEMBERS.find((e) => e.name === g);
                                return emp ? (
                                  <img key={gi} src={emp.avatar} alt={g} title={g} className="w-3.5 h-3.5 rounded-full ring-1 ring-white" />
                                ) : null;
                              })}
                              {appt.guests.length > 3 && (
                                <span className="w-3.5 h-3.5 rounded-full bg-slate-300 text-white text-[6px] font-bold flex items-center justify-center ring-1 ring-white">
                                  +
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <div className="text-[10px] font-bold text-slate-400 px-1.5">
                          +{dayAppts.length - 3} more
                        </div>
                      )}
                      {dayAppts.length === 0 && (
                        <div className="text-[10px] text-slate-300 px-1.5 font-medium">No events</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {weekDays.map((d, i) => {
              const isToday = isSameDay(d, today);
              return (
                <div key={i} className={`py-3 text-center border-r border-slate-200 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}>
                  <div className="text-xs font-bold text-slate-500">{DAYS[i]}</div>
                  <div className={`text-lg font-extrabold mt-0.5 ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-7 min-h-[60px]">
                {weekDays.map((d, di) => {
                  const timeStr = `${toLocalDateStr(d)}T${String(hour).padStart(2, '0')}:00:00`;
                  const hourAppts = appointments.filter(a => a.startTime.startsWith(timeStr.substring(0, 13)));
                  return (
                    <div key={di} className="border-r border-slate-200 last:border-r-0 p-1.5 relative group">
                      <div className="space-y-1">
                        {hourAppts.map((appt) => (
                          <div
                            key={appt.id}
                            onClick={() => setSelectedAppt(appt)}
                            className={`text-[10px] font-semibold px-1.5 py-1 rounded-md truncate border cursor-pointer transition-all hover:opacity-80 ${
                              appt.status === 1 ? 'bg-green-50 text-green-700 border-green-200' :
                              appt.status === 2 ? 'bg-red-50 text-red-400 border-red-200 line-through' :
                              TYPE_CONFIG[appt.type]?.color || 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {appt.title}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => openAddModal(d)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="text-sm font-bold text-slate-500">{DAYS[currentDate.getDay()]}</div>
            <div className="text-2xl font-extrabold text-slate-900">{currentDate.getDate()}</div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {HOURS.map((hour) => {
              const timeStr = `${toLocalDateStr(currentDate)}T${String(hour).padStart(2, '0')}:00:00`;
              const hourAppts = appointments.filter(a => a.startTime.startsWith(timeStr.substring(0, 13)));
              return (
                <div key={hour} className="flex min-h-[60px] group hover:bg-slate-50/50 transition-all">
                  <div className="w-20 shrink-0 p-2 text-right text-[11px] font-bold text-slate-400 border-r border-slate-200">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </div>
                  <div className="flex-1 p-1.5 relative">
                    {hourAppts.map((appt) => (
                      <div
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl mb-1 border cursor-pointer transition-all hover:opacity-80 ${
                          appt.status === 1 ? 'bg-green-50 text-green-700 border-green-200' :
                          appt.status === 2 ? 'bg-red-50 text-red-400 border-red-200 line-through' :
                          TYPE_CONFIG[appt.type]?.color || 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {TYPE_CONFIG[appt.type]?.icon}
                          <span className="truncate">{appt.title}</span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => openAddModal(currentDate)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Date Events Panel */}
      {selectedDate && viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-extrabold text-slate-900 text-sm">
              Events for {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
            </h4>
            <button
              onClick={() => openAddModal(selectedDate)}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>
          {getApptsForDate(selectedDate).length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No events scheduled for this day</p>
              <button
                onClick={() => openAddModal(selectedDate)}
                className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 underline"
              >
                Create an event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {getApptsForDate(selectedDate).map((appt) => (
                <div
                  key={appt.id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                    appt.status === 1 ? 'bg-green-50 border-green-200' :
                    appt.status === 2 ? 'bg-red-50 border-red-200' :
                    'bg-white border-slate-200 hover:border-blue-200'
                  }`}
                  onClick={() => setSelectedAppt(appt)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        TYPE_CONFIG[appt.type]?.color.split(' ')[0]
                      }`}>
                        {TYPE_CONFIG[appt.type]?.icon}
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-slate-900">{appt.title}</h5>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(appt.startTime)} - {formatTime(appt.endTime)}</span>
                          <MapPin className="w-3 h-3 ml-1" />
                          <span>{appt.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        STATUS_CONFIG[appt.status]?.color
                      }`}>
                        {STATUS_CONFIG[appt.status]?.label}
                      </span>
                    </div>
                  </div>
                  {appt.guests && appt.guests.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 ml-12">
                      <span className="text-[10px] text-slate-400 font-medium">Team:</span>
                      <div className="flex -space-x-1.5">
                        {appt.guests.map((g, gi) => {
                          const emp = TEAM_MEMBERS.find((e) => e.name === g);
                          return emp ? (
                            <img key={gi} src={emp.avatar} alt={g} title={g} className="w-5 h-5 rounded-full ring-2 ring-white" />
                          ) : (
                            <span key={gi} className="w-5 h-5 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500 flex items-center justify-center ring-2 ring-white">
                              {g.charAt(0)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {appt.description && (
                    <p className="text-xs text-slate-500 mt-2 ml-12">{appt.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppt && (() => {
        const parsedGuests = parseGuests(selectedAppt.guests);
        const totalGuests = parsedGuests.length;
        const yesGuests = parsedGuests.filter(g => g.status === 0).length;
        const noGuests = parsedGuests.filter(g => g.status === 1).length;
        const awaitingGuests = parsedGuests.filter(g => g.status === 2).length;
        const organizer = TEAM_MEMBERS.find(e => e.id === selectedAppt.createdBy)?.name || 'Sarah Connor';
        const d = new Date(selectedAppt.startTime);
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
        
        const handleCopy = () => {
          const text = `${selectedAppt.title}\n${dateStr}\n${formatTime(selectedAppt.startTime)} - ${formatTime(selectedAppt.endTime)}\nLocation: ${selectedAppt.location}\n${selectedAppt.description}`;
          navigator.clipboard.writeText(text);
          alert('Event details copied to clipboard!');
        };

        const handleGuestStatusChange = async (name: string, newStatus: 0 | 1 | 2) => {
          const updatedGuests = parsedGuests.map(g => g.name === name ? { ...g, status: newStatus } : g);
          const serialized = serializeGuests(updatedGuests);
          await updateAppointment(selectedAppt.id, { guests: serialized });
          setSelectedAppt(prev => prev ? { ...prev, guests: serialized } : null);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" onClick={() => setSelectedAppt(null)}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn" onClick={(e) => e.stopPropagation()}>
              
              {/* Header Actions */}
              <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('calendar.eventDetails')}</span>
                <div className="flex items-center gap-1">
                  <button onClick={handleCopy} title={t('calendar.copyDetails')} className="p-2 rounded-xl text-slate-500 hover:text-slate-750 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setSelectedAppt(null); openEditModal(selectedAppt); }} title={t('calendar.editEvent')} className="p-2 rounded-xl text-slate-500 hover:text-blue-650 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-800 transition-all cursor-pointer">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(selectedAppt.id, selectedAppt.googleEventId)} title={t('calendar.deleteEvent')} className="p-2 rounded-xl text-slate-500 hover:text-red-650 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-slate-800 transition-all cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedAppt(null)} className="p-2 rounded-xl text-slate-500 hover:text-slate-750 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Body */}
              <div className="p-6 space-y-5">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-150 tracking-tight leading-none">{selectedAppt.title}</h3>
                  <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full inline-block mt-2 ${
                    selectedAppt.type === 'activity' ? 'bg-green-100 text-green-750 dark:bg-green-950/40 dark:text-green-400' :
                    selectedAppt.type === 'meeting' ? 'bg-blue-100 text-blue-750 dark:bg-blue-950/40 dark:text-blue-400' :
                    'bg-purple-100 text-purple-750 dark:bg-purple-950/40 dark:text-purple-400'
                  }`}>
                    {TYPE_CONFIG[selectedAppt.type]?.label}
                  </span>
                </div>

                {/* Event meta fields */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-slate-650 dark:text-slate-350 text-sm font-semibold">
                    <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-650 dark:text-slate-350 text-sm font-semibold">
                    <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{formatTime(selectedAppt.startTime)} - {formatTime(selectedAppt.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-650 dark:text-slate-350 text-sm font-semibold">
                    <Bell className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{t('calendar.reminder')}</span>
                  </div>
                  {selectedAppt.location && (
                    <div className="flex items-center gap-3 text-slate-650 dark:text-slate-350 text-sm font-semibold">
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{selectedAppt.location}</span>
                    </div>
                  )}
                </div>

                {/* Overlapping Avatars & Guests Tally */}
                <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {parsedGuests.map((g) => (
                        <div key={g.name} className="relative">
                          <img
                            src={g.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={g.name}
                            title={`${g.name} (${GUEST_STATUS_LABELS[g.status]})`}
                            className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                          />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                            g.status === 0 ? 'bg-green-500' :
                            g.status === 1 ? 'bg-red-500' :
                            'bg-slate-400'
                          }`} />
                        </div>
                      ))}
                      {totalGuests === 0 && (
                        <span className="text-xs font-semibold text-slate-400 italic">{t('calendar.noGuests')}</span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => { setSelectedAppt(null); openEditModal(selectedAppt); }}
                      className="w-7 h-7 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 dark:hover:text-slate-300 transition-all cursor-pointer"
                      title={t('calendar.inviteGuests')}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {totalGuests > 0 && (
                    <>
                      <div className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-450">
                        <span>{totalGuests} {t('calendar.guests')}</span>
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">{yesGuests} {t('guest.yes')}</span>
                        {noGuests > 0 && (
                          <>
                            <span className="mx-2 text-slate-300">|</span>
                            <span className="text-red-500 dark:text-red-400 font-semibold">{noGuests} {t('guest.no')}</span>
                          </>
                        )}
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-550 dark:text-slate-400 font-semibold">{awaitingGuests} {t('guest.awaiting')}</span>
                      </div>

                      {/* Interactive Guest Status List */}
                      <div className="mt-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-150/60 dark:border-slate-800/80 rounded-2xl p-2.5 max-h-[140px] overflow-y-auto space-y-1.5">
                        {parsedGuests.map((g) => {
                          const isSelf = user && (g.email.toLowerCase() === user.email.toLowerCase() || g.name.toLowerCase() === user.name.toLowerCase());
                          return (
                            <div key={g.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img src={g.avatar} alt={g.name} className="w-5.5 h-5.5 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                <div>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px] block leading-none">
                                    {g.name} {isSelf && <span className="text-[9px] font-bold text-blue-500">(You)</span>}
                                  </span>
                                  <span className="text-[8px] text-slate-400 dark:text-slate-500 block mt-0.5">{g.email}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                                  g.status === 0 ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' :
                                  g.status === 1 ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400' :
                                  'bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {GUEST_STATUS_LABELS[g.status]}
                                </span>
                                  {isSelf ? (
                                  <select
                                    value={g.status}
                                    onChange={(e) => handleGuestStatusChange(g.name, Number(e.target.value) as 0 | 1 | 2)}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[8px] font-bold rounded-md px-1 py-0.5 text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer animate-pulse"
                                  >
                                    <option value={2}>{t('guest.maybe')}</option>
                                    <option value={0}>{t('guest.yes')}</option>
                                    <option value={1}>{t('guest.no')}</option>
                                  </select>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* About this event */}
                <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('calendar.aboutEvent')}</h4>
                  <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
                    {t('calendar.invitingTo').replace('{organizer}', organizer).replace('{type}', t('type.' + selectedAppt.type))}
                  </p>
                  {selectedAppt.description && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-650 dark:text-slate-350 leading-relaxed border border-slate-100/50 dark:border-slate-850">
                      {selectedAppt.description}
                    </div>
                  )}
                </div>

                {/* Google Calendar Link */}
                {selectedAppt.googleEventId && (
                  <a
                    href={`https://calendar.google.com/calendar/event?eid=${selectedAppt.googleEventId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/50 border border-blue-100/60 text-[10px] text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400 font-semibold hover:bg-blue-100/80 dark:hover:bg-blue-950/40 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{t('calendar.viewInGoogle')}</span>
                  </a>
                )}

                {/* Lead reference */}
                {selectedAppt.leadId && (
                  <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100/60 text-[10px] text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400 flex items-center gap-2 font-semibold">
                    <Star className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{t('calendar.linkedLead')}: <strong className="font-bold text-blue-800 dark:text-blue-300">{leads.find(l => l.id === selectedAppt.leadId)?.name || selectedAppt.leadId}</strong></span>
                  </div>
                )}

                {/* Status actions */}
                {selectedAppt.status === 0 && (
                  <button
                    onClick={async () => {
                      await updateAppointment(selectedAppt.id, { status: 1 });
                      setSelectedAppt(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/40 text-green-700 dark:text-green-400 font-bold text-xs border border-green-200/50 dark:border-green-900/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('calendar.markCompleted')}</span>
                  </button>
                )}

              </div>
            </div>
          </div>
        );
      })()}

      {/* Add/Edit Appointment Modal */}
      {showAddModal && (
        <AppointmentFormModal
          editingAppt={editingAppt}
          selectedDate={selectedDate}
          syncToGoogle={syncToGoogle}
          calendarConnected={calendarConnected}
          onClose={() => { setShowAddModal(false); setEditingAppt(null); }}
          onSave={async (data) => {
            if (editingAppt) {
              await updateAppointment(editingAppt.id, data);
              if (syncToGoogle && calendarConnected) {
                try {
                  await api.patch(`/api/calendar/events/${editingAppt.googleEventId || ''}`, data);
                } catch (err) {
                  console.warn('Google Calendar sync failed on update:', err);
                }
              }
            } else {
              await addAppointment(data);
              if (syncToGoogle && calendarConnected) {
                try {
                  await api.post<{ googleEventId: string }>('/api/calendar/events', data);
                } catch (err) {
                  console.warn('Google Calendar sync failed on create:', err);
                }
              }
            }
            setShowAddModal(false);
            setEditingAppt(null);
          }}
        />
      )}
    </div>
  );
};

interface FormModalProps {
  editingAppt: Appointment | null;
  selectedDate: Date | null;
  syncToGoogle?: boolean;
  calendarConnected?: boolean;
  onClose: () => void;
  onSave: (data: AppointmentFormData) => Promise<void>;
}

const AppointmentFormModal: React.FC<FormModalProps> = ({ editingAppt, selectedDate, syncToGoogle, calendarConnected, onClose, onSave }) => {
  const { leads } = useCRM();
  const { t } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(editingAppt?.title || '');
  const [description, setDescription] = useState(editingAppt?.description || '');
  const [startTime, setStartTime] = useState(() => {
    if (editingAppt) return editingAppt.startTime.substring(0, 16);
    if (selectedDate) {
      const d = selectedDate;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T09:00`;
    }
    return '';
  });
  const [endTime, setEndTime] = useState(() => {
    if (editingAppt) return editingAppt.endTime.substring(0, 16);
    if (selectedDate) {
      const d = selectedDate;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T10:00`;
    }
    return '';
  });
  const [type, setType] = useState<AppointmentType>(editingAppt?.type || 'meeting');
  const [status, setStatus] = useState<AppointmentStatus>(editingAppt?.status ?? 0);
  const [location, setLocation] = useState(editingAppt?.location || '');
  const [leadId, setLeadId] = useState(editingAppt?.leadId || '');
  
  // Use state objects for guests
  const [guests, setGuests] = useState<GuestInfo[]>(() => parseGuests(editingAppt?.guests));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleEmployee = (name: string, email: string) => {
    setGuests((prev) => {
      const exists = prev.some((g) => g.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        return prev.filter((g) => g.name.toLowerCase() !== name.toLowerCase());
      } else {
        return [...prev, { name, email, status: 2 }];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime || isSubmitting) return;
    setIsSubmitting(true);
    await onSave({
      leadId,
      title,
      description,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      type,
      status,
      location,
      guests: serializeGuests(guests),
    });
    setIsSubmitting(false);
  };

  const apptTypeOptions: { value: AppointmentType; label: string; icon: React.ReactNode }[] = [
    { value: 'activity', label: t('type.activity'), icon: <Star className="w-4 h-4" /> },
    { value: 'meeting', label: t('type.meeting'), icon: <Users className="w-4 h-4" /> },
    { value: 'appointment', label: t('type.appointment'), icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-2xl w-full max-w-3xl flex flex-col max-h-[95vh] md:max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 text-white flex items-center justify-between shrink-0 rounded-t-3xl border-b border-blue-500/20 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center shadow-md">
              <Calendar className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-tight">{editingAppt ? t('calendar.editEvent') : t('calendar.newEvent')}</h3>
              <p className="text-xs text-blue-100/90">{editingAppt ? t('calendar.editEventDesc') : t('calendar.newEventDesc')}</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Column: core info (col-span-7) */}
            <div className="md:col-span-7 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('calendar.title')} *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Product Demo"
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('calendar.start')} *</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('calendar.end')} *</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('calendar.location')}</label>
                <div className="relative">
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Google Meet, Phone, Office"
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 pl-10 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('calendar.description')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes, agenda, or call details..."
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all resize-none shadow-xs"
                />
              </div>
            </div>

            {/* Right Column: classification & people (col-span-5) */}
            <div className="md:col-span-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('calendar.eventType')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {apptTypeOptions.map((opt) => {
                    const isSelected = type === opt.value;
                    const colors = {
                      activity: { active: 'bg-green-50/80 border-green-400 text-green-700 dark:bg-green-950/40 dark:border-green-800 dark:text-green-400', inactive: 'hover:bg-green-50/30 dark:hover:bg-green-950/10' },
                      meeting: { active: 'bg-blue-50/80 border-blue-400 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400', inactive: 'hover:bg-blue-50/30 dark:hover:bg-blue-950/10' },
                      appointment: { active: 'bg-purple-50/80 border-purple-400 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400', inactive: 'hover:bg-purple-50/30 dark:hover:bg-purple-950/10' }
                    }[opt.value] || { active: 'bg-slate-100 border-slate-300 text-slate-800', inactive: 'hover:bg-slate-50' };

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        className={`flex items-center gap-2 px-2.5 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? `${colors.active} border-2 shadow-xs scale-[1.02]`
                            : `bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 ${colors.inactive}`
                        }`}
                      >
                        <div className={`p-1 rounded-lg ${isSelected ? 'bg-white dark:bg-slate-900 shadow-xs' : 'bg-slate-200/50 dark:bg-slate-800'}`}>
                          {opt.icon}
                        </div>
                        <span>{opt.label.split('-')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('calendar.status')}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(Number(e.target.value) as AppointmentStatus)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
                  >
                    <option value={0}>{t('status.scheduled')}</option>
                    <option value={1}>{t('status.completed')}</option>
                    <option value={2}>{t('status.cancelled')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('calendar.linkedLead')}</label>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
                  >
                    <option value="">{t('calendar.noLinkedLead') || 'No linked lead'}</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.channel})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {t('calendar.assignMembers')}
                </label>
                
                {/* Search employees by name or email */}
                <div className="relative mb-2.5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('calendar.searchMembers')}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2 pl-9 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200/80 dark:border-slate-700/50 rounded-2xl p-2 space-y-1 max-h-[190px] overflow-y-auto">
                  {TEAM_MEMBERS.filter((emp) => 
                    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((emp) => {
                    const guest = guests.find((g) => g.name.toLowerCase() === emp.name.toLowerCase());
                    const selected = !!guest;
                    return (
                      <div
                        key={emp.id}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-all duration-150 border ${
                          selected
                            ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50'
                            : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 border-transparent'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 py-0.5">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleEmployee(emp.name, emp.email)}
                            className="checkbox checkbox-xs checkbox-primary rounded-md shrink-0 focus:ring-0"
                          />
                          <div className="w-7 h-7 rounded-full border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shrink-0">
                            <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{emp.name}</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">{emp.email}</p>
                          </div>
                        </label>
                        
                        {/* RSVP Status dropdown for selected guests */}
                        {selected && (
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <select
                              value={guest.status}
                              onChange={(e) => {
                                const newStatus = Number(e.target.value) as 0 | 1 | 2;
                                setGuests((prev) =>
                                  prev.map((g) =>
                                    g.name.toLowerCase() === emp.name.toLowerCase() ? { ...g, status: newStatus } : g
                                  )
                                );
                              }}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold rounded-lg px-2 py-0.5 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                            >
                              <option value={2}>{t('guest.awaiting')}</option>
                              <option value={0}>{t('guest.yes')}</option>
                              <option value={1}>{t('guest.no')}</option>
                            </select>
                            <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {guests.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {guests.map((g) => {
                        const emp = TEAM_MEMBERS.find((e) => e.name === g.name);
                        if (!emp) return null;
                        return (
                          <div key={g.name} className="relative">
                            <img
                              src={emp.avatar}
                              alt={g.name}
                              title={`${g.name} (${t('guest.' + (g.status === 0 ? 'yes' : g.status === 1 ? 'no' : 'awaiting'))})`}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                            />
                            {/* Little indicator badge for RSVP */}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                              g.status === 0 ? 'bg-green-500' :
                              g.status === 1 ? 'bg-red-500' :
                              'bg-slate-400'
                            }`} />
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {guests.length === 1
                        ? t('calendar.membersAssigned').replace('{count}', '1')
                        : t('calendar.membersAssigned').replace('{count}', String(guests.length))}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sync indicator */}
          {calendarConnected && syncToGoogle && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              <Check className="w-3 h-3" />
              <span>{t('calendar.willSync')}</span>
            </div>
          )}
          {calendarConnected && !syncToGoogle && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-[10px] font-bold text-slate-400 dark:text-slate-500">
              <ExternalLink className="w-3 h-3" />
              <span>{t('calendar.syncOff')}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              {t('calendar.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-md flex items-center gap-2 hover-lift transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{editingAppt ? t('calendar.update') : t('calendar.create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
