import { Alert } from "react-native";
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
import { useToast } from "./ToastContext";

// Safety-net timeout — backend's job-no-driver-found event fires first (~6.7 min).
// This is only a last-resort fallback if the socket event is somehow missed.
const SEARCH_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export interface ThirdPartyInfo {
	name: string;
	phone: string;
}

interface JobContextType {
	job: Job;
	searchTimedOut: boolean;
	travelFee: number;
	searchMessage: string | null;
	thirdParty: ThirdPartyInfo | null;
	setJobStatus: (status: JobStatus) => void;
	selectService: (type: ServiceTypeId, price: number) => void;
	setCustomerLocation: (loc: Location) => void;
	setNotes: (notes: string) => void;
	setThirdParty: (data: ThirdPartyInfo | null) => void;
	requestService: (preAuthorizedIntentId?: string, vehicleId?: number | string | null) => Promise<void>;
	cancelJob: () => void;
	resetJob: () => void;
	providerLocation: Location | null;
	eta: number | null;
	isRestoringJob: boolean;
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
	const [thirdParty,     setThirdParty]     = useState<ThirdPartyInfo | null>(null);
	const [isRestoringJob, setIsRestoringJob] = useState(true); // true until first restore attempt completes
	const { user } = useAuth();
	const { showToast } = useToast();

