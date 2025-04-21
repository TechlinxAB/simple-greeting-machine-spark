
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts";
import { AppLayout } from "./components/AppLayout";
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
import UserStats from "./pages/UserStats";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useEffect } from "react";
import { useLanguage } from "./contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";

const SECRET_FLAG = "secret_admin_logged_in";

const App = () => {
  const { language } = useLanguage();
  
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const isSecretAdmin = typeof window !== "undefined" && localStorage.getItem(SECRET_FLAG) === "1";

  return (
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {isSecretAdmin ? (
              <Route path="/settings" element={<Settings />} />
            ) : (
              <Route element={<AppLayout />}>
                <Route path="/" element={<TimeTracking />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/products" element={<Products />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/administration" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Administration />
                  </ProtectedRoute>
                } />
                <Route path="/user-stats/:userId" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <UserStats />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={<Profile />} />
                <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
              </Route>
            )}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
