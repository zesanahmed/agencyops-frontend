import type { MetadataRoute } from "next";
import { env } from "@/config/env";

const PUBLIC_ROUTES = ["/", "/services", "/pricing", "/about", "/contact", "/login", "/register"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl.replace(/\/$/, "");
  return PUBLIC_ROUTES.map((path) => ({ url: `${base}${path === "/" ? "" : path}`, changeFrequency: "monthly", priority: path === "/" ? 1 : 0.6 }));
}
