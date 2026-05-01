import { OpenNavAstro } from "@opennav-ai/opennav/astro";
import { defineConfig } from "astro/config";

const openNavIntegration = OpenNavAstro({
  siteName: "OpenNav Astro 6 Static Fixture",
  mode: "static",
});

export default defineConfig({
  site: "https://astro-6.example.com",
  output: "static",
  integrations: [openNavIntegration],
});
