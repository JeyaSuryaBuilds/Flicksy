import { useEffect, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { NotificationItem } from "../components/NotificationItem";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { BellIcon } from "../components/icons";
import * as notificationsApi from "../services/notifications";
import type { Notification } from "../types";
import styles from "./Notifications.module.css";

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    notificationsApi
      .getNotifications()
      .then(setNotifications)
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, []);

  const handleClick = async (notification: Notification) => {
    if (notification.is_read) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    try {
      await notificationsApi.markNotificationRead(notification.id);
    } catch {
      // non-critical — leave as read locally
    }
  };

  return (
    <AppLayout>
      <div className={styles.header}>
        <h1 className={styles.title}>Alerts</h1>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState icon={<BellIcon />} title="Couldn't load Alerts" description="Please try again shortly." />
      ) : notifications.length === 0 ? (
        <EmptyState icon={<BellIcon />} title="You're all caught up" description="New activity will show up here." />
      ) : (
        <div className={styles.list}>
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={() => handleClick(n)} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
