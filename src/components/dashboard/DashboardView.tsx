import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import Chart from 'react-apexcharts';
import type {} from 'apexcharts';
import { 
  TrendingUp, 
  Award, 
  Briefcase, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight,
  Building2
} from 'lucide-react';
export const DashboardView: React.FC = () => {
  const { isLoading, deals, stages, workflows, activities, metrics, setCurrentView, toggleWorkflowStatus } = useCRM();
  const { t } = useSettings();

  // Calculate high-level pipeline stats
  const stageCounts: Record<string, number> = {};
  stages.forEach((s) => {
    stageCounts[s.id] = deals.filter(d => d.stage === s.id).length;
  });

  const getMetricIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'Award': return <Award className="w-5 h-5 text-yellow-500" />;
      case 'Briefcase': return <Briefcase className="w-5 h-5 text-blue-600" />;
      case 'Zap': return <Zap className="w-5 h-5 text-yellow-500" />;
      default: return <TrendingUp className="w-5 h-5 text-blue-600" />;
    }
  };

  const stageNames = [
    t('dashboard.stage.leadIn'),
    t('dashboard.stage.contacted'),
    t('dashboard.stage.proposal'),
    t('dashboard.stage.negotiation'),
    t('dashboard.stage.closedWon'),
    t('dashboard.stage.closedLost'),
  ];
  const stageKeys = ['lead_in', 'contacted', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
  const stageColors = ['#94A3B8', '#60A5FA', '#2563ED', '#F59E0B', '#10B981', '#FB7185'];

  const legendItems = [
    { key: 'lead_in', color: 'bg-slate-400', bg: 'bg-slate-50', border: 'border-slate-100', textColor: 'text-slate-500', labelKey: 'dashboard.stage.leadIn' },
    { key: 'contacted', color: 'bg-blue-400', bg: 'bg-blue-50', border: 'border-blue-100', textColor: 'text-blue-700', labelKey: 'dashboard.stage.contacted' },
    { key: 'proposal', color: 'bg-blue-600', bg: 'bg-blue-50/80', border: 'border-blue-200', textColor: 'text-blue-800', labelKey: 'dashboard.stage.proposal' },
    { key: 'negotiation', color: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', textColor: 'text-amber-700', labelKey: 'dashboard.stage.negotiation' },
    { key: 'closed_won', color: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', textColor: 'text-emerald-700', labelKey: 'dashboard.stage.closedWon' },
    { key: 'closed_lost', color: 'bg-rose-400', bg: 'bg-rose-50', border: 'border-rose-100', textColor: 'text-rose-700', labelKey: 'dashboard.stage.closedLost' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="rounded-3xl bg-slate-100 p-8">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="skeleton h-4 w-96 mb-3" />
          <div className="skeleton h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-32 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-96 w-full rounded-2xl" />
          <div className="space-y-6">
            <div className="skeleton h-64 w-full rounded-2xl" />
            <div className="skeleton h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover-lift relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{metric.title}</span>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                {getMetricIcon(metric.iconName)}
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-extrabold text-slate-900">{metric.value}</h3>
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md ${
                  metric.isPositive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {metric.isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {metric.change}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 font-medium">{metric.subtext}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Summary & Recent Deals Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Stage Distribution Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('dashboard.pipelineFunnel')}</h3>
              <p className="text-xs text-slate-500">{t('dashboard.pipelineFunnel.desc')}</p>
            </div>

            <button
              onClick={() => setCurrentView('pipeline')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              <span>{t('dashboard.viewKanban')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Visual Stage Distribution Chart */}
          <div className="space-y-4">
            {(() => {
              const series = stageKeys.map(k => stageCounts[k] || 0);
              const barOptions: ApexCharts.ApexOptions = {
                chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
                colors: stageColors,
                plotOptions: { bar: { borderRadius: 4, horizontal: true, distributed: true, barHeight: '70%' } },
                xaxis: { labels: { style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' } } },
                yaxis: { labels: { style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' } } },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 700, colors: ['#fff'] }, formatter: (v) => t('dashboard.stage.deals').replace('{v}', String(v)) },
                tooltip: { y: { formatter: (v) => t('dashboard.stage.deals').replace('{v}', String(v)) } },
                legend: { show: false },
              };
              return <Chart options={barOptions} series={[{ data: series.map((v, i) => ({ x: stageNames[i], y: v })) }]} type="bar" height={260} />;
            })()}

            {/* Stages Legend Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {legendItems.map((item) => (
                <div key={item.key} className={`p-3 rounded-xl ${item.bg} border ${item.border} flex items-center gap-3`}>
                  <div className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
                  <div>
                    <p className={`text-[11px] font-bold ${item.textColor}`}>{t(item.labelKey)}</p>
                    <p className="text-sm font-extrabold text-slate-900">{stageCounts[item.key] || 0} {t('dashboard.stage.deals').replace('{v}', String(stageCounts[item.key] || 0))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High Priority Deals List */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('dashboard.topDeals')}</h4>
            <div className="space-y-2.5">
              {deals.filter(d => d.priority === 'high').slice(0, 3).map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-100 text-yellow-700 font-bold flex items-center justify-center text-xs shrink-0">
                      ${(deal.value / 1000).toFixed(0)}k
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{deal.title}</h5>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {deal.company} • {deal.contactName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-slate-800">${deal.value.toLocaleString()}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                      {t('dashboard.winProb').replace('{prob}', String(deal.probability))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Spotlight: RelateFlows Workflows & Activity Feed */}
        <div className="space-y-6">
          {/* Active Workflows Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <h3 className="text-sm font-bold text-slate-900">{t('dashboard.triggers')}</h3>
              </div>

              <button
                onClick={() => setCurrentView('workflows')}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                {t('dashboard.manageAll')}
              </button>
            </div>

            <div className="space-y-3">
              {workflows.slice(0, 3).map((wf) => (
                <div
                  key={wf.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 hover:border-yellow-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 truncate pr-2">{wf.title}</h5>
                    <input
                      type="checkbox"
                      checked={wf.status === 0}
                      onChange={() => toggleWorkflowStatus(wf.id)}
                      className="toggle toggle-primary toggle-xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{wf.trigger}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>{t('dashboard.runs').replace('{count}', String(wf.executionsCount))}</span>
                    <span className="font-semibold text-yellow-600">{wf.lastExecuted}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log Feed */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              {t('dashboard.recentActivity')}
            </h3>

            <div className="space-y-4">
              {activities.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex gap-3 text-xs">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {activity.type === 'deal_won' ? '🎉' : activity.type === 'meeting' ? '📅' : '⚡'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{activity.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{activity.description}</p>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">{activity.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
