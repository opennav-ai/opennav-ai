import { OpenNavAstro } from "@opennav-ai/opennav/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://astro-5.example.com",
  output: "static",
  integrations: [
    OpenNavAstro({
      siteName: "OpenNav Astro 5 Static Fixture",
      mode: "static",
    }),
  ],
});
