import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The Flask API runs separately in development; proxying keeps the browser on one
    // origin, so there is no CORS layer to configure or get wrong.
    proxy: { "/api": { target: "http://127.0.0.1:5000", changeOrigin: true } },
  },
  build: { outDir: "dist", sourcemap: false, chunkSizeWarningLimit: 1200 },
});
