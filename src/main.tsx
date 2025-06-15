import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme';

import "./index.css";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { Toaster } from "sonner";

import WalletPage from "./pages/Wallet";
import SwapPage from "./pages/Swap";
import PoolPage from "./pages/Pool";
import PortfolioPage from "./pages/Portfolio";

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { config } from "./utils/wagmiConfig.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/swap" replace />,
  },
  {
    path: "/swap",
    element: <SwapPage />,
  },
  {
    path: "/pool",
    element: <PoolPage />,
  },
  {
    path: "/dashboard",
    element: <PortfolioPage />,
  },
  {
    path: "/wallet",
    element: <WalletPage />,
  },
]);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider locale="en">
            <Toaster richColors position="top-center" />
            <RouterProvider router={router} />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </StrictMode>
);
