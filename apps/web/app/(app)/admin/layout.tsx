import { RoleGate } from "@/components/app-shell";

// One gate for every page under /admin.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow={["ADMIN"]}>{children}</RoleGate>;
}
