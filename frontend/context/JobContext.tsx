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

// Safety-net timeout — backend's job-no-driver-found event fires first (~6.7 min).
// This is only a last-resort fallback if the socket event is somehow missed.
const SEARCH_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface JobContextType {
	job: Job;
	searchTimedOut: boolean;
	travelFee: number;
	searchMessage: string | null;
	setJobStatus: (status: JobStatus) => void;
	selectService: (type: ServiceTypeId, price: number) => void;
	setCustomerLocation: (loc: Location) => void;
	setNotes: (notes: string) => void;
	requestService: (preAuthorizedIntentId?: string) => Promise<void>;
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
	const [travelFee,      setTravelFee]      = useState<number>(0);
	const [searchMessage,  setSearchMessage]  = useState<string | null>(null);
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
		setTravelFee(0);
		setSearchMessage(null);
	}, [clearSearchTimeout]);

	useEffect(() => {
		if (!user) resetJob();
	}, [user, resetJob]);

	// ── Socket listeners ────────────────────────────────────────────────────
	useEffect(() => {
		const handleProviderAssigned = (data: { jobId: string; provider: Provider }) => {
			clearSearchTimeout();
			setSearchTimedOut(false);
			setSearchMessage(null);
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

		const handleJobCompleted = (data: { finalPrice: number | null; capturedTotal: number | null }) => {
			setJob(prev => ({
				...prev,
				status:        "payment",
				finalPrice:    data.finalPrice    ?? undefined,
				capturedTotal: data.capturedTotal ?? undefined,
			}));
		};

		// Driver marked ARRIVED or IN_PROGRESS — update job status so UI can reflect it
		const handleJobStatusUpdated = (data: { jobId: string; status: string }) => {
			if (data.status === "arrived" || data.status === "in_progress") {
				setJob(prev => ({ ...prev, status: data.status as JobStatus }));
			}
		};

		// Dispatch radius expanded — update price and search message
		const handleExpandingRadius = (data: {
			jobId: string;
			stage: number;
			radiusKm: number;
			travelFee: number;
			currentPrice: number;
			message: string;
		}) => {
			setTravelFee(data.travelFee);
			setSearchMessage(data.message);
			setJob(prev => ({
				...prev,
				currentPrice:  data.currentPrice,
				travelFee:     data.travelFee,
				searchMessage: data.message,
				dispatchStage: data.stage,
				currentRadius: data.radiusKm,
			}));
		};

		// No drivers found after all stages exhausted
		const handleNoDriverFound = (data: { jobId: string; message: string }) => {
			clearSearchTimeout();
			setSearchTimedOut(true);
			setSearchMessage(data.message);
			setJob(prev => ({ ...prev, status: "idle" }));
		};

		socketClient.on("provider-assigned",      handleProviderAssigned);
		socketClient.on("driver-location-updated", handleLocationUpdate);
		socketClient.on("job-completed",           handleJobCompleted);
		socketClient.on("job-status-updated",      handleJobStatusUpdated);
		// Stage 0 confirmation + stage 1-4 expansions use the same handler
		socketClient.on("job-search-started",      handleExpandingRadius);
		socketClient.on("job-expanding-radius",    handleExpandingRadius);
		socketClient.on("job-no-driver-found",     handleNoDriverFound);

		return () => {
			socketClient.off("provider-assigned",      handleProviderAssigned);
			socketClient.off("driver-location-updated", handleLocationUpdate);
			socketClient.off("job-completed",           handleJobCompleted);
			socketClient.off("job-status-updated",      handleJobStatusUpdated);
			socketClient.off("job-search-started",      handleExpandingRadius);
			socketClient.off("job-expanding-radius",    handleExpandingRadius);
			socketClient.off("job-no-driver-found",     handleNoDriverFound);
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
	const requestService = useCallback(async (preAuthorizedIntentId?: string) => {
		if (!job.customerLocation || !job.serviceType || !user) return;

		setSearchTimedOut(false);
		setSearchMessage(null);
		setTravelFee(0);
		setJob(prev => ({ ...prev, status: "searching" }));

		try {
			const response = await api.post<any>("/jobs", {
				serviceType:    job.serviceType,
				pickupLatitude:  job.customerLocation.latitude,
				pickupLongitude: job.customerLocation.longitude,
				pickupAddress:   job.customerLocation.address ?? null,
				estimatedCost:   job.estimatedPrice            ?? null,
				notes:           job.notes                     ?? null,
				...(preAuthorizedIntentId ? { paymentIntentId: preAuthorizedIntentId } : {}),
			});

			// Backend returns { message, job: { id, ... } }
			const jobId =
				response.data.job?.id ??
				response.data.id      ??
				response.data.data?.id;

			setJob(prev => ({ ...prev, id: jobId }));

			// Fallback timeout in case dispatchService's job-no-driver-found is missed
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
				travelFee,
				searchMessage,
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
