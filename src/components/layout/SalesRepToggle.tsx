import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

export const SalesRepToggle: React.FC = () => {
  const { user } = useAuth();
  const [isAccepting, setIsAccepting] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>('/api/sales-reps/status')
      .then((reps) => {
        const me = reps.find((r: any) => r.id === user?.id);
        if (me) setIsAccepting(me.is_accepting);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await api.put('/api/sales-reps/status', { isAccepting: !isAccepting });
      setIsAccepting(!isAccepting);
    } catch (err) {
      console.error('Toggle failed:', err);
    }
    setLoading(false);
  };

  if (loading) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
        isAccepting
          ? 'text-emerald-700 hover:bg-emerald-50'
          : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isAccepting ? (
        <ToggleRight className="w-4 h-4 text-emerald-500" />
      ) : (
        <ToggleLeft className="w-4 h-4 text-slate-400" />
      )}
      <span>{isAccepting ? 'Accepting Leads' : 'Not Accepting Leads'}</span>
    </button>
  );
};
