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

const POLL_INTERVAL_MS = 30_000;

interface DriverContextType {
	isOnline:          boolean;
	availableJobs:     Job[];
	activeJob:         Job | null;
	earnings:          any;
	goOnline:          () => Promise<void>;
	goOffline:         () => Promise<void>;
	acceptJob:         (jobId: string) => Promise<void>;
	rejectJob:         (jobId: string) => void;
	updateJobStatus:   (status: string) => Promise<void>;
	fetchEarnings:     () => Promise<void>;
	fetchAvailableJobs:() => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// mapApiJob — converts a backend Job record into the frontend Job type.
//
// BUG WAS: `setActiveJob(response.data)` stored a raw DB record with
//          `pickupLocation` as a PostGIS geometry object.
//          ActiveJobScreen + DriverDashboardScreen tried to read
//          job.customerLocation, job.customerName, etc. — all undefined.
//
// FIX: normalizeJob() already runs on the backend, so the API response
//      already has the right shape.  This mapper is a safety net in case
//      an older server or a non-normalised response slips through.
// ─────────────────────────────────────────────────────────────────────────────
function mapApiJob(raw: any): Job {
	// If the backend has already normalized (has customerLocation as an object)
	// just pass it through. Otherwise extract from geometry.
	const customerLocation: Location | null =
		raw.customerLocation ??
		(raw.pickupLocation?.coordinates
			? {
					latitude:  raw.pickupLocation.coordinates[1],
					longitude: raw.pickupLocation.coordinates[0],
					address:   raw.pickupAddress ?? null,
			  }
			: null);

	return {
		id:              String(raw.id),
		serviceType:     raw.serviceType   ?? null,
		status:          raw.status        ?? "pending",
		customerLocation,
		notes:           raw.notes         ?? null,
		estimatedPrice:  raw.estimatedPrice ?? raw.estimatedCost
			? parseFloat(raw.estimatedPrice ?? raw.estimatedCost)
			: null,
		finalPrice:      raw.finalPrice ?? raw.finalCost
			? parseFloat(raw.finalPrice ?? raw.finalCost)
			: null,
		// Driver sees these customer details
		customerName:    raw.customerName  ?? raw.customer?.name        ?? null,
		customerPhone:   raw.customerPhone ?? raw.customer?.phoneNumber ?? null,
	};
}

export const DriverProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { user } = useAuth();
	const { showToast } = useToast();

