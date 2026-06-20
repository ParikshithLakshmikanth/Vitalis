import { useState } from "react";
import { generateHandoff } from "../services/api";
import type { Handoff } from "../types/handoff";

type PatientFormProps = {
  setHandoff: React.Dispatch<React.SetStateAction<Handoff | null>>;
};

export default function PatientForm({
  setHandoff,
}: PatientFormProps) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    patientName: "",
    age: "",
    bloodGroup: "",
    allergies: "",
    medications: "",
    chronicConditions: "",
    emergencyContact: "",
    healthNotes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const data = {
        ...form,

        allergies: form.allergies
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),

        medications: form.medications
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),

        chronicConditions: form.chronicConditions
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const response = await generateHandoff(data);

      setHandoff(response);
    } catch (error) {
      console.error(error);
      alert("Failed to generate AI Health Summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-3xl shadow-xl text-white">

      <h2 className="text-2xl font-bold mb-2">
        👤 My Health Profile
      </h2>

      <p className="text-slate-400 mb-6">
        Maintain your health information and generate a secure
        AI-powered clinical handoff that can be shared with
        healthcare providers only with your permission.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <input
          required
          type="text"
          name="patientName"
          placeholder="Full Name"
          value={form.patientName}
          onChange={handleChange}
          className="w-full p-3 rounded-xl bg-slate-700 outline-none"
        />

        <input
          required
          type="number"
          name="age"
          placeholder="Age"
          value={form.age}
          onChange={handleChange}
          className="w-full p-3 rounded-xl bg-slate-700 outline-none"
        />

        <input
          type="text"
          name="bloodGroup"
          placeholder="Blood Group"
          value={form.bloodGroup}
          onChange={handleChange}
          className="w-full p-3 rounded-xl bg-slate-700 outline-none"
        />

        <input
          type="text"
          name="emergencyContact"
          placeholder="Emergency Contact"
          value={form.emergencyContact}
          onChange={handleChange}
          className="w-full p-3 rounded-xl bg-slate-700 outline-none"
        />

        <input
          type="text"
          name="allergies"
          placeholder="Allergies (comma separated)"
          value={form.allergies}
          onChange={handleChange}
          className="w-full p-3 rounded-xl bg-slate-700 outline-none"
        />

        <input
          type="text"
          name="medications"
          placeholder="Current Medications"
          value={form.medications}
          onChange={handleChange}
          className="w-full p-3 rounded-xl bg-slate-700 outline-none"
        />

        <input
          type="text"
          name="chronicConditions"
          placeholder="Chronic Conditions"
          value={form.chronicConditions}
          onChange={handleChange}
          className="md:col-span-2 w-full p-3 rounded-xl bg-slate-700 outline-none"
        />

        <textarea
          name="healthNotes"
          placeholder="Additional Health Notes"
          value={form.healthNotes}
          onChange={handleChange}
          className="md:col-span-2 w-full p-3 rounded-xl bg-slate-700 h-32 outline-none resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="
            md:col-span-2
            w-full
            bg-violet-600
            hover:bg-violet-700
            p-3
            rounded-xl
            font-semibold
            transition
            disabled:bg-gray-500
          "
        >
          {loading
            ? "Generating AI Health Summary..."
            : "Generate AI Health Summary"}
        </button>

      </div>

    </div>
  );
}