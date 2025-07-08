import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Page Imports
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
// Component Imports
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />

				{/* The root path can also be the login page or a landing page */}
				<Route path="/" element={<LoginPage />} />

				{/* Protected Routes */}
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<DashboardPage />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
