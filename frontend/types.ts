export interface Vehicle {
	year: string;
	make: string;
	model: string;
	plate: string;
	color?: string;
}

export interface DriverProfile {
	companyName: string;
	serviceArea: string;
	licenseNumber: string;
	vehicleType: string;
	insuranceNumber?: string;
}

export interface User {
	id: string;
	name: string;
	email: string;
	phone: string;
	phoneNumber?: string; // backend alias — prefer phone
	role: "CUSTOMER" | "DRIVER";
	vehicle?: Vehicle;
	driverProfile?: DriverProfile;
	token: string;
	defaultVehicleId?: string | number;
	defaultPaymentMethodId?: string; // ← was missing; needed by PaymentScreen
}

export interface RegisterDTO {
	name: string;
	phone: string;
	email: string;
	password: string;
	role: "CUSTOMER" | "DRIVER";
	vehicle?: {
		year: string;
		make: string;
		model: string;
		plate: string;
		color?: string;
	};
	driverProfile?: {
		companyName: string;
		serviceArea: string;
		licenseNumber: string;
		vehicleType: string;
		insuranceNumber?: string;
	};
}

export type ServiceTypeId =
	| "towing"
	| "tire-change"
	| "car-lockout"
	| "fuel-delivery"
	| "battery-boost"
	| "accident";

export interface ServiceOption {
	id: ServiceTypeId;
	title: string;
	description: string;
	basePrice: number;
	icon: string;
}

export interface Location {
	latitude: number;
	longitude: number;
	address?: string;
}

export interface Provider {
	id: string;
	name: string;
	rating: number;
	vehicle: string;
	location: Location | null;
	phone?: string; // ← needed for call button in LiveTrackingScreen
}

export type JobStatus =
	| "idle"
	| "selecting"
	| "confirming"
	| "searching"
	| "tracking"
	| "arrived"      // driver has arrived at customer location
	| "in_progress"  // service actively being performed
	| "completed"
	| "payment"
	| "rating";

export interface Job {
	id?: string;
	serviceType: ServiceTypeId | null;
	customerLocation: Location | null;
	notes?: string;
	status: JobStatus;
	// Driver-facing fields (populated when driver accepts job)
	customerName?: string;  // ← was missing — shown in ActiveJobScreen
	customerPhone?: string; // ← was missing — used for call button
	// Customer-facing fields
	provider?: Provider;
	estimatedPrice?: number;
	currentPrice?: number;  // estimatedPrice + travelFee for current dispatch stage
	travelFee?: number;     // extra fee added as search radius expands
	finalPrice?: number;
	// Dispatch search state
	searchMessage?: string; // shown while searching ("Expanding to 10 km...")
	dispatchStage?: number;
	currentRadius?: number;
}

// --- Admin / Settings Types ---

export type ThemeOption = "light" | "dark" | "system";

export interface NotificationPreferences {
	push: boolean;
	sms: boolean;
	emailReceipts: boolean;
	promotions: boolean;
}

export interface UserSettings {
	theme: ThemeOption;
	notifications: NotificationPreferences;
}

export interface ActiveSession {
	id: string;
	device: string;
	location: string;
	lastActive: string;
	isCurrent: boolean;
}

export interface PaymentMethod {
	id: string;
	brand: string;
	last4: string;
	expMonth: number;
	expYear: number;
	isDefault: boolean;
}
