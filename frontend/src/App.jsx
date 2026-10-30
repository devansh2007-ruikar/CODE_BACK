import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { CitizenDashboard } from './components/CitizenDashboard';
import { HeroDashboard } from './components/HeroDashboard';

const MainLayout = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-spider-950 text-white">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-spider-red/20 border border-spider-red text-spider-red shadow-spider-glow mb-4 animate-bounce">
          <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
            <path d="M12 2a1 1 0 0 1 1 1v1.07A8.002 8.002 0 0 1 20 12v1a1 1 0 1 1-2 0v-1a6 6 0 1 0-12 0v1a1 1 0 1 1-2 0v-1a8.002 8.002 0 0 1 7-7.93V3a1 1 0 0 1 1-1zm0 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
          </svg>
        </div>
        <p className="text-sm font-bold tracking-widest text-slate-300 animate-pulse">
          TUNING SPIDER-SENSE FREQUENCIES...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col spider-web-bg text-slate-100 selection:bg-spider-red selection:text-white">
      <Navbar />
      <main className="flex-1">
        {!isAuthenticated ? (
          <AuthScreen />
        ) : user?.role === 'CITIZEN' ? (
          <CitizenDashboard />
        ) : user?.role === 'HERO' ? (
          <HeroDashboard />
        ) : (
          <div className="p-8 text-center text-red-400">
            Unknown role assigned to user: {user?.role}
          </div>
        )}
      </main>
      <footer className="py-6 border-t border-slate-900 bg-spider-950/80 text-center text-xs text-slate-500">
        <p>Spider-Sense Alert System • High Concurrency Incident Response Grid</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
