import React, { useEffect, useState, useMemo } from 'react';
import {
  getAllVisits, approveVisit, rejectVisit, deleteVisit, getNotifications,
  markNotificationRead, sendWhatsApp
} from '../services/api';
import type { VisitRequest, Notification } from '../types';
import Modal from '../components/Modal';
import { ToastContainer, useToast } from '../components/Toast';
import {
  CheckCircle, XCircle, Trash2, Eye, Search, Filter,
  Users, Clock, AlertTriangle, MessageCircle, ChevronLeft, ChevronRight,
  Send, Phone, Loader2
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedVisit, setSelectedVisit] = useState<VisitRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showNotif, setShowNotif] = useState(false);
  const itemsPerPage = 10;

  // WhatsApp modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppVisit, setWhatsAppVisit] = useState<VisitRequest | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [whatsAppSending, setWhatsAppSending] = useState(false);
  const [whatsAppPreview, setWhatsAppPreview] = useState('');

  const { toasts, addToast, removeToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [visitsRes, notifRes] = await Promise.all([
        getAllVisits(),
        getNotifications()
      ]);
      setVisits(visitsRes.data);
      setNotifications(notifRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      const matchesSearch =
        v.mandalName?.toLowerCase().includes(search.toLowerCase()) ||
        v.representativeName?.toLowerCase().includes(search.toLowerCase()) ||
        v.representativePhone?.includes(search) ||
        v.visitId?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [visits, search, statusFilter]);

  const paginatedVisits = filteredVisits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);

  // Detect duplicates
  const duplicateIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < visits.length; i++) {
      for (let j = i + 1; j < visits.length; j++) {
        if (
          visits[i].representativePhone === visits[j].representativePhone &&
          visits[i].fromDate === visits[j].fromDate &&
          visits[i].toDate === visits[j].toDate &&
          visits[i].status !== 'CANCELLED' && visits[j].status !== 'CANCELLED'
        ) {
          ids.add(visits[i].visitId!);
          ids.add(visits[j].visitId!);
        }
      }
    }
    return ids;
  }, [visits]);

  const handleAction = async (visitId: string, action: 'approve' | 'reject' | 'delete') => {
    setActionLoading(visitId);
    try {
      if (action === 'approve') await approveVisit(visitId);
      else if (action === 'reject') await rejectVisit(visitId);
      else await deleteVisit(visitId);

      if (action === 'approve') addToast('success', 'Visit approved successfully');
      else if (action === 'reject') addToast('info', 'Visit rejected');
      else addToast('success', 'Visit deleted');

      await fetchData();
    } catch (err) {
      addToast('error', 'Action failed. Please try again.');
      console.error('Action failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // WhatsApp: Open modal with auto-filled phone
  // ==========================================
  const openWhatsAppModal = (visit: VisitRequest) => {
    setWhatsAppVisit(visit);
    setWhatsAppPhone(visit.representativePhone || '');
    setWhatsAppPreview('');
    setShowWhatsAppModal(true);
  };

  // ==========================================
  // WhatsApp: Send message via backend API
  // ==========================================
  const handleWhatsAppSend = async () => {
    if (!whatsAppVisit || !whatsAppPhone) return;

    // Validate phone
    const cleanPhone = whatsAppPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      addToast('error', 'Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setWhatsAppSending(true);
    try {
      const res = await sendWhatsApp(whatsAppVisit.visitId!, cleanPhone);
      const data = res.data;

      if (data.fallback) {
        // API not configured — open wa.me link as fallback
        setWhatsAppPreview(data.formattedMessage || '');
        window.open(data.waLink, '_blank');
        addToast('info', 'WhatsApp API not configured. Opening WhatsApp Web...');
      } else if (data.success) {
        addToast('success', 'WhatsApp message sent successfully!');
        setShowWhatsAppModal(false);
      } else {
        addToast('error', data.message || 'Failed to send message');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to send WhatsApp message';
      addToast('error', errMsg);
    } finally {
      setWhatsAppSending(false);
    }
  };

  // Convert 24h to 12h AM/PM for display
  const formatTime12h = (time?: string) => {
    if (!time) return 'N/A';
    try {
      const [h, m] = time.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      return `${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
    } catch { return time; }
  };

  const statusBadge = (status?: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
      CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status || 'PENDING'] || styles.PENDING}`}>
        {status || 'PENDING'}
      </span>
    );
  };

  const stats = useMemo(() => ({
    total: visits.length,
    pending: visits.filter(v => v.status === 'PENDING').length,
    approved: visits.filter(v => v.status === 'APPROVED').length,
    rejected: visits.filter(v => v.status === 'REJECTED').length,
  }), [visits]);

  const unreadNotifs = notifications.filter(n => n.read === 'false').length;

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: stats.total, icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'from-amber-500 to-yellow-500', bg: 'bg-amber-50' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'from-red-500 to-rose-500', bg: 'bg-red-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-5 border border-white shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Notification Panel */}
      {unreadNotifs > 0 && (
        <button
          onClick={() => setShowNotif(true)}
          className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-all"
        >
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <span className="text-sm font-medium text-amber-800">
            You have {unreadNotifs} unread notification{unreadNotifs > 1 ? 's' : ''}
          </span>
        </button>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, mandal, or visit ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Mandal</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Representative</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Visitors</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Dates</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedVisits.map((visit) => (
                <tr
                  key={visit.visitId}
                  className={`hover:bg-slate-50 transition-colors ${
                    duplicateIds.has(visit.visitId!) ? 'bg-red-50/50 border-l-2 border-l-red-400' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{visit.mandalName}</div>
                    {duplicateIds.has(visit.visitId!) && (
                      <span className="text-xs text-red-500 font-medium">⚠ Duplicate</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{visit.representativeName}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{visit.representativePhone}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{visit.totalVisitors}</td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell text-xs">
                    {visit.fromDate} → {visit.toDate}
                  </td>
                  <td className="px-4 py-3">{statusBadge(visit.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setSelectedVisit(visit); setShowDetail(true); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      {visit.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAction(visit.visitId!, 'approve')}
                            disabled={actionLoading === visit.visitId}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleAction(visit.visitId!, 'reject')}
                            disabled={actionLoading === visit.visitId}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {/* WhatsApp button: ONLY visible for APPROVED status */}
                      {visit.status === 'APPROVED' && (
                        <button
                          onClick={() => openWhatsAppModal(visit)}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(visit.visitId!, 'delete')}
                        disabled={actionLoading === visit.visitId}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedVisits.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No visit requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredVisits.length)} of {filteredVisits.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Visit Details" size="lg">
        {selectedVisit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400">Visit ID</p><p className="font-medium text-sm">{selectedVisit.visitId}</p></div>
              <div><p className="text-xs text-slate-400">Status</p>{statusBadge(selectedVisit.status)}</div>
              <div><p className="text-xs text-slate-400">Mandal</p><p className="font-medium text-sm">{selectedVisit.mandalName}</p></div>
              <div><p className="text-xs text-slate-400">Representative</p><p className="font-medium text-sm">{selectedVisit.representativeName}</p></div>
              <div><p className="text-xs text-slate-400">Phone</p><p className="font-medium text-sm">{selectedVisit.representativePhone}</p></div>
              <div><p className="text-xs text-slate-400">Total Visitors</p><p className="font-medium text-sm">{selectedVisit.totalVisitors}</p></div>
              <div><p className="text-xs text-slate-400">From</p><p className="font-medium text-sm">{selectedVisit.fromDate}</p></div>
              <div><p className="text-xs text-slate-400">To</p><p className="font-medium text-sm">{selectedVisit.toDate}</p></div>
              <div><p className="text-xs text-slate-400">Arrival Time</p><p className="font-medium text-sm">{formatTime12h(selectedVisit.arrivalTime)}</p></div>
              <div><p className="text-xs text-slate-400">Kids</p><p className="font-medium text-sm">{selectedVisit.numberOfKids}</p></div>
              <div><p className="text-xs text-slate-400">Elderly</p><p className="font-medium text-sm">{selectedVisit.numberOfElderly}</p></div>
            </div>

            {selectedVisit.specialRequirements && (
              <div><p className="text-xs text-slate-400">Special Requirements</p><p className="text-sm mt-1">{selectedVisit.specialRequirements}</p></div>
            )}
            {selectedVisit.notes && (
              <div><p className="text-xs text-slate-400">Notes</p><p className="text-sm mt-1">{selectedVisit.notes}</p></div>
            )}

            {selectedVisit.mealPlans && selectedVisit.mealPlans.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Meals Plan</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-center">🥐 Breakfast</th>
                        <th className="px-3 py-2 text-center">🍛 Lunch</th>
                        <th className="px-3 py-2 text-center">🍽️ Dinner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedVisit.mealPlans.map((meal, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium">{meal.date}</td>
                          <td className="px-3 py-2 text-center">{meal.breakfastRequired ? meal.breakfastCount : '—'}</td>
                          <td className="px-3 py-2 text-center">{meal.lunchRequired ? meal.lunchCount : '—'}</td>
                          <td className="px-3 py-2 text-center">{meal.dinnerRequired ? meal.dinnerCount : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              {selectedVisit.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => { handleAction(selectedVisit.visitId!, 'approve'); setShowDetail(false); }}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { handleAction(selectedVisit.visitId!, 'reject'); setShowDetail(false); }}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}
              {/* WhatsApp button in detail modal: only for APPROVED */}
              {selectedVisit.status === 'APPROVED' && (
                <button
                  onClick={() => { setShowDetail(false); openWhatsAppModal(selectedVisit); }}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <MessageCircle size={16} />
                  Share WhatsApp
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ==========================================
          WhatsApp Send Modal
          ========================================== */}
      <Modal isOpen={showWhatsAppModal} onClose={() => setShowWhatsAppModal(false)} title="📱 Send WhatsApp Message" size="md">
        {whatsAppVisit && (
          <div className="space-y-5">
            {/* Visit Summary */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle size={16} className="text-green-600" />
                <h4 className="text-sm font-semibold text-green-800">Sending for Visit</h4>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                <p><strong>ID:</strong> {whatsAppVisit.visitId}</p>
                <p><strong>Mandal:</strong> {whatsAppVisit.mandalName}</p>
                <p><strong>Name:</strong> {whatsAppVisit.representativeName}</p>
                <p><strong>Dates:</strong> {whatsAppVisit.fromDate} → {whatsAppVisit.toDate}</p>
              </div>
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
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value.replace(/[^0-9+\s-]/g, ''))}
                  placeholder="e.g., 9876543210 or +919876543210"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Auto-filled from representative. India country code (+91) is added automatically.
              </p>
            </div>

            {/* Message Preview (shown after fallback) */}
            {whatsAppPreview && (
              <div>
                <p className="text-xs text-slate-500 mb-1 font-medium">Message Preview</p>
                <pre className="bg-slate-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                  {whatsAppPreview}
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
                disabled={whatsAppSending || !whatsAppPhone.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {whatsAppSending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Notifications Modal */}
      <Modal isOpen={showNotif} onClose={() => setShowNotif(false)} title="Notifications" size="md">
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No notifications</p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-xl border text-sm ${
                  notif.read === 'false'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-700">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{notif.timestamp}</p>
                  </div>
                  {notif.read === 'false' && (
                    <button
                      onClick={async () => {
                        await markNotificationRead(notif.id);
                        fetchData();
                      }}
                      className="text-xs text-amber-600 hover:text-amber-700 whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
