import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { 
  Target, 
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { isLoading, deals } = useCRM();

  const totalValue = deals.reduce((acc, d) => acc + d.value, 0);
  const wonDeals = deals.filter(d => d.stage === 'closed_won');
  const wonValue = wonDeals.reduce((acc, d) => acc + d.value, 0);
  const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

  // Source attribution mock math
  const leadSources = [
    { source: 'Inbound Website', count: 4, value: '$220,000', percent: 45, color: 'bg-blue-600' },
    { source: 'Outbound Campaign', count: 2, value: '$210,000', percent: 35, color: 'bg-yellow-500' },
    { source: 'Partner Referral', count: 1, value: '$48,000', percent: 12, color: 'bg-amber-500' },
    { source: 'LinkedIn & Webinars', count: 2, value: '$123,000', percent: 8, color: 'bg-slate-400' },
  ];

  const teamLeaderboard = [
    { name: 'Sarah Connor', role: 'Head of Sales', won: '$385,000', count: 3, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { name: 'Alex Rivera', role: 'Senior AE', won: '$143,000', count: 2, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { name: 'Marcus Brody', role: 'Account Executive', won: '$62,000', count: 2, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-80 w-full rounded-2xl" />
          <div className="skeleton h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pipeline ARR</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">${totalValue.toLocaleString()}</h3>
          <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +18.4% YoY Growth
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Closed Won Revenue</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">${wonValue.toLocaleString()}</h3>
          <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 60% of Q3 Target
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Win Rate</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{winRate}%</h3>
          <p className="text-xs text-yellow-600 font-semibold mt-1 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-yellow-500" /> Benchmark: 25%
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sales Cycle Length</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">21 Days</h3>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            4 days faster with RelateFlows
          </p>
        </div>
      </div>

      {/* Main Charts & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Visual Bar Chart (Custom SVG bar chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Revenue & Forecast</h3>
              <p className="text-xs text-slate-500">Historical performance & Q3 forecast breakdown</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Q3 2026
            </span>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="h-64 flex items-end justify-between gap-4 pt-6 px-2">
            {[
              { month: 'Jan', value: 45, label: '$90k' },
              { month: 'Feb', value: 55, label: '$110k' },
              { month: 'Mar', value: 70, label: '$140k' },
              { month: 'Apr', value: 60, label: '$120k' },
              { month: 'May', value: 85, label: '$170k' },
              { month: 'Jun', value: 95, label: '$190k' },
              { month: 'Jul (Current)', value: 120, label: '$210k', isCurrent: true },
            ].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <span className="text-[10px] font-extrabold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.label}
                </span>
                <div
                  style={{ height: `${(bar.value / 130) * 100}%` }}
                  className={`w-full rounded-t-xl transition-all duration-300 ${
                    bar.isCurrent
                      ? 'bg-gradient-to-t from-yellow-500 to-yellow-400 shadow-md rf-yellow-glow'
                      : 'bg-gradient-to-t from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-600">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Source Attribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Lead Source Attribution
          </h3>

          <div className="space-y-4">
            {leadSources.map((ls, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>{ls.source}</span>
                  <span className="text-slate-600">{ls.value} ({ls.percent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className={`${ls.color} h-full rounded-full`} style={{ width: `${ls.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Sales Leaderboard */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Sales Team Leaderboard (Q3)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teamLeaderboard.map((member, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:border-blue-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={member.avatar} alt={member.name} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-500" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-yellow-500 text-white text-[10px] font-extrabold flex items-center justify-center border border-white">
                    #{idx + 1}
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">{member.name}</h4>
                  <p className="text-[11px] text-slate-500">{member.role}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-extrabold text-slate-900">{member.won}</p>
                <p className="text-[10px] text-emerald-600 font-bold">{member.count} deals won</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
