import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "./icons";
import styles from "./QrScanner.module.css";

interface QrScannerProps {
  onClose: () => void;
  onScan: (rawValue: string) => void;
}

const SCAN_FORMATS = ["qr_code"];

export function QrScanner({ onClose, onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasScannedRef = useRef(false);

  const [status, setStatus] = useState<"starting" | "scanning" | "unsupported" | "denied" | "error">("starting");

  useEffect(() => {
    if (!("BarcodeDetector" in window)) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;
    const detector = new BarcodeDetector({ formats: SCAN_FORMATS });

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("scanning");

        const tick = async () => {
          if (cancelled || hasScannedRef.current || !videoRef.current) return;

          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0 && !hasScannedRef.current) {
              hasScannedRef.current = true;
              onScan(results[0].rawValue);
              return;
            }
          } catch {
            // A single failed detection pass isn't fatal — camera frames aren't
            // always decodable (motion blur, out of focus); just try the next one.
          }

          rafRef.current = requestAnimationFrame(() => {
            tick();
          });
        };

        tick();
      } catch (err: any) {
        if (!cancelled) {
          setStatus(err?.name === "NotAllowedError" ? "denied" : "error");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.backdrop}>
      <div className={styles.header}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close scanner">
          <CloseIcon size={22} />
        </button>
        <span className={styles.title}>Scan Flickzy Space QR</span>
        <span className={styles.spacer} />
      </div>

      <div className={styles.viewfinder}>
        {status === "scanning" || status === "starting" ? (
          <>
            <video ref={videoRef} className={styles.video} playsInline muted />
            <div className={styles.frame} />
          </>
        ) : (
          <div className={styles.message}>
            {status === "unsupported" && "QR scanning isn't supported in this browser. Try the flickzy Android app, or ask them to share their profile link directly."}
            {status === "denied" && "Camera access was denied. Allow camera access to scan a Space QR code."}
            {status === "error" && "Couldn't open the camera. Please try again."}
          </div>
        )}
      </div>

      <p className={styles.hint}>Point your camera at a Flickzy Space QR code</p>
    </div>
  );
}