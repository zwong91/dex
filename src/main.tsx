import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { Toaster } from "sonner";

import Wallet from "./pages/Wallet.tsx";
import MarketPlace from "./pages/MarketPlace.tsx";
import Dashboard from "./pages/DashBoard.tsx";
import ModernHome from "./pages/ModernHome.tsx";
import Simple from "./pages/Simple";
import ModernSwap from "./pages/ModernSwap";
import Position from "./pages/Position";
import Complex from "./pages/Complex";

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { config } from "./utils/wagmiConfig.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <ModernHome />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/swap",
    element: <ModernSwap />,
  },
  {
    path: "/position",
    element: <Position />,
  },
  {
    path: "/analytics",
    element: <Dashboard />,
  },
  {
    path: "/wallet",
    element: <Wallet />,
  },
  {
    path: "/market",
    element: <MarketPlace />,
  },
  {
    path: "/trading",
    element: <Simple />,
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
  // Redirect old routes
  {
    path: "/simple",
    element: <Navigate to="/swap" replace />,
  },
]);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Toaster richColors position="top-center" />
          <RouterProvider router={router} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
