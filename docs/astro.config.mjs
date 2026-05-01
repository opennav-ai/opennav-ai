import starlight from "@astrojs/starlight";
import { OpenNavAstro } from "@opennav-ai/opennav/astro";
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
            Header: "./src/components/OpenNavHeader.astro",
            SiteTitle: "./src/components/OpenNavSiteTitle.astro",
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
        src: "../assets/full-open-logo.svg",
        alt: "OpenNav AI",
      },
      plugins: [starlightThemeRapide(), lightOnlyDocsPlugin()],
      social: [
        {
          icon: "x.com",
          label: "OpenNav AI on X",
          href: "https://x.com/OpenNavAI",
        },
        {
          icon: "x.com",
          label: "Joshua Bellew on X",
          href: "https://x.com/manofyear93",
        },
        {
          icon: "email",
          label: "Email Joshua Bellew",
          href: "mailto:joshua@opennav.ai",
        },
      ],
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
            { slug: "how-it-works" },
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
          label: "Platforms",
          items: [{ slug: "platforms/cloudflare" }],
        },
        {
          label: "Reference",
          items: [
            { slug: "reference/generated-files" },
            { slug: "reference/content-extraction" },
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
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.googleapis.com",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossorigin: "",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Inter:wght@600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap",
          },
        },
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
        {
          tag: "script",
          attrs: {
            src: "/copy-markdown.js",
            type: "module",
          },
        },
      ],
    }),
    OpenNavAstro({
      siteName: "OpenNav AI",
      mode: "static",
      accessGuidance: {
        contentSignals: {
          search: "allow",
          aiInput: "allow",
          aiTrain: "disallow",
        },
      },
    }),
  ],
});
