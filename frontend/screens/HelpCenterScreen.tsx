import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

interface FaqItem {
	q: string;
	a: string;
}

const FAQ: FaqItem[] = [
	{
		q: "How do I request roadside assistance?",
		a: "From the home screen, confirm your location, then choose a service (Towing, Tire Change, Lockout, etc.). Review the price estimate and tap 'Request Help'. You'll be matched with the nearest available provider.",
	},
	{
		q: "How long will it take for a provider to arrive?",
		a: "Typical arrival times are 15–45 minutes depending on your location and demand. Once a driver accepts your request, you'll see a live ETA and can track their location on the map in real time.",
	},
	{
		q: "How is the final price calculated?",
		a: "You see an estimated base price before confirming. The final amount is set by your provider after the service is complete and may include additional labor or parts. HST (13%) is added at checkout.",
	},
	{
		q: "What payment methods are accepted?",
		a: "We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover) through Stripe's secure payment system. Add and manage your cards in Settings → Payment Methods.",
	},
	{
		q: "Can I cancel a request?",
		a: "Yes — tap 'Cancel Request' while waiting for a driver. Cancellations are free if no driver has been assigned yet. Once a driver is en route, a cancellation fee may apply.",
	},
	{
		q: "The driver hasn't arrived. What do I do?",
		a: "Use the call button on the tracking screen to reach the driver directly. If there's no answer or a problem, contact our support team at support@roadlift.com.",
	},
	{
		q: "How do I add or remove a payment card?",
		a: "Go to Settings → Payment Methods. Tap the '+' button to add a new card, or swipe left / tap the trash icon to remove one. You can also set a default card for faster checkout.",
	},
	{
		q: "I'm a driver — how do I get paid?",
		a: "RoadLift uses Stripe Connect for driver payouts. Go to Settings → Set Up Payouts to connect your bank account. Earnings are transferred automatically after each completed job, typically within 2 business days.",
	},
	{
		q: "How do I update my phone number or email?",
		a: "Go to Settings → Edit Profile and tap 'Change' next to your phone or email. We'll send a 6-digit verification code to the new contact before saving the change.",
	},
	{
		q: "How do I report a problem with a job?",
		a: "Email support@roadlift.com with your job ID (found in Settings → Job History) and a description of the issue. Our team responds within 24 hours on business days.",
	},
];

const FaqRow: React.FC<{ item: FaqItem }> = ({ item }) => {
	const { colors } = useTheme();
	const [open, setOpen] = useState(false);

	return (
		<View style={[styles.faqItem, { borderBottomColor: colors.border }]}>
			<TouchableOpacity
				onPress={() => setOpen(v => !v)}
				style={styles.faqQuestion}
				activeOpacity={0.7}
			>
				<Text style={[styles.faqQ, { color: colors.text }]}>{item.q}</Text>
				<Ionicons
					name={open ? "chevron-up" : "chevron-down"}
					size={18}
					color={colors.textMuted}
				/>
			</TouchableOpacity>
			{open && (
				<Text style={[styles.faqA, { color: colors.textMuted }]}>{item.a}</Text>
			)}
		</View>
	);
};

export const HelpCenterScreen = () => {
	const { colors } = useTheme();

	const handleEmail = () =>
		Linking.openURL("mailto:support@roadlift.com?subject=RoadLift Support").catch(() => {});
	const handlePhone = () =>
		Linking.openURL("tel:18007623454").catch(() => {}); // 1-800-ROADLIFT

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView contentContainerStyle={styles.content}>

				{/* Hero */}
				<View style={[styles.hero, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
					<Ionicons name="help-buoy-outline" size={36} color={colors.primary} />
					<Text style={[styles.heroTitle, { color: colors.text }]}>
						How can we help?
					</Text>
					<Text style={[styles.heroSub, { color: colors.textMuted }]}>
						Find answers below or reach our team directly.
					</Text>
				</View>

				{/* FAQ */}
				<Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
					FREQUENTLY ASKED QUESTIONS
				</Text>
				<View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					{FAQ.map((item, i) => (
						<FaqRow key={i} item={item} />
					))}
				</View>

				{/* Contact */}
				<Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
					CONTACT SUPPORT
				</Text>
				<View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

					<TouchableOpacity
						onPress={handleEmail}
						style={styles.contactRow}
						activeOpacity={0.7}
					>
						<View style={[styles.contactIcon, { backgroundColor: colors.accentBg }]}>
							<Ionicons name="mail-outline" size={20} color={colors.primary} />
						</View>
						<View style={styles.contactInfo}>
							<Text style={[styles.contactLabel, { color: colors.textMuted }]}>
								Email us
							</Text>
							<Text style={[styles.contactValue, { color: colors.text }]}>
								support@roadlift.com
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
					</TouchableOpacity>

					<View style={[styles.divider, { backgroundColor: colors.border }]} />

					<TouchableOpacity
						onPress={handlePhone}
						style={styles.contactRow}
						activeOpacity={0.7}
					>
						<View style={[styles.contactIcon, { backgroundColor: colors.greenBg }]}>
							<Ionicons name="call-outline" size={20} color={colors.green} />
						</View>
						<View style={styles.contactInfo}>
							<Text style={[styles.contactLabel, { color: colors.textMuted }]}>
								Call us
							</Text>
							<Text style={[styles.contactValue, { color: colors.text }]}>
								1-800-ROADLIFT
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
					</TouchableOpacity>
				</View>

				<Text style={[styles.note, { color: colors.textMuted }]}>
					Support hours: Mon–Fri 8 am – 8 pm ET · Emergency line available 24/7
				</Text>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container:    { flex: 1 },
	content:      { padding: 20, paddingBottom: 40 },
	hero: {
		alignItems: "center",
		borderRadius: 16,
		borderWidth: 1,
		padding: 28,
		marginBottom: 28,
		gap: 8,
	},
	heroTitle:    { fontSize: 22, fontWeight: "800", textAlign: "center" },
	heroSub:      { fontSize: 14, textAlign: "center" },
	sectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.8,
		marginBottom: 12,
		marginLeft: 2,
	},
	faqCard: {
		borderRadius: 16,
		borderWidth: 1,
		overflow: "hidden",
		marginBottom: 28,
	},
	faqItem: { borderBottomWidth: 1 },
	faqQuestion: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 16,
		gap: 12,
	},
	faqQ: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 22 },
	faqA: { fontSize: 14, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 16 },
	contactCard: {
		borderRadius: 16,
		borderWidth: 1,
		overflow: "hidden",
		marginBottom: 20,
	},
	contactRow:   { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
	contactIcon: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	contactInfo:  { flex: 1 },
	contactLabel: { fontSize: 12, marginBottom: 2 },
	contactValue: { fontSize: 15, fontWeight: "600" },
	divider:      { height: 1, marginLeft: 74 },
	note:         { fontSize: 12, textAlign: "center", lineHeight: 18 },
});
