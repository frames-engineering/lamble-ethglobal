import { LaunchpadsTable } from "@/components/launchpads/launchpads-table";
import { Section } from "@/components/layout/section";
import type { Launchpad } from "@/lib/data/types";

export function LaunchpadsSection({ launchpads }: { launchpads: Launchpad[] }) {
  return (
    <Section id="launchpads" title="Launchpads" bleed>
      <div className="mx-auto max-w-7xl xs:px-4 md:px-8">
        <LaunchpadsTable launchpads={launchpads} />
      </div>
    </Section>
  );
}
