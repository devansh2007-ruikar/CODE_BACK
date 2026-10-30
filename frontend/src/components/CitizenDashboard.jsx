import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { StatusBadge } from './StatusBadge';
import { SeverityMeter } from './SeverityMeter';
import {
  AlertTriangle,
  Send,
  PlusCircle,
  RefreshCw,
  MapPin,
  Clock,
  Shield,
  FileText,
  Filter,
} from 'lucide-react';

export const CitizenDashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Crime');
  const [severity, setSeverity] = useState(3);
  const [location, setLocation] = useState('');

  // Table Filters & Pagination
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;

      const res = await api.get('/incidents', { params });
      setIncidents(res.data);
      const totalHeader = res.headers['x-total-count'];
      if (totalHeader) {
        setTotalCount(parseInt(totalHeader, 10));
      } else {
        setTotalCount(res.data.length);
      }
    } catch (err) {
      console.error('Failed to load citizen incidents:', err);
      setError('Failed to fetch your incident reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, filterStatus, filterCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/incidents', {
        title,
        description,
        category,
        severity: parseInt(severity, 10),
        location,
      });

      setSuccess('Emergency reported to Spider-Sense Dispatch network!');
      setTitle('');
      setDescription('');
      setLocation('');
      setSeverity(3);
      setCategory('Crime');
      setPage(1);
      fetchIncidents();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(', ')
          : 'Failed to submit incident report. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-3">
              <Shield className="w-3.5 h-3.5" />
              CITIZEN PORTAL
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Report Emergency or Distress
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Your reports are instantly broadcast to the superhero dispatch queue.
            </p>
          </div>
          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="flex items-center gap-2 self-start md:self-auto px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Submit Incident Form */}
        <div className="lg:col-span-1">
          <div className="glass-panel-glow-red rounded-2xl p-6 border border-slate-800 sticky top-24 shadow-xl">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
              <PlusCircle className="w-5 h-5 text-spider-red" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                New Emergency Report
              </h2>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Incident Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bank Robbery at 5th Ave"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-spider-red focus:ring-1 focus:ring-spider-red transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-spider-red focus:ring-1 focus:ring-spider-red transition"
                >
                  <option value="Crime">Crime / Theft</option>
                  <option value="Assault">Assault / Hostage</option>
                  <option value="Sabotage">Sabotage / Villain Attack</option>
                  <option value="Disaster">Disaster / Collapse</option>
                  <option value="Public Disturbance">Public Disturbance</option>
                  <option value="Other">Other Emergency</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Severity Level
                  </label>
                  <span className="text-xs font-bold text-spider-red">Level {severity}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full accent-spider-red bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>1: Minor</span>
                  <span>3: Moderate</span>
                  <span>5: Critical</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Location / Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. 5th Avenue & Elm St, Manhattan"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-spider-red focus:ring-1 focus:ring-spider-red transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Detailed Description
                </label>
                <textarea
                  required
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe perpetrators, threats, victims, or supervillains involved..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-spider-red focus:ring-1 focus:ring-spider-red transition resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-spider-red hover:bg-spider-redHover shadow-spider-glow transition disabled:opacity-50"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Alert</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Table of Past Reports */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl">
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Your Past Incident Reports
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track the real-time status and hero dispatch for your reported incidents.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Statuses</option>
                  <option value="REPORTED">REPORTED</option>
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
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Categories</option>
                  <option value="Crime">Crime</option>
                  <option value="Assault">Assault</option>
                  <option value="Sabotage">Sabotage</option>
                  <option value="Disaster">Disaster</option>
                </select>
              </div>
            </div>

            {/* Table / List */}
            {loading ? (
              <div className="py-16 text-center">
                <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                <p className="text-xs text-slate-400 mt-2">Loading your incidents...</p>
              </div>
            ) : incidents.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No incident reports found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Submit an emergency using the form on the left to notify heroes across New York City.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Incident</th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3">Severity</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Assigned Hero</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-850/50 transition">
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-white text-xs">{inc.title}</p>
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                            {inc.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-300 font-medium">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[150px]">{inc.location}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <SeverityMeter severity={inc.severity} />
                        </td>
                        <td className="py-3.5 px-3">
                          <StatusBadge status={inc.status} />
                        </td>
                        <td className="py-3.5 px-3">
                          {inc.hero_id ? (
                            <span className="inline-flex items-center gap-1 font-bold text-cyan-400">
                              <Shield className="w-3 h-3" />
                              Hero #{inc.hero_id}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Unclaimed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalCount > limit && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4 text-xs text-slate-400">
                <span>
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} reports
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page * limit >= totalCount}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
