import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

interface Section {
	title: string;
	body: string;
}

const SECTIONS: Section[] = [
	{
		title: "1. Agreement to Terms",
		body: "By downloading, installing, or using the RoadLift mobile application (the App), you agree to be bound by these Terms of Service (Terms). If you do not agree, please uninstall the App and do not use our services. These Terms apply to all users, including customers and service providers (drivers).",
	},
	{
		title: "2. Description of Service",
		body: "RoadLift is an on-demand platform that connects customers who need roadside assistance (towing, tire changes, lockouts, fuel delivery, battery boosts, and accident recovery) with independent service providers. RoadLift facilitates the connection but is not itself a roadside assistance company and does not employ drivers.",
	},
	{
		title: "3. Eligibility",
		body: "You must be at least 18 years old to create an account. By creating an account, you confirm that you are 18 or older and that the information you provide is accurate and complete. Drivers must hold a valid driver's licence and any required commercial licences in their jurisdiction.",
	},
	{
		title: "4. Account Responsibilities",
		body: "You are responsible for maintaining the confidentiality of your account credentials. You agree to notify RoadLift immediately at support@roadlift.com if you suspect unauthorized access to your account. You are liable for all activity that occurs under your account.",
	},
	{
		title: "5. Payments & Fees",
		body: "All payment transactions are processed securely through Stripe. By adding a payment method, you authorize RoadLift to charge the displayed amount, including applicable taxes (currently 13% HST for Ontario). Prices shown in the App are estimates; the final amount is confirmed by the provider after service completion. Driver payouts are processed through Stripe Connect within 2 business days of job completion.",
	},
	{
		title: "6. Cancellations & Refunds",
		body: "Customers may cancel a service request at no charge before a driver has accepted the job. A cancellation fee may apply once a driver has been assigned and is en route. Refund requests for disputed charges must be submitted within 14 days to support@roadlift.com. RoadLift will investigate and respond within 5 business days.",
	},
	{
		title: "7. Conduct",
		body: "All users agree to treat other users with respect and to use the App only for its intended purpose. Abusive, threatening, or fraudulent behaviour is grounds for immediate account termination. Users must not provide false information about their location, vehicle, or required service.",
	},
	{
		title: "8. Driver Obligations",
		body: "Service providers represent that they hold all required licences, insurance, and certifications for the services they offer. Providers are independent contractors, not employees of RoadLift. Providers are solely responsible for their vehicles, tools, and compliance with all applicable laws and regulations.",
	},
	{
		title: "9. Limitation of Liability",
		body: "To the maximum extent permitted by applicable law, RoadLift is not liable for any indirect, incidental, special, or consequential damages arising from your use of the App or services provided by drivers. RoadLift's total liability to any user for any claim shall not exceed the amount paid by that user in the 30 days preceding the claim.",
	},
	{
		title: "10. Privacy",
		body: "Your use of the App is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using RoadLift, you consent to the collection and use of your information as described in the Privacy Policy.",
	},
	{
		title: "11. Intellectual Property",
		body: "All content, trademarks, logos, and software comprising the RoadLift App are the property of RoadLift or its licensors. You may not reproduce, distribute, or create derivative works without written permission.",
	},
	{
		title: "12. Changes to Terms",
		body: "RoadLift may update these Terms from time to time. We will notify users of material changes through the App or by email. Continued use of the App after changes take effect constitutes acceptance of the revised Terms.",
	},
	{
		title: "13. Governing Law",
		body: "These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict-of-law rules. Any disputes shall be resolved in the courts of Ontario.",
	},
	{
		title: "14. Contact",
		body: "Questions about these Terms? Contact us at:\n\nRoadLift\nEmail: legal@roadlift.com\nSupport: support@roadlift.com\n1-800-ROADLIFT",
	},
];

export const TermsScreen = () => {
	const { colors } = useTheme();

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
				<Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
					Last updated: January 1, 2025
				</Text>
				<Text style={[styles.intro, { color: colors.textMuted }]}>
					Please read these Terms of Service carefully before using the RoadLift app.
				</Text>

				{SECTIONS.map((section, i) => (
					<View key={i} style={styles.section}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>
							{section.title}
						</Text>
						<Text style={[styles.body, { color: colors.textMuted }]}>{section.body}</Text>
					</View>
				))}

				<View style={[styles.footer, { borderTopColor: colors.border }]}>
					<Text style={[styles.footerText, { color: colors.textMuted }]}>
						By using RoadLift you acknowledge that you have read, understood, and agree to
						these Terms.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { padding: 24, paddingBottom: 48 },
	title: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
	lastUpdated: { fontSize: 13, marginBottom: 12 },
	intro: { fontSize: 15, lineHeight: 24, marginBottom: 24 },
	section: { marginBottom: 22 },
	sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
	body: { fontSize: 14, lineHeight: 22 },
	footer: {
		marginTop: 16,
		paddingTop: 20,
		borderTopWidth: 1,
	},
	footerText: { fontSize: 13, lineHeight: 20, fontStyle: "italic", textAlign: "center" },
});
