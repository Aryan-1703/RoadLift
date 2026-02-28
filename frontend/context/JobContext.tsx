import React, {
	createContext,
	useState,
	useContext,
	ReactNode,
	useCallback,
	useEffect,
} from "react";
import { Job, JobStatus, ServiceTypeId, Provider, Location } from "../types";
import socketClient from "../services/socket";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";

interface JobContextType {
	job: Job;
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
	serviceType: null,
	customerLocation: null,
	status: "idle",
};

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [job, setJob] = useState<Job>(initialJobState);
	const [providerLocation, setProviderLocation] = useState<Location | null>(null);
	const [eta, setEta] = useState<number | null>(null);
	const { user } = useAuth();

	const resetJob = useCallback(() => {
		setJob(initialJobState);
		setProviderLocation(null);
		setEta(null);
	}, []);

	useEffect(() => {
		if (!user) {
			resetJob();
		}
	}, [user, resetJob]);

	useEffect(() => {
		// Real-time Socket Listeners
		const handleProviderAssigned = (data: { jobId: string; provider: Provider }) => {
			socketClient.emit("join-job", data.jobId);
			setJob(prev => ({
				...prev,
				status: "tracking",
				provider: data.provider,
				id: data.jobId,
			}));
			setProviderLocation(data.provider.location);
		};

		const handleLocationUpdate = (data: {
			jobId: string;
			location: { latitude: number; longitude: number };
			eta?: number;
		}) => {
			setProviderLocation({
				latitude: data.location.latitude,
				longitude: data.location.longitude,
			});
			if (data.eta) setEta(data.eta);
		};

		const handleJobCompleted = (data: { finalPrice: number }) => {
			setJob(prev => ({ ...prev, status: "payment", finalPrice: data.finalPrice }));
		};

		socketClient.on("provider-assigned", handleProviderAssigned);
		socketClient.on("driver-location-updated", handleLocationUpdate);
		socketClient.on("job-completed", handleJobCompleted);

		return () => {
			socketClient.off("provider-assigned", handleProviderAssigned);
			socketClient.off("driver-location-updated", handleLocationUpdate);
			socketClient.off("job-completed", handleJobCompleted);
		};
	}, []);

	const setJobStatus = useCallback((status: JobStatus) => {
		setJob(prev => ({ ...prev, status }));
	}, []);

	const selectService = useCallback((type: ServiceTypeId, price: number) => {
		setJob(prev => ({
			...prev,
			serviceType: type,
			estimatedPrice: price,
			status: "confirming",
		}));
	}, []);

	const setCustomerLocation = useCallback((loc: Location) => {
		setJob(prev => ({ ...prev, customerLocation: loc }));
	}, []);

	const setNotes = useCallback((notes: string) => {
		setJob(prev => ({ ...prev, notes }));
	}, []);

	const requestService = useCallback(async () => {
		if (!job.customerLocation || !job.serviceType || !user) return;

		setJob(prev => ({ ...prev, status: "searching" }));

		try {
			// Backend expects upper-cased Enums like 'TOWING'
			const response = await api.post<any>("/jobs", {
				serviceType: job.serviceType.toUpperCase(),
				pickupLat: job.customerLocation.latitude,
				pickupLng: job.customerLocation.longitude,
				notes: job.notes,
			});

			const createdJob = response.data.data;
			setJob(prev => ({ ...prev, id: createdJob.id }));
		} catch (err) {
			console.error("Failed to request service", err);
			setJob(prev => ({ ...prev, status: "idle" }));
			// We should ideally throw this error so the UI can catch it and show a toast
			throw err;
		}
	}, [job.customerLocation, job.serviceType, job.notes, user]);

	const cancelJob = useCallback(() => {
		resetJob();
	}, [resetJob]);

	return (
		<JobContext.Provider
			value={{
				job,
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
