import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import Chart from 'react-apexcharts';
import type {} from 'apexcharts';
import {
  Target,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { isLoading, deals } = useCRM();
  const { t } = useSettings();

  const totalValue = deals.reduce((acc, d) => acc + d.value, 0);
  const wonDeals = deals.filter(d => d.stage === 'closed_won');
  const wonValue = wonDeals.reduce((acc, d) => acc + d.value, 0);
  const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

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

  const revenueBarOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#1D4ED8'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '60%' } },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      labels: { style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' } },
    },
    yaxis: {
      labels: { style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' }, formatter: (v) => `$${v}k` },
    },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `$${v}k` } },
    dataLabels: { enabled: false },
  };

  const revenueBarSeries = [
    { name: 'Revenue', data: [90, 110, 140, 120, 170, 190, 210] },
  ];

  const pieOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: leadSources.map(s => s.source),
    colors: ['#2563EB', '#EAB308', '#F59E0B', '#94A3B8'],
    plotOptions: { pie: { donut: { size: '55%' }, expandOnClick: false } },
    legend: { position: 'bottom', fontSize: '11px', fontWeight: 600, markers: { size: 6 } },
    dataLabels: { enabled: true, formatter: (_val: number, opts: any) => `${opts.w.globals.series[opts.seriesIndex]}%` },
    tooltip: { y: { formatter: (_v: number, opts?: any) => `${leadSources[opts?.seriesIndex]?.value || ''} (${_v}%)` } },
  };

  const pieSeries = leadSources.map(s => s.percent);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('analytics.totalArr')}</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">${totalValue.toLocaleString()}</h3>
          <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> {t('analytics.yoyGrowth')}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('analytics.closedWon')}</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">${wonValue.toLocaleString()}</h3>
          <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t('analytics.q3Target')}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('analytics.winRate')}</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{winRate}%</h3>
          <p className="text-xs text-yellow-600 font-semibold mt-1 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-yellow-500" /> {t('analytics.benchmark')}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('analytics.cycleLength')}</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{t('analytics.cycleDays')}</h3>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            {t('analytics.faster')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('analytics.monthlyRevenue')}</h3>
              <p className="text-xs text-slate-500">{t('analytics.monthlyRevenue.desc')}</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {t('analytics.q3')}
            </span>
          </div>

          <Chart options={revenueBarOptions} series={revenueBarSeries} type="bar" height={280} />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            {t('analytics.leadSource')}
          </h3>

          <Chart options={pieOptions} series={pieSeries} type="donut" height={280} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          {t('analytics.leaderboard')}
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
                <p className="text-[10px] text-emerald-600 font-bold">{t('analytics.dealsWon').replace('{count}', String(member.count))}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
