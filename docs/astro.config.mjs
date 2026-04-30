import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightThemeRapide from "starlight-theme-rapide";

function lightOnlyDocsPlugin() {
  return {
    name: "opennav-light-only-docs",
    hooks: {
      "config:setup"({ config, updateConfig }) {
        updateConfig({
          components: {
            ...(config.components ?? {}),
            ThemeProvider: "./src/components/LightThemeProvider.astro",
            ThemeSelect: "./src/components/NoThemeSelect.astro",
          },
          customCss: [
            ...(config.customCss ?? []),
            "./src/styles/light-only.css",
          ],
        });
      },
    },
  };
}

export default defineConfig({
  site: "https://docs.opennav-ai.com",
  output: "static",
  integrations: [
    starlight({
      title: "OpenNav AI",
      description:
        "Open-source tooling for publishing static sites with agent-readable navigation files.",
      favicon: "/favicon.svg",
      logo: {
        src: "./src/assets/open-logo.svg",
        alt: "OpenNav AI",
      },
      plugins: [starlightThemeRapide(), lightOnlyDocsPlugin()],
      social: [],
      expressiveCode: {
        themes: ["light-plus"],
        useStarlightDarkModeSwitch: false,
        styleOverrides: {
          borderColor: "#d4d4d4",
          frames: {
            editorTabBarBorderBottomColor: "#d4d4d4",
          },
        },
      },
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Start Here",
          items: [
            { label: "Overview", link: "/" },
            { slug: "getting-started" },
          ],
        },
        {
          label: "Use OpenNav",
          items: [{ slug: "cli" }, { slug: "sdk" }],
        },
        {
          label: "Frameworks",
          items: [
            { slug: "frameworks/astro" },
            { slug: "frameworks/next" },
            {
              slug: "frameworks/server-side",
              label: "Server-side frameworks",
              badge: "Soon",
            },
          ],
        },
        {
          label: "Reference",
          items: [
            { slug: "reference/generated-files" },
            { slug: "reference/access-guidance" },
          ],
        },
        {
          label: "External",
          items: [
            {
              label: "AcceptMarkdown",
              link: "https://acceptmarkdown.com/",
              attrs: {
                rel: "noopener noreferrer",
                target: "_blank",
              },
            },
            {
              label: "Cloudflare Agent Readiness",
              link: "https://blog.cloudflare.com/agent-readiness/",
              attrs: {
                rel: "noopener noreferrer",
                target: "_blank",
              },
            },
            {
              label: "Is It Agent Ready?",
              link: "https://isitagentready.com/",
              attrs: {
                rel: "noopener noreferrer",
                target: "_blank",
              },
            },
          ],
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            content: "#1474f0",
          },
        },
        {
          tag: "script",
          attrs: {
            src: "/responsive-tables.js",
            type: "module",
          },
        },
        {
          tag: "script",
          attrs: {
            src: "/code-examples.js",
            type: "module",
          },
        },
      ],
    }),
  ],
});
