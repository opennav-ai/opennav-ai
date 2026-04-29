import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenNavNext } from "@opennav-ai/opennav/next";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "export",
  turbopack: {
    root: fixtureDirectory,
  },
};

export default OpenNavNext({
  siteName: "OpenNav Next 16 Static Fixture",
  siteUrl: "https://next-16.example.com",
  mode: "static",
})(nextConfig);
