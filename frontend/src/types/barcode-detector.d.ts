// The BarcodeDetector Web API isn't in TypeScript's bundled DOM lib yet, though it's
// implemented natively in Chromium-based browsers and WebViews (including the Android
// WebView this app's Capacitor build runs in). Callers must feature-detect with
// `"BarcodeDetector" in window` before constructing one, since Safari/iOS and older
// Android WebViews don't support it.
interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: { x: number; y: number }[];
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
  static getSupportedFormats(): Promise<string[]>;
}