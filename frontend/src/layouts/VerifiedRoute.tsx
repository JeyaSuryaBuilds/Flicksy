import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingSpinner } from "../components/LoadingSpinner";

/**
 * Like ProtectedRoute, but also requires the account's email to be verified.
 * Used for every "real" app route (Home, Explore, Rush, Profile, ...) so that
 * neither registering nor logging in with an unverified account can reach
 * them — they're always sent to /verify-email instead, regardless of how
 * they got here (fresh registration, or logging back in later).
 *
 * /verify-email itself is intentionally wrapped in the plain ProtectedRoute
 * (auth only) rather than this one, or an unverified user landing there
 * would immediately be redirected right back to itself.
 */
export function VerifiedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner size={36} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && !user.is_email_verified) {
    return <Navigate to="/verify-email" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}