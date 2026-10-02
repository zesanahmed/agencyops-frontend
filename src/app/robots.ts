import type { MetadataRoute } from "next";
import { env } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/organizations", "/profile", "/invite/", "/client", "/payment/", "/api/"] }],
    sitemap: `${env.siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
