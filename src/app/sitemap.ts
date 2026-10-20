import type { MetadataRoute } from "next";

import { editionIndex, listArticles, loadRelease } from "@/lib/lamble/service";
import { SITE_URL } from "@/lib/links";

/** Every public research page of the published release. Built from the same files the pages read. */
export default function sitemap(): MetadataRoute.Sitemap {
  const { data } = loadRelease();
  const cutoff = new Date(data.dataCutoff);
  const url = (p: string) => `${SITE_URL}${p}`;
  return [
    ...["/", "/coins", "/narratives", "/market", "/launchpads", "/research", "/methodology", "/sources", "/api"].map((p) => ({ url: url(p), lastModified: cutoff })),
    ...data.coins.map((c) => ({ url: url(`/coins/${c.chain}/${c.address}`), lastModified: cutoff })),
    ...data.narratives.map((n) => ({ url: url(`/narratives/${n.slug}`), lastModified: cutoff })),
    ...data.launchpads.map((l) => ({ url: url(`/launchpads/${l.slug}`), lastModified: cutoff })),
    ...editionIndex().map((e) => ({ url: url(`/market/${e.id}`), lastModified: new Date(e.revisions.at(-1)?.builtAt ?? e.interval.end) })),
    ...listArticles().map((a) => ({ url: url(`/research/${a.slug}`), lastModified: new Date(a.updatedAt) })),
  ];
}
