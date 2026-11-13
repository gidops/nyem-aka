import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { LogoMark } from "@/components/ui/logo";

const TIMELINE = [
  { text: "Work started", meta: "Chidi · 10:24", current: true },
  { text: "Assigned to Chidi Okeke", meta: "Admin · 09:45", current: false },
  { text: "Request submitted with 2 photos", meta: "Ada · 08:20", current: false },
];

// A miniature of the request screen, shown beside the landing headline so a visitor
// sees what the product looks like before signing up. It is built from the real
// badge components, so it cannot fall out of step with the app. Purely illustrative:
// hidden from screen readers, and only shown where there is room for it.
export function HeroPreview() {
  return (
    <div aria-hidden="true" className="w-[26rem] rounded-2xl border border-line-strong bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <LogoMark size={20} />
        <span className="text-sm font-semibold">Request NA-000042</span>
        <span className="ml-auto text-xs text-muted">Block C · Ground floor</span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <p className="font-display text-xl font-semibold">Leaking tap in the washroom</p>
          <div className="flex gap-2">
            <StatusBadge status="IN_PROGRESS" />
            <PriorityBadge priority="HIGH" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ["Pending", "4"],
            ["In progress", "7"],
            ["Completed", "31"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-canvas px-3 py-2">
              <p className="font-display text-2xl font-semibold">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>

        <ol className="flex flex-col">
          {TIMELINE.map((entry, index) => (
            <li key={entry.text} className="flex gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={
                    entry.current
                      ? "mt-1.5 size-2.5 rounded-full bg-accent"
                      : "mt-1.5 size-2.5 rounded-full border-2 border-line-strong bg-surface"
                  }
                />
                {index < TIMELINE.length - 1 && <span className="w-px flex-1 bg-line" />}
              </span>
              <span className="flex flex-col pb-3">
                <span className="text-sm font-medium">{entry.text}</span>
                <span className="text-xs text-muted">{entry.meta}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
