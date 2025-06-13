import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { Toaster } from "sonner";

import DashboardHOC from "./HOCs/DashboardHOC";
import Geography from "./pages/Geography.tsx";
import Pie from "./pages/Pie.tsx";
import Bar from "./pages/Bar.tsx";
import Line from "./pages/Line.tsx";
import Wallet from "./pages/Wallet.tsx";
import MarketPlace from "./pages/MarketPlace.tsx";
import DashBoard from "./pages/DashBoard.tsx";
import Simple from "./pages/Simple";
import Complex from "./pages/Complex";
import Projects from "./pages/Projects.tsx";

import { WagmiProvider } from "wagmi";
import { config } from "./utils/wagmiConfig.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const router = createBrowserRouter([
  {
    path: "/",
    //element: <Login />,
    element: (
      <DashboardHOC>
        <DashBoard />
      </DashboardHOC>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <DashboardHOC>
        <DashBoard />
      </DashboardHOC>
    ),
  },
  {
    path: "/geography",
    element: (
      <DashboardHOC>
        <Geography />
      </DashboardHOC>
    ),
  },
  {
    path: "/pie",
    element: (
      <DashboardHOC>
        <Pie />
      </DashboardHOC>
    ),
  },
  {
    path: "/bar",
    element: (
      <DashboardHOC>
        <Bar />
      </DashboardHOC>
    ),
  },
  {
    path: "/line",
    element: (
      <DashboardHOC>
        <Line />
      </DashboardHOC>
    ),
  },
  {
    path: "/wallet",
    element: (
      <DashboardHOC>
        <Wallet />
      </DashboardHOC>
    ),
  },
  {
    path: "/projects",
    element: (
      <DashboardHOC>
        <Projects />
      </DashboardHOC>
    ),
  },
  {
    path: "/market",
    element: (
      <DashboardHOC>
        <MarketPlace />
      </DashboardHOC>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="simple" replace />,
      },
      {
        path: "simple",
        element: <Simple />,
      },
      {
        path: "advanced",
        element: <Complex />,
      },
    ],
  },
]);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Toaster richColors position="top-center" />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
