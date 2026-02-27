export interface Vehicle {
	year: string;
	make: string;
	model: string;
	plate: string;
	color?: string;
}

export interface User {
	id: string;
	name: string;
	email: string;
	phone: string;
	role: "CUSTOMER" | "DRIVER";
	vehicle: Vehicle;
	token: string;
}

export interface RegisterDTO {
	name: string;
	phone: string;
	email: string;
	password: string;
	vehicle: {
		year: string;
		make: string;
		model: string;
		plate: string;
		color?: string;
	};
}

export type ServiceTypeId = "towing" | "tire" | "lockout" | "fuel" | "accident";

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
	location: Location;
}

export type JobStatus =
	| "idle"
	| "selecting"
	| "confirming"
	| "searching"
	| "tracking"
	| "completed"
	| "payment"
	| "rating";

export interface Job {
	id?: string;
	serviceType: ServiceTypeId | null;
	customerLocation: Location | null;
	notes?: string;
	status: JobStatus;
	provider?: Provider;
	estimatedPrice?: number;
	finalPrice?: number;
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
	brand: "Visa" | "Mastercard" | "Amex";
	last4: string;
	expMonth: number;
	expYear: number;
	isDefault: boolean;
}