	const [isOnline,       setIsOnline]       = useState(false);
	const [availableJobs,  setAvailableJobs]  = useState<Job[]>([]);
	const [activeJob,      setActiveJob]      = useState<Job | null>(null);
	const [earnings,       setEarnings]       = useState({ today: 0, completedJobs: [] });

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
			const jobs = Array.isArray(response.data) ? response.data : [];
			// Map every job through our normalizer
			setAvailableJobs(jobs.map(mapApiJob));
		} catch (err) {
			console.error("Failed to fetch available jobs", err);
		}
	}, [isOnline]);

	// ── Socket + polling setup ────────────────────────────────────────────────
	useEffect(() => {
		if (user?.role !== "DRIVER") return;

		const handleNewJob = (job: any) => {
			if (!activeJob) {
				const mapped = mapApiJob(job);
				setAvailableJobs(prev => {
					if (prev.find(j => j.id === mapped.id)) return prev;
					return [...prev, mapped];
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

		const handlePaymentReceived = (data: { jobId: string; amount: number }) => {
			showToast(`Payment received: $${data.amount.toFixed(2)}`, "success");
			fetchEarnings();
		};

		if (isOnline) {
			socketClient.emit("driver-online", { driverId: user.id });
			socketClient.on("new-job-available", handleNewJob);
			socketClient.on("job-cancelled",      handleJobCancelled);
			pollIntervalRef.current = setInterval(fetchAvailableJobs, POLL_INTERVAL_MS);
		} else {
			socketClient.emit("driver-offline", { driverId: user.id });
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
		}

		// payment-received fires regardless of online/offline state
		socketClient.on("payment-received", handlePaymentReceived);

		return () => {
			socketClient.off("new-job-available", handleNewJob);
			socketClient.off("job-cancelled",      handleJobCancelled);
			socketClient.off("payment-received",   handlePaymentReceived);
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
		};
	}, [isOnline, user, activeJob, fetchAvailableJobs, showToast, fetchEarnings]);

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
	const acceptJob = useCallback(async (jobId: string) => {
		try {
			const response = await api.put(`/driver/jobs/${jobId}/accept`);
			// BUG WAS: `setActiveJob(response.data)` — raw geometry object
			// FIX: map through normalizer first
			const mapped = mapApiJob(response.data);
			setActiveJob(mapped);
			setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
			socketClient.emit("join-job", jobId);
			showToast("Job accepted!", "success");
		} catch (err: any) {
			showToast(
				err.response?.data?.message ?? err.response?.data?.error ?? "Failed to accept job",
				"error",
			);
			setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
		}
	}, [showToast]);

	const rejectJob = useCallback((jobId: string) => {
		setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
	}, []);

	// ── Update job status (ARRIVED / IN_PROGRESS / COMPLETED) ───────────────
	const updateJobStatus = useCallback(async (status: string) => {
		if (!activeJob?.id) return;
		try {
			if (status === "COMPLETED") {
				await api.put(`/driver/jobs/${activeJob.id}/complete`);
				setActiveJob(null);
				showToast("Job completed successfully!", "success");
				fetchEarnings();
			} else {
				// BUG WAS: route didn't exist → silent 404, status never changed
				// FIX: route now exists in driverRoutes.js
				const response = await api.put(`/driver/jobs/${activeJob.id}/status`, { status });
				const updated  = mapApiJob(response.data);
				setActiveJob(updated);

				const labels: Record<string, string> = {
					ARRIVED:     "Marked as arrived!",
					IN_PROGRESS: "Service started!",
				};
				showToast(labels[status] || "Status updated", "success");
			}
		} catch (err: any) {
			showToast(
				err.response?.data?.message ?? err.response?.data?.error ?? "Failed to update job status",
				"error",
			);
		}
	}, [activeJob, showToast]);

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
 + data.amount.toFixed(2), "success");
			fetchEarnings();
		};

		if (isOnline) {
			socketClient.emit("driver-online", { driverId: user.id });
			socketClient.on("new-job-available", handleNewJob);
			socketClient.on("job-cancelled",      handleJobCancelled);
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
			socketClient.off("job-cancelled",      handleJobCancelled);
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
	const acceptJob = useCallback(async (jobId: string) => {
		try {
			const response = await api.put(`/driver/jobs/${jobId}/accept`);
			// BUG WAS: `setActiveJob(response.data)` — raw geometry object
			// FIX: map through normalizer first
			const mapped = mapApiJob(response.data);
			setActiveJob(mapped);
			setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
			socketClient.emit("join-job", jobId);
			showToast("Job accepted!", "success");
		} catch (err: any) {
			showToast(
				err.response?.data?.message ?? err.response?.data?.error ?? "Failed to accept job",
				"error",
			);
			setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
		}
	}, [showToast]);

	const rejectJob = useCallback((jobId: string) => {
		setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
	}, []);

	// ── Update job status (ARRIVED / IN_PROGRESS / COMPLETED) ───────────────
	const updateJobStatus = useCallback(async (status: string) => {
		if (!activeJob?.id) return;
		try {
			if (status === "COMPLETED") {
				await api.put(`/driver/jobs/${activeJob.id}/complete`);
				setActiveJob(null);
				showToast("Job completed successfully!", "success");
				fetchEarnings();
			} else {
				// BUG WAS: route didn't exist → silent 404, status never changed
				// FIX: route now exists in driverRoutes.js
				const response = await api.put(`/driver/jobs/${activeJob.id}/status`, { status });
				const updated  = mapApiJob(response.data);
				setActiveJob(updated);

				const labels: Record<string, string> = {
					ARRIVED:     "Marked as arrived!",
					IN_PROGRESS: "Service started!",
				};
				showToast(labels[status] || "Status updated", "success");
			}
		} catch (err: any) {
			showToast(
				err.response?.data?.message ?? err.response?.data?.error ?? "Failed to update job status",
				"error",
			);
		}
	}, [activeJob, showToast]);

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
