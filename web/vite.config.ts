import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": import.meta.dirname + "/src" },
  },
  build: {
    outDir: "dist/client",
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
      "/ws": {
        target: "http://localhost:8787",
        ws: true,
        configure: (proxy) => {
          proxy.on("error", () => {});
        },
      },
    },
  },
});
