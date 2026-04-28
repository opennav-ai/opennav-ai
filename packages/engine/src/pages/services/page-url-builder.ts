import type { EngineFilePath } from "../../types/engine-file-path";
import type { PageUrlBuildInput } from "../types/page-url-build-input";
import type { PageUrlBuildResult } from "../types/page-url-build-result";

/**
 * Builds public route data for built HTML and Markdown page files.
 *
 * The engine starts with output-directory-relative files such as `index.html`
 * and `docs/getting-started/index.html`, but later OpenNav files need the
 * public page addresses that agents can open. This class keeps that file path
 * to URL policy in one place so HTML and Markdown readers can focus on page
 * content while later generators can reuse stable `route` and `canonicalUrl`
 * values for outputs such as `llms.txt`, Markdown artifacts, discovery tags,
 * and HTTP `Link` header guidance.
 */
export class PageUrlBuilder {
  /**
   * Converts an output-directory-relative page path into route and canonical URL data.
   *
   * @param input - Built page file path and public site base URL.
   * @returns Public route data for the page.
   */
  public build(input: PageUrlBuildInput): PageUrlBuildResult {
    const route = this.buildRoute(input.filePath);

    return {
      route,
      canonicalUrl: this.buildCanonicalUrl(input.baseUrl, route),
    };
  }

  private buildCanonicalUrl(baseUrl: string, route: string): string {
    const trimmedBaseUrl = baseUrl.replace(/\/+$/, "");

    if (route === "/") {
      return `${trimmedBaseUrl}/`;
    }

    return `${trimmedBaseUrl}${route}`;
  }

  private buildRoute(filePath: EngineFilePath): string {
    const normalizedFilePath = filePath.replaceAll("\\", "/");
    const routePath = this.removePageExtension(normalizedFilePath);

    if (routePath === "index") {
      return "/";
    }

    if (routePath.endsWith("/index")) {
      const directoryPath = routePath.slice(0, -"/index".length);

      return `/${directoryPath}/`;
    }

    return `/${routePath}`;
  }

  private removePageExtension(filePath: string): string {
    if (filePath.endsWith(".html")) {
      return filePath.slice(0, -".html".length);
    }

    if (filePath.endsWith(".md")) {
      return filePath.slice(0, -".md".length);
    }

    return filePath;
  }
}
