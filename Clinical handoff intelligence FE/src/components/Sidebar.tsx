import {
  User,
  FileText,
  Share2,
  ShieldAlert,
  Settings,
  HeartPulse,
} from "lucide-react";

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
            <h1 className="text-2xl font-bold">
              CHI
            </h1>

            <p className="text-sm text-purple-200">
              Patient Health Portal
            </p>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">

        <ul className="space-y-3">

          <li className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-violet-600 shadow-lg cursor-pointer">
            <User size={20} />
            <span>My Health Profile</span>
          </li>

          <li className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition cursor-pointer">
            <FileText size={20} />
            <span>Medical Records</span>
          </li>

          <li className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition cursor-pointer">
            <Share2 size={20} />
            <span>Share Handoff</span>
          </li>

          <li className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition cursor-pointer">
            <ShieldAlert size={20} />
            <span>Emergency Access</span>
          </li>

          <li className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition cursor-pointer">
            <Settings size={20} />
            <span>Settings</span>
          </li>

        </ul>

      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">

        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-sm text-purple-200">
            Patient-Controlled Data Sharing
          </p>

          <p className="text-xs text-slate-400 mt-2">
            Your medical information is shared only with your consent.
          </p>
        </div>

      </div>

    </aside>
  );
}