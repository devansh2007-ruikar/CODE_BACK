import React from 'react';

export const SeverityMeter = ({ severity }) => {
  const level = Math.min(Math.max(severity || 1, 1), 5);
  
  const colors = [
    'bg-emerald-500',
    'bg-lime-500',
    'bg-amber-500',
    'bg-orange-500',
    'bg-spider-red',
  ];

  const labels = [
    'Level 1: Minor',
    'Level 2: Moderate',
    'Level 3: Elevated',
    'Level 4: Critical',
    'Level 5: Catastrophic',
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" title={labels[level - 1]}>
        {[1, 2, 3, 4, 5].map((idx) => (
          <span
            key={idx}
            className={`w-2.5 h-4 rounded-sm transition-all duration-300 ${
              idx <= level
                ? `${colors[level - 1]} ${idx === level && level >= 4 ? 'animate-pulse shadow-[0_0_8px_rgba(239,35,60,0.8)]' : ''}`
                : 'bg-slate-800 border border-slate-700/50'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-slate-300">
        LVL {level}
      </span>
    </div>
  );
};
