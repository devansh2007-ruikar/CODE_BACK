import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { SeverityMeter } from './SeverityMeter';
import { IncidentDetailModal } from './IncidentDetailModal';
import {
  Flame,
  Shield,
  RefreshCw,
  AlertOctagon,
  MapPin,
  Clock,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const HeroDashboard = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [notification, setNotification] = useState(null);

  // Filters & Pagination
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalCount, setTotalCount] = useState(0);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (filterSeverity) params.severity = parseInt(filterSeverity, 10);

      const res = await api.get('/incidents', { params });
      setIncidents(res.data);

      const totalHeader = res.headers['x-total-count'];
      if (totalHeader) {
        setTotalCount(parseInt(totalHeader, 10));
      } else {
        setTotalCount(res.data.length);
      }
    } catch (err) {
      console.error('Failed to load hero dispatch queue:', err);
      showNotification('Failed to load dispatch incidents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, filterStatus, filterCategory, filterSeverity]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  const handleClaim = async (incidentId, e) => {
    e.stopPropagation();
    setClaimingId(incidentId);

    try {
      const res = await api.patch(`/incidents/${incidentId}/claim`);
      showNotification(
        `Successfully claimed Incident #${incidentId}! You are on the scene.`,
        'success'
      );
      // Update local item
      setIncidents((prev) =>
        prev.map((item) => (item.id === incidentId ? res.data : item))
      );
      // If modal is open for this incident, update it
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(res.data);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        showNotification(
          '🚨 409 Conflict: Too slow! Another hero has already claimed this incident.',
          'error'
        );
      } else {
        showNotification(
          err.response?.data?.detail || 'Failed to claim incident.',
          'error'
        );
      }
      fetchIncidents();
    } finally {
      setClaimingId(null);
    }
  };

  const handleIncidentUpdated = (updatedIncident) => {
    setIncidents((prev) =>
      prev.map((item) => (item.id === updatedIncident.id ? updatedIncident : item))
    );
    setSelectedIncident(updatedIncident);
  };

  // Metrics Calculations
  const criticalCount = incidents.filter((i) => i.severity >= 4).length;
  const myClaimedCount = incidents.filter(
    (i) => i.hero_id === user?.id && i.status !== 'RESOLVED'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl shadow-2xl border text-sm font-semibold max-w-md animate-slide-up ${
            notification.type === 'error'
              ? 'bg-red-950/90 text-red-200 border-red-500 shadow-[0_0_25px_rgba(239,35,60,0.4)]'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Hero Command Banner */}
      <div className="glass-panel-glow-red rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-spider-red/10 rounded-full blur-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-spider-red/20 text-spider-red border border-spider-red/40 mb-3 animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-spider-red" />
              SUPERHERO TACTICAL DISPATCH
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              NYC Open Threat Grid
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time feed of active emergencies with atomic concurrency lock protection.
            </p>
          </div>
          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Dispatch Grid</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Open Incidents
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {incidents.filter((i) => i.status !== 'RESOLVED').length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              High Threat (Lvl 4-5)
            </span>
            <span className="text-2xl font-black text-spider-red mt-1 block">
              {criticalCount}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              My Active Operations
            </span>
            <span className="text-2xl font-black text-cyan-400 mt-1 block">
              {myClaimedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-spider-red" />
          <span>FILTER DISPATCH:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-spider-red"
          >
            <option value="">All Open (Default)</option>
            <option value="REPORTED">REPORTED (Unclaimed)</option>
            <option value="CLAIMED">CLAIMED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-spider-red"
          >
            <option value="">All Categories</option>
            <option value="Crime">Crime</option>
            <option value="Assault">Assault</option>
            <option value="Sabotage">Sabotage</option>
            <option value="Disaster">Disaster</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => {
              setFilterSeverity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-spider-red"
          >
            <option value="">All Severities</option>
            <option value="5">Level 5 (Catastrophic)</option>
            <option value="4">Level 4 (Critical)</option>
            <option value="3">Level 3 (Elevated)</option>
            <option value="2">Level 2 (Moderate)</option>
            <option value="1">Level 1 (Minor)</option>
          </select>
        </div>
      </div>

      {/* Incidents Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <span className="w-8 h-8 border-2 border-spider-red border-t-transparent rounded-full animate-spin inline-block"></span>
          <p className="text-xs text-slate-400 mt-3 font-semibold">Scanning Spider-Sense frequencies...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl p-8">
          <AlertOctagon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Matching Incidents in Queue</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All reports matching current filters are either handled or resolved. Stay alert!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {incidents.map((incident) => {
            const isClaimedByMe = incident.hero_id === user?.id;
            const isUnclaimed = incident.status === 'REPORTED' && !incident.hero_id;

            return (
              <div
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className={`glass-panel rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 hover:shadow-2xl ${
                  isClaimedByMe
                    ? 'border-cyan-500/50 bg-cyan-950/20 shadow-hero-glow'
                    : isUnclaimed
                    ? 'border-slate-800 hover:border-spider-red/50 hover:shadow-spider-glow'
                    : 'border-slate-800/80 opacity-90'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-850 text-slate-300 border border-slate-700">
                      #{incident.id}
                    </span>
                    <StatusBadge status={incident.status} />
                  </div>

                  {/* Title & Category */}
                  <h3 className="text-base font-bold text-white group-hover:text-spider-red transition line-clamp-1 mb-1">
                    {incident.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {incident.description}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Threat Level:</span>
                      <SeverityMeter severity={incident.severity} />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Location:</span>
                      <div className="flex items-center gap-1 text-slate-200 font-medium truncate max-w-[170px]">
                        <MapPin className="w-3.5 h-3.5 text-spider-red shrink-0" />
                        <span className="truncate">{incident.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Category:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {incident.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {isUnclaimed ? (
                    <button
                      onClick={(e) => handleClaim(incident.id, e)}
                      disabled={claimingId === incident.id}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs bg-spider-red hover:bg-spider-redHover text-white shadow-spider-glow transition disabled:opacity-50"
                    >
                      {claimingId === incident.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5" />
                          <span>Claim Incident</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400">
                        {isClaimedByMe ? (
                          <span className="text-cyan-400 font-bold">You are assigned</span>
                        ) : (
                          `Hero #${incident.hero_id} assigned`
                        )}
                      </span>
                      <span className="text-spider-red group-hover:translate-x-1 transition font-bold flex items-center gap-1">
                        View Details <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} open threats
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page * limit >= totalCount}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detailed Modal View */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdated={handleIncidentUpdated}
        />
      )}
    </div>
  );
};
