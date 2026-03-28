import axios from 'axios';
import type { VisitRequest, DailySummary, AuthResponse, Notification, Stats } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to admin requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.url && (config.url.includes('/admin') || config.url.includes('/auth/verify'))) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        localStorage.removeItem('token');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (username: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { username, password });

export const verifyToken = () =>
  api.get('/auth/verify');

// Public Visit APIs
export const submitVisit = (visit: VisitRequest) =>
  api.post('/public/visits', visit);

export const getVisitById = (visitId: string) =>
  api.get<VisitRequest>(`/public/visits/${visitId}`);

export const getVisitsByPhone = (phone: string) =>
  api.get<VisitRequest[]>(`/public/visits/phone/${phone}`);

export const updateVisitPublic = (visitId: string, visit: VisitRequest) =>
  api.put(`/public/visits/${visitId}`, visit);

export const cancelVisit = (visitId: string, phone: string) =>
  api.post(`/public/visits/${visitId}/cancel`, { phone });

export const getMandals = () =>
  api.get<string[]>('/public/mandals');

// Admin Visit APIs
export const getAllVisits = () =>
  api.get<VisitRequest[]>('/admin/visits');

export const approveVisit = (visitId: string) =>
  api.post(`/admin/visits/${visitId}/approve`);

export const rejectVisit = (visitId: string) =>
  api.post(`/admin/visits/${visitId}/reject`);

export const deleteVisit = (visitId: string) =>
  api.delete(`/admin/visits/${visitId}`);

export const updateVisitAdmin = (visitId: string, visit: VisitRequest) =>
  api.put(`/admin/visits/${visitId}`, visit);

// Admin Mandals
export const getAdminMandals = () =>
  api.get<string[]>('/admin/mandals');

export const addMandal = (name: string) =>
  api.post('/admin/mandals', { name });

export const deleteMandal = (mandal: string) =>
  api.delete(`/admin/mandals/${mandal}`);

// Analytics
export const getDailySummary = (fromDate?: string, toDate?: string) => {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  return api.get<DailySummary[]>(`/admin/analytics/daily?${params.toString()}`);
};

export const getStats = () =>
  api.get<Stats>('/admin/analytics/stats');

export const exportCSV = () =>
  api.get('/admin/analytics/export/csv', { responseType: 'blob' });

// Notifications
export const getNotifications = () =>
  api.get<Notification[]>('/admin/notifications');

export const markNotificationRead = (id: string) =>
  api.post(`/admin/notifications/${id}/read`);

// WhatsApp
export const sendWhatsApp = (visitId: string, phoneNumber: string) =>
  api.post('/admin/whatsapp/send', { visitId, phoneNumber });

// Analytics WhatsApp
export const sendAnalyticsFullSummary = (phoneNumber: string, fromDate?: string, toDate?: string) =>
  api.post('/admin/analytics/whatsapp/full', { phoneNumber, fromDate, toDate });

export const sendAnalyticsSingleDate = (phoneNumber: string, date: string) =>
  api.post('/admin/analytics/whatsapp/date', { phoneNumber, date });

export default api;
