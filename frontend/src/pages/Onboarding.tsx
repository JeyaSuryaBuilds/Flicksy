import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { Button } from "../components/Button";
import styles from "./Onboarding.module.css";

const slides = [
  {
    title: "Share your world",
    desc: "Post photos and videos that show who you really are — no filters required.",
  },
  {
    title: "Find your people",
    desc: "Discover creators, friends, and communities that match your vibe.",
  },
  {
    title: "Stay in the loop",
    desc: "Stories, chats, and notifications keep you close to what matters.",
  },
];

export function Onboarding() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const isLast = index === slides.length - 1;

  return (
    <AuthLayout>
      <div className={styles.skipRow}>
        <button className={styles.skip} onClick={() => navigate("/login")}>
          Skip
        </button>
      </div>

      <div className={styles.slideArea}>
        <div className={styles.illustration} aria-hidden="true" />
        <h1 className={styles.title}>{slides[index].title}</h1>
        <p className={styles.desc}>{slides[index].desc}</p>
      </div>

      <div className={styles.dots}>
        {slides.map((_, i) => (
          <span key={i} className={i === index ? styles.dotActive : styles.dot} />
        ))}
      </div>

      <Button
        onClick={() => {
          if (isLast) navigate("/login");
          else setIndex((i) => i + 1);
        }}
      >
        {isLast ? "Get Started" : "Next"}
      </Button>
    </AuthLayout>
  );
}
