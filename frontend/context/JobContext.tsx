import React, {
	createContext,
	useState,
	useContext,
	ReactNode,
	useCallback,
	useEffect,
} from "react";
import { Job, JobStatus, ServiceTypeId, Provider, Location } from "../types";
import { socket } from "../services/socket";
import { useAuth } from "./AuthContext";

interface JobContextType {
	job: Job;
	setJobStatus: (status: JobStatus) => void;
	selectService: (type: ServiceTypeId, price: number) => void;
	setCustomerLocation: (loc: Location) => void;
	setNotes: (notes: string) => void;
	requestService: () => void;
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
		// Socket Listeners
		const handleProviderAssigned = (provider: Provider) => {
			setJob(prev => ({ ...prev, status: "tracking", provider }));
			setProviderLocation(provider.location);
		};

		const handleLocationUpdate = (data: {
			latitude: number;
			longitude: number;
			eta: number;
		}) => {
			setProviderLocation({ latitude: data.latitude, longitude: data.longitude });
			setEta(data.eta);
		};

		const handleJobCompleted = (data: { finalPrice: number }) => {
			setJob(prev => ({ ...prev, status: "payment", finalPrice: data.finalPrice }));
		};

		socket.on("provider-assigned", handleProviderAssigned);
		socket.on("provider-location-update", handleLocationUpdate);
		socket.on("job-completed", handleJobCompleted);

		return () => {
			socket.off("provider-assigned", handleProviderAssigned);
			socket.off("provider-location-update", handleLocationUpdate);
			socket.off("job-completed", handleJobCompleted);
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

	const requestService = useCallback(() => {
		if (!job.customerLocation || !job.serviceType || !user) return;

		setJob(prev => ({ ...prev, status: "searching" }));

		socket.emit("request-service", {
			userId: user.id,
			serviceType: job.serviceType,
			lat: job.customerLocation.latitude,
			lng: job.customerLocation.longitude,
			notes: job.notes,
		});
	}, [job.customerLocation, job.serviceType, job.notes, user]);

	const cancelJob = useCallback(() => {
		socket.emit("cancel-request", { userId: user?.id });
		resetJob();
	}, [user, resetJob]);

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
