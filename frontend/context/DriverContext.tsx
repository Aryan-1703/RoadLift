import React, {
	createContext,
	useState,
	useContext,
	ReactNode,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { Job, Location } from "../types";
import { api } from "../services/api";
import socketClient from "../services/socket";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

// Poll for available jobs every 30 s when online, as a socket fallback
const POLL_INTERVAL_MS = 30_000;

interface DriverContextType {
	isOnline: boolean;
	availableJobs: Job[];
	activeJob: Job | null;
	earnings: any;
	goOnline: () => Promise<void>;
	goOffline: () => Promise<void>;
	acceptJob: (jobId: string) => Promise<void>;
	rejectJob: (jobId: string) => void;
	updateJobStatus: (status: string) => Promise<void>;
	fetchEarnings: () => Promise<void>;
	fetchAvailableJobs: () => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const DriverProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { user } = useAuth();
	const { showToast } = useToast();
	const [isOnline, setIsOnline] = useState(false);
	const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
	const [activeJob, setActiveJob] = useState<Job | null>(null);
	const [earnings, setEarnings] = useState({ today: 0, completedJobs: [] });

	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// ── Reset on logout ──────────────────────────────────────────────────────
	useEffect(() => {
		if (!user) {
			setIsOnline(false);
			setAvailableJobs([]);
			setActiveJob(null);
			setEarnings({ today: 0, completedJobs: [] });
		}
	}, [user]);

	// ── Fetch available jobs ─────────────────────────────────────────────────
	const fetchAvailableJobs = useCallback(async () => {
		if (!isOnline) return;
		try {
			const response = await api.get("/driver/jobs/available");
			setAvailableJobs(Array.isArray(response.data) ? response.data : []);
		} catch (err) {
			console.error("Failed to fetch available jobs", err);
		}
	}, [isOnline]);

	// ── Socket + polling setup ────────────────────────────────────────────────
	useEffect(() => {
		if (user?.role !== "DRIVER") return;

		const handleNewJob = (job: Job) => {
			if (!activeJob) {
				setAvailableJobs(prev => {
					if (prev.find(j => j.id === job.id)) return prev;
					return [...prev, job];
				});
			}
		};

		const handleJobCancelled = (data: { jobId: string }) => {
			setAvailableJobs(prev => prev.filter(j => j.id !== data.jobId));
			if (activeJob?.id === data.jobId) {
				setActiveJob(null);
				showToast("Job was cancelled by the customer", "error");
			}
		};

		if (isOnline) {
			socketClient.emit("driver-online", { driverId: user.id });
			socketClient.on("new-job-available", handleNewJob);
			socketClient.on("job-cancelled", handleJobCancelled);

			// Polling fallback — catches jobs that arrive during a socket gap
			pollIntervalRef.current = setInterval(fetchAvailableJobs, POLL_INTERVAL_MS);
		} else {
			socketClient.emit("driver-offline", { driverId: user.id });
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
		}

		return () => {
			socketClient.off("new-job-available", handleNewJob);
			socketClient.off("job-cancelled", handleJobCancelled);
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
		};
	}, [isOnline, user, activeJob, fetchAvailableJobs, showToast]);

	// ── goOnline / goOffline ─────────────────────────────────────────────────
	const goOnline = useCallback(async () => {
		setIsOnline(true);
		try {
			await api.put("/driver/status", { isActive: true });
			await fetchAvailableJobs();
		} catch (err) {
			console.error("Failed to go online", err);
		}
	}, [fetchAvailableJobs]);

	const goOffline = useCallback(async () => {
		setIsOnline(false);
		setAvailableJobs([]);
		try {
			await api.put("/driver/status", { isActive: false });
		} catch (err) {
			console.error("Failed to go offline", err);
		}
	}, []);

	// ── Accept job ───────────────────────────────────────────────────────────
	const acceptJob = useCallback(
		async (jobId: string) => {
			try {
				const response = await api.put(`/driver/jobs/${jobId}/accept`);
				const acceptedJob = response.data;
				setActiveJob(acceptedJob);
				setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
				socketClient.emit("join-job", jobId);
				showToast("Job accepted!", "success");
			} catch (err: any) {
				showToast(
					err.response?.data?.message ||
						err.response?.data?.error ||
						"Failed to accept job",
					"error",
				);
				setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
			}
		},
		[showToast],
	);

	const rejectJob = useCallback((jobId: string) => {
		setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
	}, []);

	// ── Update job status (ARRIVED / IN_PROGRESS / COMPLETED) ───────────────
	const updateJobStatus = useCallback(
		async (status: string) => {
			if (!activeJob?.id) return;
			try {
				if (status === "COMPLETED") {
					await api.put(`/driver/jobs/${activeJob.id}/complete`);
					setActiveJob(null);
					showToast("Job completed successfully!", "success");
					fetchEarnings();
				} else {
					// ARRIVED and IN_PROGRESS — general status endpoint
					// Backend: PUT /driver/jobs/:id/status  { status: "ARRIVED" | "IN_PROGRESS" }
					const response = await api.put(`/driver/jobs/${activeJob.id}/status`, {
						status,
					});
					// Merge updated job fields (backend may return updated record)
					setActiveJob(prev =>
						prev ? { ...prev, status: status as any, ...response.data } : prev,
					);

					const labels: Record<string, string> = {
						ARRIVED: "Marked as arrived!",
						IN_PROGRESS: "Service started!",
					};
					showToast(labels[status] || "Status updated", "success");
				}
			} catch (err: any) {
				showToast(
					err.response?.data?.message ||
						err.response?.data?.error ||
						"Failed to update job status",
					"error",
				);
			}
		},
		[activeJob, showToast],
	);

	// ── Earnings ─────────────────────────────────────────────────────────────
	const fetchEarnings = useCallback(async () => {
		try {
			const response = await api.get("/driver/earnings");
			setEarnings(response.data.data || { today: 0, completedJobs: [] });
		} catch (err) {
			console.error("Failed to fetch earnings", err);
		}
	}, []);

	return (
		<DriverContext.Provider
			value={{
				isOnline,
				availableJobs,
				activeJob,
				earnings,
				goOnline,
				goOffline,
				acceptJob,
				rejectJob,
				updateJobStatus,
				fetchEarnings,
				fetchAvailableJobs,
			}}
		>
			{children}
		</DriverContext.Provider>
	);
};

export const useDriver = () => {
	const context = useContext(DriverContext);
	if (context === undefined) {
		throw new Error("useDriver must be used within a DriverProvider");
	}
	return context;
};
