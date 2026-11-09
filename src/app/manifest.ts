import type { MetadataRoute } from "next";

// Lets you add kelvo to your phone's home screen and open it full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kelvo",
    short_name: "kelvo",
    description: "Log lifts and runs by chatting. See which muscles you hit today.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
