import { OpenNavNext } from "@opennav-ai/opennav/next";

const nextConfig = {
  output: "export",
};

export default OpenNavNext({
  siteName: "OpenNav Next 14 Static Fixture",
  siteUrl: "https://next-14.example.com",
  mode: "static",
})(nextConfig);
