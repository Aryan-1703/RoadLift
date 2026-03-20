export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceState {
  status: 'unapproved' | 'pending' | 'approved' | 'rejected';
  isEnabled: boolean;
}

export interface DriverProfile {
  vehicleType: string;
  licenseNumber: string;
  insuranceNumber?: string;
  companyName?: string;
  serviceArea?: string;
  averageRating: number;
  totalJobsCompleted: number;
  unlockedServices: Record<string, ServiceState>;
  equipmentMedia: Record<string, string[]>;
}

export interface Driver {
  id: number;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt?: string | null;
  joinedAt: string;
  stripeAccountId?: string;
  stripePayoutsEnabled: boolean;
  profile: DriverProfile | null;
  totalEarnings?: number;
  recentJobs?: RecentJob[];
  reviews?: Review[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  isSuspended: boolean;
  joinedAt: string;
  totalJobs: number;
  totalSpent?: number;
  stripeCustomerId: string | null;
  vehicles?: Vehicle[];
  recentJobs?: RecentJob[];
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  color?: string;
  licensePlate?: string;
}

export interface Job {
  id: number;
  status: string;
  serviceType: string;
  estimatedCost: number | null;
  currentPrice: number | null;
  finalCost: number | null;
  pickupAddress: string | null;
  dispatchStage: number;
  notes?: string;
  paymentIntentId?: string;
  currentRadius?: number;
  isThirdParty?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  customer: { id: number; name: string; phone: string; email?: string };
  driver: { id: number; name: string; phone: string; email?: string } | null;
  vehicle: { make: string; model: string; year: number } | null;
  messages?: ChatMessage[];
  review?: JobReview | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecentJob {
  id: number;
  status: string;
  serviceType: string;
  finalCost: number | null;
  customer?: string;
  driver?: string;
  createdAt: string;
}

export interface Review {
  id: number;
  rating: number;
  comment?: string;
  reviewer?: string;
  createdAt: string;
}

export interface JobReview {
  id: number;
  rating: number;
  comment?: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  senderRole: string;
  sender: string | null;
  createdAt: string;
}

export interface DashboardData {
  users: {
    customers: number;
    drivers: number;
    admins: number;
    activeDrivers: number;
  };
  jobs: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    active: number;
    awaitingDriver: number;
    totalCompleted: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    platformFeeToday: number;
    platformFeeThisWeek: number;
    platformFeeThisMonth: number;
  };
  pendingServiceApprovals: number;
}

export interface PendingApproval {
  driverId: number;
  name: string;
  email: string;
  phone: string;
  unlockedServices: Record<string, ServiceState>;
  equipmentMedia: Record<string, string[]>;
}

export interface Paginated<T> {
  total: number;
  page: number;
  pages: number;
}

export interface DriversResponse extends Paginated<Driver> {
  drivers: Driver[];
}

export interface CustomersResponse extends Paginated<Customer> {
  customers: Customer[];
}

export interface JobsResponse extends Paginated<Job> {
  jobs: Job[];
}

export interface AnalyticsOverview {
  range: { from: string; to: string };
  totals: {
    jobs: number;
    completed: number;
    cancelled: number;
    revenue: number;
    platformRevenue: number;
    completionRate: number;
  };
  jobsByDay: { date: string; total: number; completed: number; cancelled: number }[];
  revenueByDay: { date: string; revenue: number }[];
}

export interface ServiceBreakdown {
  range: { from: string; to: string };
  services: {
    serviceType: string;
    total: number;
    completed: number;
    cancelled: number;
    revenue: number;
  }[];
}
