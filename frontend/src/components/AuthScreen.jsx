import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Flame, Lock, User, AlertCircle, ArrowRight, Check } from 'lucide-react';

export const AuthScreen = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CITIZEN');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password, role);
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(', ')
          : 'Authentication failed. Please verify your credentials and backend connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoRole) => {
    if (demoRole === 'HERO') {
      setUsername('peter_parker');
      setPassword('spiderman123');
      setRole('HERO');
    } else {
      setUsername('miles_morales');
      setPassword('citizen123');
      setRole('CITIZEN');
    }
    setError('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
      {/* Spider Sense Glowing Header */}
      <div className="text-center mb-8 max-w-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-spider-red/10 text-spider-red border border-spider-red/30 mb-4 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-spider-red"></span>
          SPIDER-SENSE SYSTEM ACTIVE
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
          New York City Emergency <span className="text-transparent bg-clip-text bg-gradient-to-r from-spider-red to-orange-500">Alert Network</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Report active threats as a Citizen or monitor and resolve crises in real time as a Hero.
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              isLogin
                ? 'bg-spider-red text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              !isLogin
                ? 'bg-spider-red text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. peter_parker"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-spider-red focus:ring-1 focus:ring-spider-red transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-spider-red focus:ring-1 focus:ring-spider-red transition"
              />
            </div>
          </div>

          {/* Role Selection on Register */}
          {!isLogin && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('CITIZEN')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                    role === 'CITIZEN'
                      ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Shield className={`w-4 h-4 ${role === 'CITIZEN' ? 'text-cyan-400' : 'text-slate-400'}`} />
                    {role === 'CITIZEN' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <span className="font-bold text-xs mt-1">CITIZEN</span>
                  <span className="text-[10px] text-slate-400">Report distress & crimes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('HERO')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                    role === 'HERO'
                      ? 'bg-red-950/40 border-spider-red text-white shadow-[0_0_15px_rgba(239,35,60,0.25)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Flame className={`w-4 h-4 ${role === 'HERO' ? 'text-spider-red' : 'text-slate-400'}`} />
                    {role === 'HERO' && <Check className="w-3.5 h-3.5 text-spider-red" />}
                  </div>
                  <span className="font-bold text-xs mt-1">HERO</span>
                  <span className="text-[10px] text-slate-400">Claim & dispatch response</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-spider-red to-red-600 hover:from-spider-redHover hover:to-red-700 shadow-spider-glow focus:outline-none transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isLogin ? 'Enter System' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-fill */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 mb-2 font-medium">Quick Demo Credentials:</p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => setDemoCredentials('HERO')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-red-950/40 border border-spider-red/40 text-red-300 hover:bg-red-900/50 transition"
            >
              🦸 Hero (Peter Parker)
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('CITIZEN')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50 transition"
            >
              🧑 Citizen (Miles Morales)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
