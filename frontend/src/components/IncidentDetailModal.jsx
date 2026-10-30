import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { StatusBadge } from './StatusBadge';
import { SeverityMeter } from './SeverityMeter';
import {
  X,
  MapPin,
  Calendar,
  User,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowRight,
} from 'lucide-react';

export const IncidentDetailModal = ({ incident, onClose, onUpdated }) => {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get(`/incidents/${incident.id}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (incident?.id) {
      fetchHistory();
    }
  }, [incident?.id]);

  const handleClaim = async () => {
    setActionLoading(true);
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await api.patch(`/incidents/${incident.id}/claim`);
      setSuccessMsg('Successfully claimed incident! You are now the assigned hero.');
      onUpdated(res.data);
      fetchHistory();
    } catch (err) {
      if (err.response?.status === 409) {
        setActionError('409 Conflict: Another hero already claimed this incident or it is no longer available!');
      } else {
        setActionError(err.response?.data?.detail || 'Failed to claim incident');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusTransition = async (nextStatus) => {
    setActionLoading(true);
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await api.patch(`/incidents/${incident.id}/status`, {
        status: nextStatus,
      });
      setSuccessMsg(`Status updated to ${nextStatus}!`);
      onUpdated(res.data);
      fetchHistory();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setActionError(
        typeof detail === 'string'
          ? detail
          : 'Invalid state machine transition rejected by backend (400 Bad Request).'
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (!incident) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-spider-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-spider-950/60">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-spider-red/20 text-spider-red border border-spider-red/40">
              INCIDENT #{incident.id}
            </span>
            <StatusBadge status={incident.status} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Messages */}
          {actionError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{incident.title}</h2>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              {incident.description}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Category
              </span>
              <span className="text-xs font-bold text-white">{incident.category}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Severity
              </span>
              <SeverityMeter severity={incident.severity} />
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Location
              </span>
              <div className="flex items-center gap-1 text-xs font-bold text-white truncate">
                <MapPin className="w-3.5 h-3.5 text-spider-red shrink-0" />
                <span className="truncate">{incident.location}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Assigned Hero
              </span>
              <div className="flex items-center gap-1 text-xs font-bold text-cyan-400">
                <Shield className="w-3.5 h-3.5" />
                <span>{incident.hero_id ? `Hero #${incident.hero_id}` : 'Unclaimed'}</span>
              </div>
            </div>
          </div>

          {/* State Machine Action Controls */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Hero Operational State Actions
            </h3>

            <div className="flex flex-wrap gap-3">
              {incident.status === 'REPORTED' && (
                <button
                  onClick={handleClaim}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] transition disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  <span>Claim Incident (Atomic Concurrency Guard)</span>
                </button>
              )}

              {incident.status === 'CLAIMED' && (
                <button
                  onClick={() => handleStatusTransition('IN_PROGRESS')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] transition disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>Advance Status to IN_PROGRESS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {incident.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleStatusTransition('RESOLVED')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Incident as RESOLVED</span>
                </button>
              )}

              {incident.status === 'RESOLVED' && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3.5 py-2 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Incident successfully resolved and closed.</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Change Audit Trail */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Status History Audit Trail
              </h3>
            </div>

            {loadingHistory ? (
              <p className="text-xs text-slate-500 italic">Loading audit trail...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-950/30 p-3 rounded-lg border border-slate-800">
                No status transitions recorded yet.
              </p>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Transition</th>
                      <th className="py-2.5 px-3">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {history.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {new Date(record.changed_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <span className="text-slate-400">{record.old_status}</span>
                            <ArrowRight className="w-3 h-3 text-spider-red" />
                            <span className="text-cyan-300">{record.new_status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          User ID #{record.changed_by}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
