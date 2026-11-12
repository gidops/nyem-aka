"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Tabs } from "./ui/tabs";

const ROLES = {
  requester: {
    label: "Students & staff",
    heading: "Report it in a minute, then stop chasing",
    points: [
      "Describe the fault, pick a category and attach photos from your phone.",
      "See exactly where your request is: pending, assigned, in progress or completed.",
      "Read every update and who made it, in one timeline.",
    ],
  },
  officer: {
    label: "Maintenance officers",
    heading: "A clear queue of the work that is yours",
    points: [
      "See only the requests assigned to you, with location, photos and priority.",
      "Mark work as started and completed, with a note on what was done.",
      "Attach a photo of the repair as evidence.",
    ],
  },
  admin: {
    label: "Administrators",
    heading: "Oversight without spreadsheets",
    points: [
      "Assign and reassign requests, and reject those that are not maintenance faults.",
      "Search and filter everything; export any view to CSV.",
      "Manage users and categories, and review the audit trail of who did what.",
    ],
  },
} as const;

type RoleKey = keyof typeof ROLES;

// The tabbed section on the landing page: what the system does for each kind of user.
export function RoleTabs() {
  const [role, setRole] = useState<RoleKey>("requester");
  const content = ROLES[role];
  return (
    <div className="flex flex-col gap-6">
      <Tabs
        label="Who it is for"
        value={role}
        onChange={setRole}
        tabs={(Object.keys(ROLES) as RoleKey[]).map((key) => ({ value: key, label: ROLES[key].label }))}
      />
      <Card className="flex flex-col gap-4">
        <h3 className="font-display text-2xl font-semibold">{content.heading}</h3>
        <ul className="flex flex-col gap-3">
          {content.points.map((point) => (
            <li key={point} className="flex gap-3">
              <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-accent" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
