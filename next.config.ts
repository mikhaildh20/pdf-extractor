import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "tesseract.js"],
};

export default config;
