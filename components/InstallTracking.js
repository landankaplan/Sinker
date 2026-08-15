"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

// Sends two signals to Vercel Analytics (view them under Analytics ->
// Events in your Vercel dashboard):
//
// - "PWA Session (standalone)": fires once per app open when the page is
//   running in standalone/installed mode. Works on both Android and iOS -
//   but on iOS this is the ONLY signal available at all. Apple's platform
//   gives no way to detect the install moment itself (verified - this is a
//   known, still-open Safari limitation, not something fixable from the
//   app's own code), so this tells you someone HAS installed it, found out
//   the next time they open it - not the instant they tapped "Add to Home
//   Screen."
//
// - "PWA Installed": fires exactly once, at the real moment of install,
//   via the browser's `appinstalled` event. Chrome/Edge on Android and
//   desktop support this; iOS Safari does not fire it at all, so this
//   event will only ever show up for Android/desktop installs.
export default function InstallTracking() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS's own non-standard flag - the only install signal iOS exposes.
      window.navigator.standalone === true;

    if (isStandalone) {
      track("PWA Session (standalone)", {
        platform: /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "other",
      });
    }

    function handleInstalled() {
      track("PWA Installed", { platform: "android-or-desktop" });
    }
    window.addEventListener("appinstalled", handleInstalled);
    return () => window.removeEventListener("appinstalled", handleInstalled);
  }, []);

  return null;
}
