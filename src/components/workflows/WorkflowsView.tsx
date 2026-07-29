import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import { 
  Zap, 
  Plus, 
  ArrowRight, 
  Activity
} from 'lucide-react';

export const WorkflowsView: React.FC = () => {
  const { isLoading, workflows, toggleWorkflowStatus, setIsAddWorkflowModalOpen } = useCRM();
  const { t } = useSettings();

  const totalExecutions = workflows.reduce((acc, w) => acc + w.executionsCount, 0);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="skeleton h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-48 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Engine Overview Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
            <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
            RelateFlows Smart Automation Engine
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Automate Sales & Lead Workflows</h2>
          <p className="text-slate-500 text-xs leading-relaxed">
            Eliminate repetitive tasks. Automatically route deals, send onboarding emails, escalate high-score leads, and trigger Slack notifications.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400 font-semibold">Total Execution Runs</p>
            <p className="text-2xl font-extrabold text-blue-600">{totalExecutions.toLocaleString()}</p>
          </div>

          <button
            onClick={() => setIsAddWorkflowModalOpen(true)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* Active Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className={`bg-white rounded-2xl border ${
              wf.status === 0 ? 'border-blue-200 shadow-sm' : 'border-slate-200 opacity-75'
            } p-6 space-y-4 hover:shadow-md transition-all duration-200 relative overflow-hidden`}
          >
            {/* Top Bar: Title, Category, Toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
                  wf.status === 0 ? 'bg-yellow-500 rf-yellow-glow' : 'bg-slate-400'
                }`}>
                  <Zap className="w-5 h-5 fill-current" />
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{wf.title}</h3>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {wf.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  wf.status === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {wf.status === 0 ? t('status.active').toUpperCase() : t('status.paused').toUpperCase()}
                </span>

                <input
                  type="checkbox"
                  checked={wf.status === 0}
                  onChange={() => toggleWorkflowStatus(wf.id)}
                  className="toggle toggle-primary toggle-sm"
                />
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {wf.description}
            </p>

            {/* Visual Workflow Nodes Flow Diagram */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {/* Trigger Node */}
              <div className="w-full sm:w-1/2 p-2.5 rounded-lg bg-white border border-blue-200 shadow-2xs">
                <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block mb-0.5">
                  WHEN (Trigger)
                </span>
                <p className="font-bold text-slate-800 text-xs truncate">{wf.trigger}</p>
              </div>

              <ArrowRight className="w-4 h-4 text-yellow-500 shrink-0 hidden sm:block stroke-[2.5]" />

              {/* Action Node */}
              <div className="w-full sm:w-1/2 p-2.5 rounded-lg bg-white border border-yellow-200 shadow-2xs">
                <span className="text-[9px] font-extrabold text-yellow-600 uppercase tracking-wider block mb-0.5">
                  THEN (Action)
                </span>
                <p className="font-bold text-slate-800 text-xs truncate">{wf.action}</p>
              </div>
            </div>

            {/* Footer Metrics */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1 font-medium">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                {wf.executionsCount} total executions
              </span>
              <span className="font-semibold text-slate-600">Last triggered: {wf.lastExecuted}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
