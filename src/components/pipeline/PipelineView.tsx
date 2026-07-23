import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import type { DealStage } from '../../types/crm';
import { Plus, Filter, Building2, GripVertical } from 'lucide-react';

const BADGE_COLORS: Record<string, string> = {
  high: 'bg-rose-50 text-rose-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
};

export const PipelineView: React.FC = () => {
  const { isLoading, deals, stages, updateDealStage, deleteDeal, setIsAddDealModalOpen, setSelectedDeal } = useCRM();
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const filteredDeals = deals.filter((deal) => {
    return priorityFilter === 'all' || deal.priority === priorityFilter;
  });

  const totalValue = filteredDeals.reduce((sum, d) => sum + d.value, 0);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(dealId);
  };

  const handleDragEnd = () => setDraggingId(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain');
    if (dealId) updateDealStage(dealId, targetStage);
    setDraggingId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="skeleton h-20 w-full rounded-2xl" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton h-96 min-w-[280px] w-[280px] rounded-2xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Sales Pipeline</h3>
          <p className="text-xs text-slate-500">
            {filteredDeals.length} deals &middot; ${totalValue.toLocaleString()} total &middot; {stages.length} stages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddDealModalOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md rf-yellow-glow flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Deal</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-5 overflow-x-auto pb-4" style={{ minHeight: '600px' }}>
        {stages.map((stage) => {
          const stageDeals = filteredDeals.filter((d) => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div
              key={stage.id}
              className="min-w-[280px] w-[280px] shrink-0 flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 truncate">{stage.label}</h4>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                    {stageDeals.length}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-500">${(stageTotal / 1000).toFixed(0)}k</span>
              </div>

              {/* Cards Container */}
              <div className={`flex-1 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2.5 space-y-2.5 transition-colors ${draggingId ? 'ring-2 ring-blue-400/30' : ''}`}>
                {stageDeals.length === 0 ? (
                  <div className="h-24 border-2 border-dashed border-slate-200/60 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
                    Drop deals here
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedDeal(deal)}
                      className={`bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer ${draggingId === deal.id ? 'opacity-40 scale-95' : 'hover:scale-[1.01]'}`}
                    >
                      <div className="h-1 rounded-t-xl" style={{ backgroundColor: stage.color }} />
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5 cursor-grab" onMouseDown={(e) => e.stopPropagation()} />
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 truncate">{deal.title}</h5>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 shrink-0" />
                                <span className="truncate">{deal.company}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteDeal(deal.id); }}
                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                          >
                            <Plus className="w-3 h-3 rotate-45" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold text-slate-900">${deal.value.toLocaleString()}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {deal.probability}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <img src={deal.owner.avatar} alt={deal.owner.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200" />
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[80px]">{deal.contactName.split(' ')[0]}</span>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${BADGE_COLORS[deal.priority] || 'bg-slate-100 text-slate-500'}`}>
                            {deal.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
