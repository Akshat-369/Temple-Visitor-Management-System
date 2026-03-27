import React, { useEffect, useState } from 'react';
import {
  getDailySummary, getStats, exportCSV,
  sendAnalyticsFullSummary, sendAnalyticsSingleDate
} from '../services/api';
import type { DailySummary, Stats } from '../types';
import Modal from '../components/Modal';
import { ToastContainer, useToast } from '../components/Toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import {
  Calendar, Download, Users, Coffee, UtensilsCrossed, Soup,
  MessageCircle, Phone, Send, Loader2
} from 'lucide-react';

const Analytics: React.FC = () => {
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  // WhatsApp modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waMode, setWaMode] = useState<'full' | 'single'>('full');
  const [waSelectedDate, setWaSelectedDate] = useState('');
  const [waPreview, setWaPreview] = useState('');

  const { toasts, addToast, removeToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, statsRes] = await Promise.all([
        getDailySummary(fromDate, toDate),
        getStats()
      ]);
      setDailySummary(summaryRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFilter = () => { fetchData(); };

  const handleExport = async () => {
    try {
      const response = await exportCSV();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'visits_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  // ==========================================
  // WhatsApp: Open modal for full summary
  // ==========================================
  const openFullSummaryShare = () => {
    setWaMode('full');
    setWaSelectedDate('');
    setWaPreview('');
    setShowWhatsAppModal(true);
  };

  // ==========================================
  // WhatsApp: Open modal for single date
  // ==========================================
  const openSingleDateShare = (date: string) => {
    setWaMode('single');
    setWaSelectedDate(date);
    setWaPreview('');
    setShowWhatsAppModal(true);
  };

  // ==========================================
  // WhatsApp: Send handler
  // ==========================================
  const handleWhatsAppSend = async () => {
    const cleanPhone = waPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      addToast('error', 'Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setWaSending(true);
    try {
      let res;
      if (waMode === 'full') {
        res = await sendAnalyticsFullSummary(cleanPhone, fromDate || undefined, toDate || undefined);
      } else {
        res = await sendAnalyticsSingleDate(cleanPhone, waSelectedDate);
      }

      const data = res.data;

      if (data.fallback) {
        setWaPreview(data.formattedMessage || '');
        window.open(data.waLink, '_blank');
        addToast('info', 'WhatsApp API not configured. Opening WhatsApp Web...');
      } else if (data.success) {
        addToast('success', 'Summary sent successfully via WhatsApp!');
        setShowWhatsAppModal(false);
      } else {
        addToast('error', data.message || 'Failed to send summary');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to send WhatsApp message';
      addToast('error', errMsg);
    } finally {
      setWaSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Visitors', value: stats.totalVisitors, icon: Users, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50' },
            { label: 'Total Breakfast', value: stats.totalBreakfast, icon: Coffee, gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-50' },
            { label: 'Total Lunch', value: stats.totalLunch, icon: UtensilsCrossed, gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50' },
            { label: 'Total Dinner', value: stats.totalDinner, icon: Soup, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`${card.bg} rounded-2xl p-5 border border-white shadow-sm`}>
                <div className={`w-10 h-10 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-xs text-slate-500 mt-1">{card.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Date Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center gap-3">
        <Calendar size={18} className="text-slate-400 hidden sm:block" />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <span className="text-slate-400 text-sm">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all"
        >
          Filter
        </button>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all flex items-center gap-2 ml-auto"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Meals Per Day</h3>
          {dailySummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="breakfastCount" name="Breakfast" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lunchCount" name="Lunch" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dinnerCount" name="Dinner" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">No data available</div>
          )}
        </div>

        {/* Line Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Visitor Trends</h3>
          {dailySummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="totalVisitors" name="Visitors" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">No data available</div>
          )}
        </div>
      </div>

      {/* ==========================================
          Date-wise Summary Table with WhatsApp Share
          ========================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Date-wise Summary</h3>

          {/* Share Full Summary button */}
          {dailySummary.length > 0 && (
            <button
              onClick={openFullSummaryShare}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-xs font-medium hover:shadow-lg transition-all"
              title="Share Full Summary on WhatsApp"
            >
              <MessageCircle size={14} />
              Share All
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">👥 Visitors</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">🥐 Breakfast</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">🍛 Lunch</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">🍽️ Dinner</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-12">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailySummary.map((day) => (
                <tr key={day.date} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 font-medium">{day.date}</td>
                  <td className="px-4 py-3 text-center">{day.totalVisitors}</td>
                  <td className="px-4 py-3 text-center">{day.breakfastCount || '—'}</td>
                  <td className="px-4 py-3 text-center">{day.lunchCount || '—'}</td>
                  <td className="px-4 py-3 text-center">{day.dinnerCount || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openSingleDateShare(day.date)}
                      className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 opacity-0 group-hover:opacity-100 transition-all"
                      title={`Share ${day.date} summary on WhatsApp`}
                    >
                      <MessageCircle size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {dailySummary.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No data available for the selected range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          WhatsApp Share Modal
          ========================================== */}
      <Modal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title={waMode === 'full' ? '📊 Share Full Summary' : `📅 Share Summary for ${waSelectedDate}`}
        size="md"
      >
        <div className="space-y-5">
          {/* Context Info */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={16} className="text-green-600" />
              <h4 className="text-sm font-semibold text-green-800">
                {waMode === 'full' ? 'Full Date-wise Summary' : 'Single Date Summary'}
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              {waMode === 'full' ? (
                <>Sharing summary for <strong>{dailySummary.length} date(s)</strong>
                  {fromDate && toDate ? ` (${fromDate} to ${toDate})` : ' (all dates)'}
                </>
              ) : (
                <>Sharing summary for <strong>{waSelectedDate}</strong></>
              )}
            </p>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Recipient Phone Number *
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value.replace(/[^0-9+\s-]/g, ''))}
                placeholder="e.g., 9876543210 or +919876543210"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              India country code (+91) is added automatically for 10-digit numbers.
            </p>
          </div>

          {/* Message Preview (shown after wa.me fallback) */}
          {waPreview && (
            <div>
              <p className="text-xs text-slate-500 mb-1 font-medium">Message Preview</p>
              <pre className="bg-slate-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                {waPreview}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleWhatsAppSend}
              disabled={waSending || !waPhone.trim()}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {waSending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Summary
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Analytics;
