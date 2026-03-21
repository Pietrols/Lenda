import { Routes, Route } from "react-router-dom";

// Pages — we'll build these out one by one
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ListingsPage from "./pages/listings/ListingsPage";
import ListingDetailPage from "./pages/listings/ListingDetailPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/listings" element={<ListingsPage />} />
      <Route path="/listings/:id" element={<ListingDetailPage />} />
      <Route path="/profiles/:id" element={<ProfilePage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Dashboard */}
      <Route path="/dashboard/*" element={<DashboardPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
