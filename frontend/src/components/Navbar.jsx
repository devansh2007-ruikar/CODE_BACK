import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Radio, LogOut, User as UserIcon, Flame } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-spider-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-spider-red/20 border border-spider-red/50 text-spider-red shadow-spider-glow">
            {/* Spider Icon Vector */}
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 2a1 1 0 0 1 1 1v1.07A8.002 8.002 0 0 1 20 12v1a1 1 0 1 1-2 0v-1a6 6 0 1 0-12 0v1a1 1 0 1 1-2 0v-1a8.002 8.002 0 0 1 7-7.93V3a1 1 0 0 1 1-1zm0 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-spider-red opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-spider-red"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-white">
                SPIDER<span className="text-spider-red">-SENSE</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest bg-slate-800 text-slate-300 border border-slate-700">
                DISPATCH v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">NYC Emergency Response Grid</p>
          </div>
        </div>

        {/* User Status & Logout */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-slate-300">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white leading-tight">
                  {user.username}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {user.role === 'HERO' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-spider-red tracking-wider">
                      <Flame className="w-3 h-3 text-spider-red fill-spider-red" />
                      HERO DISPATCH
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 tracking-wider">
                      <Shield className="w-3 h-3" />
                      CITIZEN
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Log out"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
