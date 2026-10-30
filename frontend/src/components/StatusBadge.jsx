import React from 'react';
import { AlertCircle, ShieldAlert, Zap, CheckCircle2 } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  switch (status) {
    case 'REPORTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
          REPORTED
        </span>
      );
    case 'CLAIMED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          <ShieldAlert className="w-3.5 h-3.5" />
          CLAIMED
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
          <Zap className="w-3.5 h-3.5 animate-bounce" />
          IN PROGRESS
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          RESOLVED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
          {status}
        </span>
      );
  }
};
