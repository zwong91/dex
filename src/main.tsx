import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import theme from './theme';

import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import TransactionStatusWidget from "./components/TransactionStatusWidget";

import PoolPage from "./pages/Pool";
import PortfolioPage from "./pages/Portfolio";
import SwapPage from "./pages/Swap";
import WalletPage from "./pages/Wallet";
import AddLiquidityPage from "./pages/AddLiquidity";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./dex/wagmiConfig.ts";

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
    path: "/pool/add-liquidity",
    element: <AddLiquidityPage />,
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
            <TransactionStatusWidget />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </StrictMode>
);