	const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Keep a ref to the customer's current location so socket handlers can read it
	// without needing to be re-registered every time it changes.
	const customerLocationRef = useRef<Location | null>(null);
	useEffect(() => {
		customerLocationRef.current = job.customerLocation;
	}, [job.customerLocation]);

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
		setThirdParty(null);
	}, [clearSearchTimeout]);

	useEffect(() => {
		if (!user) {
			resetJob();
			setIsRestoringJob(false);
			return;
		}
		// Restore any in-flight job from the server after login or cold-start
		if (user.role === 'CUSTOMER') {
			api.get<any>('/jobs/active')
				.then(res => {
					const raw = res.data;
					if (!raw) return;
					const statusMap: Record<string, any> = {
						pending:     'searching',
						accepted:    'tracking',
						arrived:     'arrived',
						in_progress: 'in_progress',
					};
					const frontendStatus = statusMap[raw.status];
					if (!frontendStatus) return;
					setJob({
						id:               raw.id,
						serviceType:      raw.serviceType      ?? null,
						customerLocation: raw.customerLocation ?? null,
						notes:            raw.notes            ?? undefined,
						status:           frontendStatus,
						estimatedPrice:   raw.estimatedPrice   ?? undefined,
						currentPrice:     raw.currentPrice     ?? undefined,
						dispatchStage:    raw.dispatchStage    ?? undefined,
						currentRadius:    raw.currentRadius    ?? undefined,
						isThirdParty:     raw.isThirdParty     ?? false,
						recipientName:    raw.recipientName    ?? undefined,
						recipientPhone:   raw.recipientPhone   ?? undefined,
					});
					if (raw.isThirdParty && raw.recipientName) {
						setThirdParty({ name: raw.recipientName, phone: raw.recipientPhone ?? '' });
					}
					if (raw.id) socketClient.emit('join-job', raw.id);
				})
				.catch(() => {}) // silent — network may be unavailable
				.finally(() => setIsRestoringJob(false));
		} else {
			setIsRestoringJob(false);
		}
	}, [user?.id, resetJob]);

	// ── Haversine ETA helper (no Maps API needed) ───────────────────────────
	const calcEtaMinutes = (
		from: { latitude: number; longitude: number },
		to:   { latitude: number; longitude: number },
	): number => {
		const R = 6371;
		const dLat = ((to.latitude  - from.latitude)  * Math.PI) / 180;
		const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) ** 2 +
			Math.cos((from.latitude * Math.PI) / 180) *
				Math.cos((to.latitude * Math.PI) / 180) *
				Math.sin(dLon / 2) ** 2;
		const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return Math.max(0, Math.round((km / 40) * 60)); // 40 km/h average
	};

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
			showToast("Driver found and on the way!", "success");
		};

		const handleLocationUpdate = (data: {
			jobId:    string;
			location: { latitude: number; longitude: number };
			eta?:     number;
		}) => {
			const newLoc = {
				latitude:  data.location.latitude,
				longitude: data.location.longitude,
			};
			setProviderLocation(newLoc);
			if (data.eta != null) {
				setEta(data.eta);
			} else if (customerLocationRef.current) {
				setEta(calcEtaMinutes(newLoc, customerLocationRef.current));
			}
		};

		const handleJobCompleted = (data: {
			finalPrice:    number | null;
			capturedTotal: number | null;
			confirmedBy?:  string;
		}) => {
			const applyCompletion = () => {
				setJob(prev => ({
					...prev,
					status:        "payment",
					finalPrice:    data.finalPrice    ?? undefined,
					capturedTotal: data.capturedTotal ?? undefined,
				}));
			};

			if (data.confirmedBy === "customer") {
				// Customer triggered — go straight to payment
				applyCompletion();
			} else {
				// Driver triggered — show confirmation before payment screen
				const msg = data.capturedTotal
					? `Your driver has finished the service. Total charged: ${data.capturedTotal.toFixed(2)}. Tap below to view your receipt.`
					: data.finalPrice
					? `Your driver has finished the service. Total charged: ${(data.finalPrice * 1.13).toFixed(2)}. Tap below to view your receipt.`
					: "Your driver has finished the service. Tap below to view your receipt.";
				Alert.alert(
					"Job Complete",
					msg,
					[{ text: "View Receipt", onPress: applyCompletion }],
					{ cancelable: false },
				);
			}
		};

		// Driver marked ARRIVED or IN_PROGRESS — update job status so UI can reflect it
		const handleJobStatusUpdated = (data: { jobId: string; status: string }) => {
			if (data.status === "arrived") {
				setJob(prev => ({ ...prev, status: "arrived" }));
				showToast("Your driver has arrived!", "success");
			} else if (data.status === "in_progress") {
				setJob(prev => ({ ...prev, status: "in_progress" }));
				showToast("Service has started.", "info");
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

		// Driver cancelled — job is being re-dispatched; put customer back in searching state
		const handleDriverCancelled = (data: { jobId: string; message: string }) => {
			showToast(data.message || "Your driver cancelled. Finding a new one.", "error");
			setProviderLocation(null);
			setEta(null);
			setSearchMessage(null);
			setSearchTimedOut(false);
			setJob(prev => ({
				...prev,
				status:   "searching",
				provider: undefined,
			}));
			// Restart the safety-net timeout for the new search
			searchTimeoutRef.current = setTimeout(() => {
				setJob(current => {
					if (current.status !== "searching") return current;
					setSearchTimedOut(true);
					return { ...current, status: "idle" };
				});
			}, 10 * 60 * 1000);
		};

		socketClient.on("provider-assigned",        handleProviderAssigned);
		socketClient.on("driver-location-updated",  handleLocationUpdate);
		socketClient.on("job-completed",            handleJobCompleted);
		socketClient.on("job-status-updated",       handleJobStatusUpdated);
		// Stage 0 confirmation + stage 1-4 expansions use the same handler
		socketClient.on("job-search-started",       handleExpandingRadius);
		socketClient.on("job-expanding-radius",     handleExpandingRadius);
		socketClient.on("job-no-driver-found",      handleNoDriverFound);
		socketClient.on("job-cancelled-by-driver",  handleDriverCancelled);

		return () => {
			socketClient.off("provider-assigned",       handleProviderAssigned);
			socketClient.off("driver-location-updated", handleLocationUpdate);
			socketClient.off("job-completed",           handleJobCompleted);
			socketClient.off("job-status-updated",      handleJobStatusUpdated);
			socketClient.off("job-search-started",      handleExpandingRadius);
			socketClient.off("job-expanding-radius",    handleExpandingRadius);
			socketClient.off("job-no-driver-found",     handleNoDriverFound);
			socketClient.off("job-cancelled-by-driver", handleDriverCancelled);
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
	const requestService = useCallback(async (preAuthorizedIntentId?: string, vehicleId?: number | string | null) => {
		if (!job.customerLocation || !job.serviceType || !user) return;

		setSearchTimedOut(false);
		setSearchMessage(null);
		setTravelFee(0);
		setJob(prev => ({ ...prev, status: "searching" }));

		try {
			const response = await api.post<any>("/jobs", {
				serviceType:     job.serviceType,
				pickupLatitude:  job.customerLocation.latitude,
				pickupLongitude: job.customerLocation.longitude,
				pickupAddress:   job.customerLocation.address ?? null,
				estimatedCost:   job.estimatedPrice           ?? null,
				notes:           job.notes                    ?? null,
				vehicleId:       vehicleId ?? user.defaultVehicleId ?? null,
				isThirdParty:    !!thirdParty,
				recipientName:   thirdParty?.name  ?? null,
				recipientPhone:  thirdParty?.phone ?? null,
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
	}, [job.customerLocation, job.serviceType, job.notes, job.estimatedPrice, user, thirdParty]);

	// ── Cancel job ──────────────────────────────────────────────────────────
	const cancelJob = useCallback(async () => {
		clearSearchTimeout();
		setSearchTimedOut(false);

		const currentJobId  = job.id;
		const currentStatus = job.status;

		if (!currentJobId) {
			resetJob();
			return;
		}

		// Optimistic cancel while still searching — no fee, fire and forget
		if (currentStatus === "searching") {
			resetJob();
			api.put(`/jobs/${currentJobId}/cancel`).catch(err =>
				console.warn("[JobContext] Failed to cancel pending job:", err?.message),
			);
			return;
		}

		// After driver assigned — wait for API (fee may be charged)
		try {
			const res = await api.put<{ cancellationFee: number }>(`/jobs/${currentJobId}/cancel`);
			resetJob();
			const fee = res.data?.cancellationFee ?? 0;
			if (fee > 0) {
				showToast(`Cancelled. A $${fee.toFixed(2)} cancellation fee was charged.`, "info");
			}
		} catch (err: any) {
			const msg = err?.response?.data?.message ?? err?.message ?? "Could not cancel";
			showToast(msg, "error");
		}
	}, [job.id, job.status, resetJob, clearSearchTimeout, showToast]);

	return (
		<JobContext.Provider
			value={{
				job,
				searchTimedOut,
				travelFee,
				searchMessage,
				thirdParty,
				setJobStatus,
				selectService,
				setCustomerLocation,
				setNotes,
				setThirdParty,
				requestService,
				cancelJob,
				resetJob,
				providerLocation,
				eta,
				isRestoringJob,
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
