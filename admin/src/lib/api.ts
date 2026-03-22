import axios from 'axios';
import type {
  DashboardData, DriversResponse, Driver, PendingApproval,
  CustomersResponse, Customer, JobsResponse, Job,
  AnalyticsOverview, ServiceBreakdown, AdminUser,
  AuditLogsResponse, PlatformSettings, DriverEarnings,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rl_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rl_admin_token');
      localStorage.removeItem('rl_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const getMediaUrl = (path: string) =>
  path.startsWith('http') ? path : `${API_URL}${path}`;

// ── Auth ────────────────────────────────────────────────────────────────────
export const adminLogin = (email: string, password: string) =>
  api.post<{ token: string; user: AdminUser }>('/auth/login', { email, password });

// ── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboard = () =>
  api.get<DashboardData>('/admin/dashboard');

// ── Drivers ─────────────────────────────────────────────────────────────────
export const listDrivers = (params: Record<string, string | number>) =>
  api.get<DriversResponse>('/admin/drivers', { params });

export const getPendingApprovals = () =>
  api.get<PendingApproval[]>('/admin/drivers/pending');

export const getDriver = (id: number | string) =>
  api.get<Driver>(`/admin/drivers/${id}`);

export const updateDriverStatus = (id: number, action: string, reason?: string) =>
  api.patch(`/admin/drivers/${id}/status`, { action, reason });

export const updateDriverProfile = (id: number, data: Record<string, string>) =>
  api.patch(`/admin/drivers/${id}`, data);

export const getDriverEarnings = (id: number | string) =>
  api.get<DriverEarnings>(`/admin/drivers/${id}/earnings`);

export const approveService = (driverId: number, serviceType: string, status: string) =>
  api.patch(`/admin/driver/${driverId}/service/${serviceType}`, { status });

export const bulkApproveServices = (approvals: { driverId: number; serviceType: string; status: string }[]) =>
  api.post('/admin/drivers/bulk-approve', { approvals });

// ── Customers ────────────────────────────────────────────────────────────────
export const listCustomers = (params: Record<string, string | number>) =>
  api.get<CustomersResponse>('/admin/customers', { params });

export const getCustomer = (id: number | string) =>
  api.get<Customer>(`/admin/customers/${id}`);

export const updateCustomerStatus = (id: number, action: string, reason?: string) =>
  api.patch(`/admin/customers/${id}/status`, { action, reason });

export const updateCustomerProfile = (id: number, data: Record<string, string>) =>
  api.patch(`/admin/customers/${id}`, data);

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const listJobs = (params: Record<string, string | number>) =>
  api.get<JobsResponse>('/admin/jobs', { params });

export const getJobDetail = (id: number | string) =>
  api.get<Job>(`/admin/jobs/${id}`);

export const cancelJob = (id: number) =>
  api.patch(`/admin/jobs/${id}/cancel`);

export const overrideJobStatus = (id: number, status: string, reason?: string) =>
  api.patch(`/admin/jobs/${id}/status`, { status, reason });

export const issueRefund = (id: number, amount?: number) =>
  api.post(`/admin/jobs/${id}/refund`, { amount });

export const reassignJob = (id: number, driverId?: number) =>
  api.patch(`/admin/jobs/${id}/reassign`, { driverId });

// ── Analytics ────────────────────────────────────────────────────────────────
export const getAnalyticsOverview = (from: string, to: string) =>
  api.get<AnalyticsOverview>('/admin/analytics/overview', { params: { from, to } });

export const getServiceBreakdown = (from: string, to: string) =>
  api.get<ServiceBreakdown>('/admin/analytics/services', { params: { from, to } });

// ── Admin Users ──────────────────────────────────────────────────────────────
export const listAdmins = () =>
  api.get<AdminUser[]>('/admin/admins');

export const createAdmin = (data: { name: string; email: string; phoneNumber?: string; password: string }) =>
  api.post<AdminUser>('/admin/admins', data);

export const deleteAdmin = (id: number) =>
  api.delete(`/admin/admins/${id}`);

// ── Settings ─────────────────────────────────────────────────────────────────
export const getSettings = () =>
  api.get<PlatformSettings>('/admin/settings');

export const updateSettings = (data: Partial<PlatformSettings>) =>
  api.patch('/admin/settings', data);

// ── Export ────────────────────────────────────────────────────────────────────
export const exportCsv = async (type: 'jobs' | 'drivers' | 'customers', from?: string, to?: string) => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to)   params.to   = to;
  const res = await api.get(`/admin/export/${type}`, { params, responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Audit Log ─────────────────────────────────────────────────────────────────
export const getAuditLogs = (params: Record<string, string | number>) =>
  api.get<AuditLogsResponse>('/admin/audit-logs', { params });

// ── Notifications ────────────────────────────────────────────────────────────
export const broadcastNotification = (data: { title: string; body: string; audience: string }) =>
  api.post<{ success: boolean; sent: number }>('/admin/notifications/broadcast', data);
