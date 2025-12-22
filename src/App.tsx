import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import Analytics from "./pages/Analytics";
import Assets from "./pages/Assets";
import Docs from "./pages/Docs";
import Api from "./pages/Api";
import Explorer from "./pages/Explorer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Explorer />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/api" element={<Api />} />
              <Route path="/explorer" element={<Explorer />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </ThemeProvider>
);

export default App;
