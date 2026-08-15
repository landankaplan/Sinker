// Next.js file convention: this is automatically detected and served at
// /manifest.webmanifest - no route file, no extra config needed. It's what
// tells a phone/desktop browser "this site can be installed as an app" and
// supplies the icon, name, and colors to use when it is.
export default function manifest() {
  return {
    name: "StayAhead",
    short_name: "StayAhead",
    description: "Save the right amount, every paycheck, for the bills you know are coming.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf9f5",
    theme_color: "#d95926",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
