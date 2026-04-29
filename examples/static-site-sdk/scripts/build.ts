import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OpenNavStaticSite,
  type OpenNavStaticSiteOptions,
} from "@opennav-ai/opennav";

const exampleDirectory = dirname(dirname(fileURLToPath(import.meta.url)));

const options: OpenNavStaticSiteOptions = {
  siteName: "OpenNav Static SDK Example",
  siteUrl: "https://static-sdk.example.com",
  outputDirectory: join(exampleDirectory, "dist"),
};

const result = await new OpenNavStaticSite(options).build();

if (result.isErr()) {
  throw new Error(JSON.stringify(result.error, null, 2));
}

console.log(JSON.stringify(result.value, null, 2));
