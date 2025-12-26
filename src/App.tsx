import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import { WagmiProvider } from 'wagmi';
import { HelmetProvider } from 'react-helmet-async';
import { config } from '@/lib/wagmi';
import { CommandPalette } from '@/components/CommandPalette';
import Analytics from "./pages/Analytics";
import Assets from "./pages/Assets";
import Docs from "./pages/Docs";
import Api from "./pages/Api";
import Explorer from "./pages/Explorer";
import Admin from "./pages/Admin";
import TokenDetail from "./pages/TokenDetail";
import WalletExplorer from "./pages/WalletExplorer";
import Wallet from "./pages/Wallet";
import HyperEVMTransaction from "./pages/HyperEVMTransaction";
import HyperCoreTrade from "./pages/HyperCoreTrade";
import Market from "./pages/Market";
import Markets from "./pages/Markets";
import Token from "./pages/Token";
import Block from "./pages/Block";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={200}>
            <Toaster />
            <Sonner position="bottom-right" />
            <BrowserRouter>
              <CommandPalette />
              <Routes>
                <Route path="/" element={<Explorer />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/assets/:symbol" element={<TokenDetail />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/api" element={<Api />} />
                <Route path="/explorer" element={<Explorer />} />
                <Route path="/explorer/wallet/:address" element={<WalletExplorer />} />
                <Route path="/wallet/:address" element={<Wallet />} />
                <Route path="/tx/:hash" element={<HyperEVMTransaction />} />
                <Route path="/explorer/tx/:hash" element={<HyperEVMTransaction />} />
                <Route path="/trade/:id" element={<HyperCoreTrade />} />
                <Route path="/market" element={<Markets />} />
                <Route path="/market/:symbol" element={<Market />} />
                <Route path="/explorer/market/:symbol" element={<Market />} />
                <Route path="/token/:identifier" element={<Token />} />
                <Route path="/explorer/token/:identifier" element={<Token />} />
                <Route path="/block/:number" element={<Block />} />
                <Route path="/explorer/block/:number" element={<Block />} />
                <Route path="/admin" element={<Admin />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
