import type { Metadata } from "next";

import { PanelGate } from "@/components/mission/panel-gate";
import { PeoplePanel } from "@/components/mission/panels/people-panel";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <PanelGate
      href="/people"
      contents={[
        "Who is rostered, who turned up, and who stopped answering",
        "Pickers and riders with their throughput on the day",
        "Reassignment — moving someone off a task always costs something",
        "Break windows, and what happens when you push them",
      ]}
    >
      <PeoplePanel />
    </PanelGate>
  );
}
