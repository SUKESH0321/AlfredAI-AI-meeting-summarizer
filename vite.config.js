import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "client",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/home/ubuntu/notebook-ai/client/src",
    },
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
});
