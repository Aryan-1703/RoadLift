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

		socketClient.on("provider-assigned", handleProviderAssigned);
		socketClient.on("provider-location-update", handleLocationUpdate);
		socketClient.on("job-completed", handleJobCompleted);

		return () => {
			socketClient.off("provider-assigned", handleProviderAssigned);
			socketClient.off("provider-location-update", handleLocationUpdate);
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
			console.warn(
				"Backend /jobs failed. Falling back to local mock tracking so you can test the UI.",
			);

			// FALLBACK: If backend fails, simulate the job locally so the user isn't stuck.
			setTimeout(() => {
				const mockJobId = `mock_job_${Math.random()}`;
				const startLat = job.customerLocation!.latitude + 0.015;
				const startLng = job.customerLocation!.longitude + 0.015;

				setJob(prev => ({
					...prev,
					id: mockJobId,
					status: "tracking",
					provider: {
						id: "mock_prov_1",
						name: "Mike Towing (Mock)",
						rating: 4.9,
						vehicle: "Flatbed Tow Truck",
						location: { latitude: startLat, longitude: startLng },
					},
				}));

				setProviderLocation({ latitude: startLat, longitude: startLng });

				// Simulate movement towards customer
				let steps = 0;
				const maxSteps = 5;
				const interval = setInterval(() => {
					steps++;
					if (steps >= maxSteps) {
						clearInterval(interval);
						setJob(prev => ({
							...prev,
							status: "payment",
							finalPrice: (prev.estimatedPrice || 85) + 15,
						}));
						return;
					}
					setProviderLocation(prev =>
						prev
							? {
									latitude: prev.latitude - 0.003,
									longitude: prev.longitude - 0.003,
								}
							: null,
					);
					setEta(maxSteps - steps);
				}, 2000);
			}, 3000);
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
