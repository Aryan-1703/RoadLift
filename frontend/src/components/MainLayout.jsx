import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const MainLayout = () => {
	return (
		<div className="main-layout">
			<main style={{ paddingBottom: "70px" }}>
				{" "}
				<Outlet />{" "}
			</main>
			<Navbar />
		</div>
	);
};

export default MainLayout;
