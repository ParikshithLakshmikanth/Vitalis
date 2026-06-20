import { Bell, Search, UserCircle } from "lucide-react";

type NavbarProps = {
  patientName?: string;
};

export default function Navbar({
  patientName,
}: NavbarProps) {
  return (
    <header className="h-20 bg-white/10 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-8 text-white">

      {/* Left Section */}
      <div>
        <h1 className="text-3xl font-bold">
          My Health Dashboard
        </h1>

        <p className="text-sm text-purple-200">
          Clinical Handoff Intelligence System
        </p>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-5">

        {/* Search Box */}
        <div className="flex items-center bg-white/10 rounded-2xl px-4 py-2">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search records..."
            className="bg-transparent outline-none ml-2 text-white placeholder:text-purple-200"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-white/10 transition">
          <Bell size={22} />

          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
        </button>

        {/* Patient Profile */}
        <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl">

          <UserCircle size={38} />

          <div>
            <p className="font-semibold">
              Patient Portal
            </p>

            <p className="text-xs text-purple-200">
              {patientName || "Unknown"}
            </p>
          </div>

        </div>

      </div>

    </header>
  );
}