import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { X, Building2, DollarSign, Calendar, Target, Tag, FileText, User, Layers } from 'lucide-react';

export const DealDetailModal: React.FC = () => {
  const { selectedDeal, setSelectedDeal, stages } = useCRM();

  if (!selectedDeal) return null;

  const stageLabel = stages.find(s => s.id === selectedDeal.stage)?.label || selectedDeal.stage;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setSelectedDeal(null)}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold shrink-0">
              {selectedDeal.title.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">{selectedDeal.title}</h3>
              <p className="text-xs text-slate-500">{selectedDeal.company}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedDeal(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Value
              </div>
              <p className="text-lg font-extrabold text-slate-900">${selectedDeal.value.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5">
                <Target className="w-3.5 h-3.5" />
                Win Probability
              </div>
              <p className="text-lg font-extrabold text-slate-900">{selectedDeal.probability}%</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5">
                <Layers className="w-3.5 h-3.5" />
                Stage
              </div>
              <p className="text-sm font-extrabold text-blue-700">{stageLabel}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Close Date
              </div>
              <p className="text-sm font-extrabold text-slate-900">{selectedDeal.expectedCloseDate}</p>
            </div>
          </div>

          {/* Priority & Tags */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
              <Tag className="w-3.5 h-3.5" />
              Priority & Tags
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                selectedDeal.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                selectedDeal.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {selectedDeal.priority}
              </span>
              {selectedDeal.tags.map((tag, i) => (
                <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
              <User className="w-3.5 h-3.5" />
              Contact
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <img
                src={selectedDeal.owner.avatar}
                alt={selectedDeal.owner.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-200"
              />
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedDeal.contactName}</p>
                <p className="text-xs text-slate-500">{selectedDeal.contactEmail}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {selectedDeal.notes && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
                <FileText className="w-3.5 h-3.5" />
                Notes
              </div>
              <p className="text-sm text-slate-700 p-3 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed">
                {selectedDeal.notes}
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
            <span>Created: {selectedDeal.createdAt}</span>
            <span>Source: {selectedDeal.leadSource}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
