import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-8">
          <div className="bg-slate-800 rounded-3xl shadow-xl p-8 text-white text-center">
            <Settings className="mx-auto text-violet-400 mb-4" size={48} />
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-slate-400">
              Account preferences and security settings will be available here.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
