"use client";

import { useEffect } from "react";

// Renders nothing - just registers public/sw.js on mount so the app becomes
// installable and its static assets get precached. Failing silently is
// intentional: an unsupported browser (or plain http in local dev) should
// just behave like a normal website, not show an error.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
