import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocalizationProvider, useLocalization } from "@/contexts/LocalizationContext";
import { initAnalytics } from "@/lib/analytics";
import { isRTL } from "@/lib/utils";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Initialize PostHog analytics
initAnalytics();

// Component to handle RTL direction
const AppContent = () => {
  const { language } = useLocalization();
  const isRTLLanguage = isRTL(language);

  return (
    <div dir={isRTLLanguage ? 'rtl' : 'ltr'} className={isRTLLanguage ? 'rtl' : 'ltr'}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocalizationProvider>
      <AppContent />
    </LocalizationProvider>
  </QueryClientProvider>
);

export default App;
