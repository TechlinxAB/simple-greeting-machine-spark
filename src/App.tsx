
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts";
import { AppLayout } from "./components/AppLayout";
import { ThemeProvider } from "./components/ThemeProvider";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TimeTracking from "./pages/TimeTracking";
import Clients from "./pages/Clients";
import Products from "./pages/Products";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Administration from "./pages/Administration";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes wrapped in AppLayout */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<TimeTracking />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/products" element={<Products />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/administration" element={<Administration />} />
                
                {/* Protected route requiring admin or manager role */}
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Settings />
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={<Profile />} />
                
                {/* Redirect old paths */}
                <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
              </Route>
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
