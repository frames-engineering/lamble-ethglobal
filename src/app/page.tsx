import { Hero } from "@/components/hero/hero";
import { LaunchpadsSection } from "@/components/launchpads/launchpads-section";
import { NarrativesSection } from "@/components/narratives/narratives-section";
import { aggregate } from "@/lib/data/aggregate";
import { getLaunchpads, getNarratives } from "@/lib/data/provider";

export default async function Page() {
  const [launchpads, narratives] = await Promise.all([getLaunchpads(), getNarratives()]);
  const stats = aggregate(launchpads);

  return (
    <>
      <Hero stats={stats} />
      <NarrativesSection narratives={narratives} launchpads={launchpads} />
      <LaunchpadsSection launchpads={launchpads} />
    </>
  );
}
