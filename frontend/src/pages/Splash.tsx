import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthLayout } from "../layouts/AuthLayout";
import { LoadingSpinner } from "../components/LoadingSpinner";
import styles from "./Splash.module.css";

export function Splash() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      navigate(isAuthenticated ? "/home" : "/onboarding", { replace: true });
    }, 900);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <AuthLayout>
      <div className={styles.center}>
        <div className={styles.wordmark}>
          flick<span>zy</span>
        </div>
        <div className={styles.spinnerWrap}>
          <LoadingSpinner size={22} />
        </div>
      </div>
    </AuthLayout>
  );
}
