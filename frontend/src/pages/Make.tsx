import { useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { ImageIcon, RushIcon, SparkleIcon, MessageIcon } from "../components/icons";
import styles from "./Make.module.css";

export function Make() {
  const navigate = useNavigate();

  const options = [
    {
      icon: <ImageIcon size={26} />,
      title: "New Flick",
      description: "Share a photo, video, or GIF to your Stream",
      onClick: () => navigate("/create/flick"),
    },
    {
      icon: <RushIcon size={26} />,
      title: "Rush",
      description: "Post a short video to Flicksy's Rush experience",
      onClick: () => navigate("/create/rush"),
    },
    {
      icon: <SparkleIcon size={26} />,
      title: "Moment",
      description: "Text, drawing, filters — disappears in 24 hours",
      onClick: () => navigate("/create/moment"),
    },
    {
      icon: <MessageIcon size={26} />,
      title: "Flash",
      description: "Send a quick private photo or video from Chats",
      onClick: () => navigate("/messages"),
    },
  ];

  return (
    <AppLayout>
      <div className={styles.wrap}>
        <h1 className={styles.title}>Make</h1>
        <div className={styles.grid}>
          {options.map((opt) => (
            <button key={opt.title} className={styles.card} onClick={opt.onClick}>
              <div className={styles.iconCircle}>{opt.icon}</div>
              <div className={styles.cardTitle}>{opt.title}</div>
              <div className={styles.cardDesc}>{opt.description}</div>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
