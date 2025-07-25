import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	runOnJS,
} from "react-native-reanimated";
import { FontAwesome5 } from "@expo/vector-icons";
import Colors from "../_constants/Colors";

const ACTION_WIDTH = 85;
const SWIPE_THRESHOLD = -ACTION_WIDTH;

const SwipeableRow = ({ children, onDelete }) => {
	const translateX = useSharedValue(0);

	const pan = Gesture.Pan()
		.activeOffsetX([-20, 20])
		.onUpdate(event => {
			translateX.value = Math.min(0, event.translationX);
		})
		.onEnd(event => {
			if (event.translationX < SWIPE_THRESHOLD) {
				translateX.value = withTiming(-ACTION_WIDTH);
			} else {
				translateX.value = withTiming(0);
			}
		});

	const handleDeletePress = () => {
		"worklet";
		translateX.value = withTiming(0);
		if (onDelete) {
			runOnJS(onDelete)();
		}
	};

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	return (
		<View style={styles.swipeableContainer}>
			<View style={styles.deleteActionContainer}>
				<TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
					<FontAwesome5 name="trash" size={20} color="#fff" />
				</TouchableOpacity>
			</View>
			<GestureDetector gesture={pan}>
				<Animated.View style={animatedStyle}>{children}</Animated.View>
			</GestureDetector>
		</View>
	);
};

const styles = StyleSheet.create({
	swipeableContainer: { backgroundColor: "#ff3b30" },
	deleteActionContainer: {
		position: "absolute",
		right: 0,
		top: 0,
		bottom: 0,
		justifyContent: "center",
	},
	deleteButton: {
		backgroundColor: Colors.light.danger,
		width: ACTION_WIDTH,
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
});

export default SwipeableRow;
