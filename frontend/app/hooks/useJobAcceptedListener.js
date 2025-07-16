import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useSocket } from "../_context/SocketContext"; // Adjust path if needed

/**
 * A custom hook that listens for the 'job-accepted' event for a specific job ID.
 * When the event is received, it navigates the user to the live tracking screen.
 * @param {string | number} jobId - The ID of the job to listen for.
 */
const useJobAcceptedListener = jobId => {
	const router = useRouter();
	const { socket, isConnected } = useSocket();

	useEffect(() => {
		// Do nothing if socket is not ready or if we don't have a jobId
		if (!socket || !isConnected || !jobId) {
			return;
		}

		console.log(`useJobAcceptedListener: Attaching listener for Job ID: ${jobId}`);

		const handleJobAccepted = data => {
			console.log("useJobAcceptedListener: Received 'job-accepted' event:", data);

			// Compare incoming jobId with the one this hook is listening for
			if (String(data.jobId) === String(jobId)) {
				Alert.alert("Driver Found!", data.message);
				router.replace({
					pathname: "/live-tracking",
					params: { jobId: data.jobId, driverId: data.driverId },
				});
			}
		};

		// Attach the listener
		socket.on("job-accepted", handleJobAccepted);

		// Cleanup function to remove the listener when the component unmounts
		// or when any dependency in the array changes.
		return () => {
			console.log(`useJobAcceptedListener: Cleaning up listener for Job ID: ${jobId}`);
			socket.off("job-accepted", handleJobAccepted);
		};
	}, [socket, isConnected, jobId, router]); // Dependencies
};

export default useJobAcceptedListener;
