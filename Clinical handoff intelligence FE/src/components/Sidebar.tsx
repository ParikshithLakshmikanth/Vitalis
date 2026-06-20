import { NavLink } from "react-router-dom";
import {
  User,
  FileText,
  Share2,
  ShieldAlert,
  Settings,
  HeartPulse,
  ClipboardList,
} from "lucide-react";

const navItems = [
  { to: "/", icon: User, label: "My Health Profile" },
  { to: "/medical-records", icon: FileText, label: "Medical Records" },
  { to: "/share-handoff", icon: Share2, label: "Share Handoff" },
  { to: "/emergency", icon: ShieldAlert, label: "Emergency Access" },
  { to: "/audit-log", icon: ClipboardList, label: "Audit Log" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-72 min-h-screen bg-black/30 backdrop-blur-xl border-r border-white/10 text-white flex flex-col">

      {/* Logo Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-violet-600 p-3 rounded-2xl">
            <HeartPulse size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">CHI</h1>
            <p className="text-sm text-purple-200">Patient Health Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl transition cursor-pointer ${
                    isActive
                      ? "bg-violet-600 shadow-lg shadow-violet-900/40"
                      : "hover:bg-white/10"
                  }`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-sm text-purple-200">Patient-Controlled Data Sharing</p>
          <p className="text-xs text-slate-400 mt-2">
            Your medical information is shared only with your consent.
          </p>
        </div>
      </div>

    </aside>
  );
}