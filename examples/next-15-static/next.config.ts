import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenNavNext } from "@opennav-ai/opennav/next";
import type { NextConfig } from "next";

const exampleDirectory = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "export",
  outputFileTracingRoot: exampleDirectory,
} satisfies NextConfig;

export default OpenNavNext({
  siteName: "OpenNav Next 15 Static Fixture",
  siteUrl: "https://next-15.example.com",
  mode: "static",
})(nextConfig);
