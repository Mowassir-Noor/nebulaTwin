import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastContainer } from '@/components/ui/Toast';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const TwinsPage = lazy(() => import('@/pages/twins/TwinsPage'));
const ViewerPage = lazy(() => import('@/pages/viewer/ViewerPage'));
const SensorsPage = lazy(() => import('@/pages/sensors/SensorsPage'));
const SensorTestingPage = lazy(() => import('@/pages/sensors/SensorTestingPage'));
const AlertsPage = lazy(() => import('@/pages/alerts/AlertsPage'));
const ModelsPage = lazy(() => import('@/pages/models/ModelsPage'));

// Marketing pages
import { MarketingLayout } from '@/components/layout/MarketingLayout';
const LandingPage = lazy(() => import('@/pages/marketing/LandingPage'));
const FeaturesPage = lazy(() => import('@/pages/marketing/FeaturesPage'));
const AboutPage = lazy(() => import('@/pages/marketing/AboutPage'));
const ContactPage = lazy(() => import('@/pages/marketing/ContactPage'));
const PricingPage = lazy(() => import('@/pages/marketing/PricingPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<LoginPage />} />
              
              <Route element={<MarketingLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/pricing" element={<PricingPage />} />
              </Route>

              <Route path="/control" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="twins" element={<TwinsPage />} />
                <Route path="viewer" element={<ViewerPage />} />
                <Route path="sensors" element={<SensorsPage />} />
                <Route path="sensor-testing" element={<SensorTestingPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="models" element={<ModelsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
        <ToastContainer />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
