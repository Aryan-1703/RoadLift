import axios from 'axios';
import type {
  DashboardData, DriversResponse, Driver, PendingApproval,
  CustomersResponse, Customer, JobsResponse, Job,
  AnalyticsOverview, ServiceBreakdown, AdminUser,
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

export const updateDriverStatus = (id: number, action: string) =>
  api.patch(`/admin/drivers/${id}/status`, { action });

export const approveService = (driverId: number, serviceType: string, status: string) =>
  api.patch(`/admin/driver/${driverId}/service/${serviceType}`, { status });

// ── Customers ────────────────────────────────────────────────────────────────
export const listCustomers = (params: Record<string, string | number>) =>
  api.get<CustomersResponse>('/admin/customers', { params });

export const getCustomer = (id: number | string) =>
  api.get<Customer>(`/admin/customers/${id}`);

export const updateCustomerStatus = (id: number, action: string) =>
  api.patch(`/admin/customers/${id}/status`, { action });

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const listJobs = (params: Record<string, string | number>) =>
  api.get<JobsResponse>('/admin/jobs', { params });

export const getJobDetail = (id: number | string) =>
  api.get<Job>(`/admin/jobs/${id}`);

export const cancelJob = (id: number) =>
  api.patch(`/admin/jobs/${id}/cancel`);

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

// ── Notifications ────────────────────────────────────────────────────────────
export const broadcastNotification = (data: { title: string; body: string; audience: string }) =>
  api.post<{ success: boolean; sent: number }>('/admin/notifications/broadcast', data);
