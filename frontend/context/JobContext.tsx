import React, {
	createContext,
	useState,
	useContext,
	ReactNode,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { Job, JobStatus, ServiceTypeId, Provider, Location } from "../types";
import socketClient from "../services/socket";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";

// How long to wait for a driver before giving up (ms)
const SEARCH_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

interface JobContextType {
	job: Job;
	searchTimedOut: boolean;
	setJobStatus: (status: JobStatus) => void;
	selectService: (type: ServiceTypeId, price: number) => void;
	setCustomerLocation: (loc: Location) => void;
	setNotes: (notes: string) => void;
	requestService: () => Promise<void>;
	cancelJob: () => void;
	resetJob: () => void;
	providerLocation: Location | null;
	eta: number | null;
}

const initialJobState: Job = {
	serviceType:      null,
	customerLocation: null,
	status:           "idle",
};

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [job,            setJob]            = useState<Job>(initialJobState);
	const [providerLocation, setProviderLocation] = useState<Location | null>(null);
	const [eta,            setEta]            = useState<number | null>(null);
	const [searchTimedOut, setSearchTimedOut] = useState(false);
	const { user } = useAuth();

	const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearSearchTimeout = useCallback(() => {
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
			searchTimeoutRef.current = null;
		}
	}, []);

	const resetJob = useCallback(() => {
		clearSearchTimeout();
		setSearchTimedOut(false);
		setJob(initialJobState);
		setProviderLocation(null);
		setEta(null);
	}, [clearSearchTimeout]);

	useEffect(() => {
		if (!user) resetJob();
	}, [user, resetJob]);

	// ── Socket listeners ────────────────────────────────────────────────────
	useEffect(() => {
		const handleProviderAssigned = (data: { jobId: string; provider: Provider }) => {
			clearSearchTimeout();
			setSearchTimedOut(false);
			socketClient.emit("join-job", data.jobId);
			setJob(prev => ({
				...prev,
				status:   "tracking",
				provider: data.provider,
				id:       data.jobId,
			}));
			setProviderLocation(data.provider.location);
		};

		const handleLocationUpdate = (data: {
			jobId:    string;
			location: { latitude: number; longitude: number };
			eta?:     number;
		}) => {
			setProviderLocation({
				latitude:  data.location.latitude,
				longitude: data.location.longitude,
			});
			if (data.eta) setEta(data.eta);
		};

		const handleJobCompleted = (data: { finalPrice: number }) => {
			setJob(prev => ({ ...prev, status: "payment", finalPrice: data.finalPrice }));
		};

		socketClient.on("provider-assigned",      handleProviderAssigned);
		socketClient.on("driver-location-updated", handleLocationUpdate);
		socketClient.on("job-completed",           handleJobCompleted);

		return () => {
			socketClient.off("provider-assigned",      handleProviderAssigned);
			socketClient.off("driver-location-updated", handleLocationUpdate);
			socketClient.off("job-completed",           handleJobCompleted);
		};
	}, [clearSearchTimeout]);

	const setJobStatus = useCallback((status: JobStatus) => {
		setJob(prev => ({ ...prev, status }));
	}, []);

	const selectService = useCallback((type: ServiceTypeId, price: number) => {
		setJob(prev => ({
			...prev,
			serviceType:    type,
			estimatedPrice: price,
			status:         "confirming",
		}));
	}, []);

	const setCustomerLocation = useCallback((loc: Location) => {
		setJob(prev => ({ ...prev, customerLocation: loc }));
	}, []);

	const setNotes = useCallback((notes: string) => {
		setJob(prev => ({ ...prev, notes }));
	}, []);

	// ── requestService ──────────────────────────────────────────────────────
	const requestService = useCallback(async () => {
		if (!job.customerLocation || !job.serviceType || !user) return;

		setSearchTimedOut(false);
		setJob(prev => ({ ...prev, status: "searching" }));

		try {
			// BUG WAS: sent pickupLatitude/pickupLongitude without address or price.
			// Backend PostGIS model expects these field names.
			// We also send pickupAddress so drivers see the human-readable location,
			// and estimatedCost so the receipt shows the right price.
			const response = await api.post<any>("/jobs", {
				serviceType:    job.serviceType,
				pickupLatitude:  job.customerLocation.latitude,
				pickupLongitude: job.customerLocation.longitude,
				pickupAddress:   job.customerLocation.address ?? null,   // ← NEW
				estimatedCost:   job.estimatedPrice            ?? null,   // ← NEW
				notes:           job.notes                     ?? null,
			});

			// Backend returns { message, job: { id, ... } }
			// BUG WAS: response.data.data?.id was never found — field is response.data.job.id
			const jobId =
				response.data.job?.id ??
				response.data.id      ??
				response.data.data?.id;   // fallback for any legacy shape

			setJob(prev => ({ ...prev, id: jobId }));

			// "No drivers" timeout — cancel silently if nobody accepts
			searchTimeoutRef.current = setTimeout(async () => {
				setJob(current => {
					if (current.status !== "searching") return current;
					if (jobId) {
						api.put(`/jobs/${jobId}/cancel`).catch(() => {});
					}
					setSearchTimedOut(true);
					return { ...current, status: "idle" };
				});
			}, SEARCH_TIMEOUT_MS);
		} catch (err) {
			console.error("Failed to request service", err);
			setJob(prev => ({ ...prev, status: "idle" }));
			throw err;
		}
	}, [job.customerLocation, job.serviceType, job.notes, job.estimatedPrice, user]);

	// ── Cancel job ──────────────────────────────────────────────────────────
	const cancelJob = useCallback(() => {
		clearSearchTimeout();
		setSearchTimedOut(false);

		const currentJobId  = job.id;
		const currentStatus = job.status;

		resetJob();

		if (currentJobId && (currentStatus === "searching" || currentStatus === "tracking")) {
			api.put(`/jobs/${currentJobId}/cancel`).catch(err => {
				console.warn("[JobContext] Failed to cancel job on backend:", err?.message);
			});
		}
	}, [job.id, job.status, resetJob, clearSearchTimeout]);

	return (
		<JobContext.Provider
			value={{
				job,
				searchTimedOut,
				setJobStatus,
				selectService,
				setCustomerLocation,
				setNotes,
				requestService,
				cancelJob,
				resetJob,
				providerLocation,
				eta,
			}}
		>
			{children}
		</JobContext.Provider>
	);
};

export const useJob = () => {
	const context = useContext(JobContext);
	if (context === undefined) {
		throw new Error("useJob must be used within a JobProvider");
	}
	return context;
};
