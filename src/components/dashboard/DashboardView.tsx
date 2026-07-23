import React from 'react';
import { useCRM } from '../../context/CRMContext';
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
              <h3 className="text-base font-bold text-slate-900">Pipeline Funnel Distribution</h3>
              <p className="text-xs text-slate-500">Live breakdown of deals by sales stage</p>
            </div>

            <button
              onClick={() => setCurrentView('pipeline')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              <span>View All Kanban</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Visual Stage Progress Bar */}
          <div className="space-y-4">
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
              <div style={{ width: `${(stageCounts.lead_in / deals.length) * 100}%` }} className="bg-slate-400 h-full" title="Lead In" />
              <div style={{ width: `${(stageCounts.contacted / deals.length) * 100}%` }} className="bg-blue-400 h-full" title="Contacted" />
              <div style={{ width: `${(stageCounts.proposal / deals.length) * 100}%` }} className="bg-blue-600 h-full" title="Proposal" />
              <div style={{ width: `${(stageCounts.negotiation / deals.length) * 100}%` }} className="bg-amber-500 h-full" title="Negotiation" />
              <div style={{ width: `${(stageCounts.closed_won / deals.length) * 100}%` }} className="bg-emerald-500 h-full" title="Closed Won" />
              <div style={{ width: `${(stageCounts.closed_lost / deals.length) * 100}%` }} className="bg-rose-400 h-full" title="Closed Lost" />
            </div>

            {/* Stages Legend Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-slate-500">Lead In</p>
                  <p className="text-sm font-extrabold text-slate-900">{stageCounts.lead_in} Deals</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-blue-700">Contacted</p>
                  <p className="text-sm font-extrabold text-slate-900">{stageCounts.contacted} Deals</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-blue-800">Proposal</p>
                  <p className="text-sm font-extrabold text-slate-900">{stageCounts.proposal} Deals</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-amber-700">Negotiation</p>
                  <p className="text-sm font-extrabold text-slate-900">{stageCounts.negotiation} Deals</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-emerald-700">Closed Won</p>
                  <p className="text-sm font-extrabold text-slate-900">{stageCounts.closed_won} Deals</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-rose-700">Closed Lost</p>
                  <p className="text-sm font-extrabold text-slate-900">{stageCounts.closed_lost} Deals</p>
                </div>
              </div>
            </div>
          </div>

          {/* High Priority Deals List */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Top High Priority Deals</h4>
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
                      {deal.probability}% Win Prob
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
                <h3 className="text-sm font-bold text-slate-900">RelateFlows Triggers</h3>
              </div>

              <button
                onClick={() => setCurrentView('workflows')}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                Manage All
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
                      checked={wf.status === 'active'}
                      onChange={() => toggleWorkflowStatus(wf.id)}
                      className="toggle toggle-primary toggle-xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{wf.trigger}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>{wf.executionsCount} runs</span>
                    <span className="font-semibold text-yellow-600">{wf.lastExecuted}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log Feed */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Recent CRM Activity
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
