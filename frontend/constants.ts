import { ServiceOption } from "./types";

export const SERVICES: ServiceOption[] = [
	{
		id: "towing",
		title: "Towing",
		description: "Flatbed & wheel-lift towing",
		basePrice: 85,
		icon: "M8 1h2v3H8V1zm1 5c-1.1 0-2 .9-2 2v2H4v3h16v-3h-3V8c0-1.1-.9-2-2-2H9zm6 2v2H9V8h6zM5 16c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm14-4c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z",
	},
	{
		id: "tire-change",
		title: "Tire Change",
		description: "We install your spare",
		basePrice: 45,
		icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z",
	},
	{
		id: "car-lockout",
		title: "Lockout",
		description: "Keys locked in car?",
		basePrice: 50,
		icon: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
	},
	{
		id: "fuel-delivery",
		title: "Fuel Delivery",
		description: "Out of gas? We bring 2 gal.",
		basePrice: 40,
		icon: "M19.77 8.35c-.17-.4-.51-.7-.93-.82L15 6.64V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14h12V9.32l4.13 1.11c.42.11.85-.02 1.15-.36.31-.33.43-.8.29-1.2l-1.8-6.52zM13 19H5V5h8v14zm6.05-6.85l-4.05-1.09V9.01l4.9 1.31-.85 1.83z",
	},
	{
		id: "battery-boost",
		title: "Battery Boost",
		description: "Jump start your battery",
		basePrice: 45,
		icon: "M16.67 4H15V2H9v2H7.33C6.6 4 6 4.6 6 5.33v15.33C6 21.4 6.6 22 7.33 22h9.33c.74 0 1.34-.6 1.34-1.33V5.33C18 4.6 17.4 4 16.67 4zM11 20v-5.5H9L13 7v5.5h2L11 20z",
	},
];
