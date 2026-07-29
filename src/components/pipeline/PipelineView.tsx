import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import Chart from 'react-apexcharts';
import type { DealStage } from '../../types/crm';
import { Plus, Filter, Building2, GripVertical, LayoutPanelTop, GanttChartSquare, CalendarDays, CalendarRange, ZoomIn, ZoomOut } from 'lucide-react';

type ZoomLevel = 'day' | 'week' | 'month' | 'year' | 'all';

const ZOOM_ICONS: Record<ZoomLevel, React.ReactNode> = {
  day: <ZoomIn className="w-3.5 h-3.5" />,
  week: <CalendarDays className="w-3.5 h-3.5" />,
  month: <CalendarRange className="w-3.5 h-3.5" />,
  year: <ZoomOut className="w-3.5 h-3.5" />,
  all: <ZoomOut className="w-3.5 h-3.5" />,
};

function fmt(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtFull(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

const BADGE_COLORS: Record<string, string> = {
  high: 'bg-rose-50 text-rose-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
};

export const PipelineView: React.FC = () => {
  const { isLoading, deals, stages, updateDealStage, deleteDeal, setIsAddDealModalOpen, setSelectedDeal, searchQuery } = useCRM();
  const { t } = useSettings();
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');

  const filteredDeals = deals.filter((deal) => {
    if (priorityFilter !== 'all' && deal.priority !== priorityFilter) return false;
    if (searchQuery && !deal.title.toLowerCase().includes(searchQuery.toLowerCase()) && !deal.company.toLowerCase().includes(searchQuery.toLowerCase()) && !(deal.contactName || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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

  const ganttOptions: ApexCharts.ApexOptions = useMemo(() => {
    const defaultColor = '#1D4ED8';
    const sortedStages = stages;

    const planData: { x: string; y: [number, number]; }[] = [];
    const actualData: { x: string; y: [number, number]; fillColor: string; }[] = [];

    filteredDeals.forEach(deal => {
      const start = new Date(deal.createdAt).getTime();
      const end = deal.expectedCloseDate ? new Date(deal.expectedCloseDate).getTime() : start;

      const stageIndex = sortedStages.findIndex(s => s.id === deal.stage);
      const progress = sortedStages.length > 0 ? (stageIndex + 1) / sortedStages.length : 0.5;
      const actualEnd = start + (end - start) * progress;

      const stageColor = sortedStages.find(s => s.id === deal.stage)?.color || defaultColor;

      planData.push({ x: deal.title, y: [start, end] });
      actualData.push({ x: deal.title, y: [start, Math.max(start, actualEnd)], fillColor: stageColor });
    });

    const allDates = filteredDeals.flatMap(d => [new Date(d.createdAt).getTime(), d.expectedCloseDate ? new Date(d.expectedCloseDate).getTime() : new Date(d.createdAt).getTime()]);
    const minDate = allDates.length > 0 ? Math.min(...allDates) : Date.now();
    const maxDate = allDates.length > 0 ? Math.max(...allDates) : Date.now();
    const totalSpan = maxDate - minDate;
    const pad = totalSpan * 0.15 || 86400000;

    let xMin: number | undefined;
    let xMax: number | undefined;
    let datetimeFormatter: Record<string, string | undefined>;
    let tickAmount: number | undefined;

    const now = Date.now();

    switch (zoomLevel) {
      case 'day':
        xMin = now - 3 * 86400000;
        xMax = now + 3 * 86400000;
        datetimeFormatter = { day: 'dd MMM', month: undefined, year: undefined };
        tickAmount = 7;
        break;
      case 'week':
        xMin = now - 7 * 86400000;
        xMax = now + 7 * 86400000;
        datetimeFormatter = { day: 'dd MMM', month: undefined, year: undefined };
        tickAmount = 14;
        break;
      case 'month':
        xMin = now - 45 * 86400000;
        xMax = now + 45 * 86400000;
        datetimeFormatter = { month: "MMM 'yy", day: 'dd', year: undefined };
        tickAmount = undefined;
        break;
      case 'year':
        xMin = now - 183 * 86400000;
        xMax = now + 183 * 86400000;
        datetimeFormatter = { month: 'MMM', year: "yyyy", day: undefined };
        tickAmount = 12;
        break;
      case 'all':
        xMin = minDate - pad;
        xMax = maxDate + pad;
        datetimeFormatter = { month: "MMM 'yy", day: undefined, year: 'yyyy' };
        tickAmount = undefined;
        break;
    }

    return {
      chart: {
        type: 'rangeBar',
        toolbar: { show: true, tools: { zoom: true, pan: true, reset: true } },
        fontFamily: 'inherit',
        animations: { enabled: true },
        events: {
          dataPointSelection: (_event: any, _chartContext: any, config: any) => {
            const { seriesIndex, dataPointIndex } = config;
            if (seriesIndex === 1) {
              const title = actualData[dataPointIndex]?.x;
              if (title) {
                const deal = filteredDeals.find(d => d.title === title);
                if (deal) setSelectedDeal(deal);
              }
            }
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '70%',
          rangeBarGroupRows: true,
        },
      },
      xaxis: {
        type: 'datetime',
        min: xMin,
        max: xMax,
        tickAmount,
        labels: {
          style: { fontSize: '10px', fontWeight: 600, colors: '#64748b' },
          datetimeFormatter,
        },
      },
      yaxis: {
        labels: {
          style: { fontSize: '10px', fontWeight: 600, colors: '#334155' },
          maxWidth: 180,
        },
      },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
      tooltip: {
        custom: ({ seriesIndex, dataPointIndex, w }: any) => {
          const s = w.globals.series[seriesIndex];
          const dp = s?.data?.[dataPointIndex];
          if (!dp) return '';
          const start = new Date(dp.y[0]);
          const end = new Date(dp.y[1]);
          const label = seriesIndex === 0 ? t('pipeline.plan') : t('pipeline.actual');
          const deal = filteredDeals.find(d => d.title === dp.x);
          return `<div class="p-3 text-xs space-y-1.5" style="font-family:inherit;min-width:200px">
            <div class="font-bold text-slate-900 text-sm">${dp.x}</div>
            <div class="flex items-center gap-2 text-slate-500">
              <span class="inline-block w-2 h-2 rounded-full ${seriesIndex === 0 ? 'bg-slate-300' : 'bg-blue-600'}"></span>
              <span class="font-semibold">${label}</span>
              <span>${fmtFull(start)} – ${fmtFull(end)}</span>
            </div>
            ${deal ? `<div class="border-t border-slate-100 pt-1.5 mt-1.5 space-y-1">
              <div class="flex justify-between text-slate-600"><span>${t('pipeline.tooltip.company')}</span><span class="font-bold text-slate-900">${deal.company}</span></div>
              <div class="flex justify-between text-slate-600"><span>${t('pipeline.tooltip.value')}</span><span class="font-bold text-blue-600">$${deal.value.toLocaleString()}</span></div>
              <div class="flex justify-between text-slate-600"><span>${t('pipeline.tooltip.contact')}</span><span class="font-semibold text-slate-900">${deal.contactName}</span></div>
              <div class="flex justify-between text-slate-600"><span>${t('pipeline.tooltip.stage')}</span><span class="font-semibold text-slate-900">${stages.find(s => s.id === deal.stage)?.label || deal.stage}</span></div>
            </div>` : ''}
          </div>`;
        },
      },
      legend: { show: true, position: 'top', fontSize: '11px', fontWeight: 600, markers: { size: 8 } },
      dataLabels: {
        enabled: true,
        formatter: (val: any) => {
          if (!val || !Array.isArray(val) || val.length < 2) return '';
          return `${fmt(new Date(val[0]))} – ${fmt(new Date(val[1]))}`;
        },
        style: { fontSize: '9px', fontWeight: 500, colors: ['#94a3b8', '#1e293b'] },
        offsetX: 0,
        background: { enabled: true, foreColor: '#fff', padding: 2, borderRadius: 3, borderWidth: 0, opacity: 0.85 },
      },
      colors: ['#cbd5e1', '#1D4ED8'],
      series: [
        { name: t('pipeline.plan'), data: planData },
        { name: t('pipeline.actual'), data: actualData },
      ],
    };
  }, [stages, filteredDeals, zoomLevel, setSelectedDeal]);

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
          <h3 className="text-lg font-extrabold text-slate-900">{t('pipeline.title')}</h3>
          <p className="text-xs text-slate-500">
            {t('pipeline.desc')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="bg-slate-100 rounded-xl p-1 flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutPanelTop className="w-3.5 h-3.5" />
              <span>{t('pipeline.viewToggle.kanban')}</span>
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'gantt' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GanttChartSquare className="w-3.5 h-3.5" />
              <span>{t('pipeline.viewToggle.gantt')}</span>
            </button>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">{t('pipeline.zoom.all')}</option>
              <option value="high">{t('pipeline.filter.high')}</option>
              <option value="medium">{t('pipeline.filter.medium')}</option>
              <option value="low">{t('pipeline.filter.low')}</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddDealModalOpen(true)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('pipeline.addDeal')}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'gantt' ? (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          {/* Gantt Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('pipeline.gantt')}</h3>
              <p className="text-xs text-slate-500">{t('pipeline.gantt.desc')}</p>
            </div>
            {/* Zoom Controls */}
            <div className="bg-slate-100 rounded-xl p-1 flex items-center gap-0.5">
              {(Object.keys(ZOOM_ICONS) as ZoomLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setZoomLevel(level)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    zoomLevel === level ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {ZOOM_ICONS[level]}
                  <span>{t('pipeline.zoom.' + level)}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredDeals.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">
              {t('pipeline.noDeals')}
            </div>
          ) : (
            <Chart
              options={ganttOptions}
              series={(ganttOptions.series as any) || []}
              type="rangeBar"
              height={Math.max(250, filteredDeals.length * 52)}
            />
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-300" />
              <span>{t('pipeline.plan')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />
              <span>{t('pipeline.actual')}</span>
            </div>
            <span className="text-slate-300">|</span>
            <span>{t('pipeline.progress')}</span>
          </div>
        </div>
      ) : (
        /* Kanban Board */
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
                      {t('pipeline.dropHere')}
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
                              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[80px]">{(deal.contactName || '').split(' ')[0]}</span>
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
      )}
    </div>
  );
};
