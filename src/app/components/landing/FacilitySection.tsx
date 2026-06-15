import React, { useState } from 'react';
import { MapPin, Settings2, ShieldCheck, Wrench, ArrowRight } from 'lucide-react';

const tangerangMachines = [
  { no: 1, desc: "CNC Milling Hurco 2014", unit: 1, travel: "1300x520x510" },
  { no: 2, desc: "CNC Milling Twinhorn 2021", unit: 1, travel: "1060x520x510" },
  { no: 3, desc: "CNC Milling YCM 2022", unit: 1, travel: "1050x520x510" },
  { no: 4, desc: "CNC Milling Akira Seiki 2015", unit: 1, travel: "800x400x500" },
  { no: 5, desc: "CNC Lathe M/C MAZAK 8 inch 2016", unit: 3, travel: "D 180 x 250" },
  { no: 6, desc: "CNC LATHE M/C Goodway 8 inch 2016", unit: 1, travel: "D180x250" },
  { no: 7, desc: "CNC LATHE M/C Microcut 6 inch 2016", unit: 1, travel: "D150x500" },
  { no: 8, desc: "Lathe Machine", unit: 1, travel: "D 500x1000" },
  { no: 9, desc: "Surface Grinding PROTH 2012", unit: 1, travel: "800x400" },
  { no: 10, desc: "Milling Machine STD SM5", unit: 1, travel: "1100x350" },
  { no: 11, desc: "Milling Machine STD SM4", unit: 1, travel: "800x250" },
];

const surabayaMachines = [
  { no: 1, desc: "CNC Milling YCM 2015", unit: 3, travel: "800x400x510" },
  { no: 2, desc: "CNC Milling YCM 2015", unit: 1, travel: "1060x520x510" },
  { no: 3, desc: "CNC Milling VICTOR 2018", unit: 1, travel: "1050x520x510" },
  { no: 4, desc: "CNC Milling First 2017", unit: 1, travel: "800x400x500" },
  { no: 5, desc: "CNC Lathe M/C MAZAK 8 inch 2016", unit: 2, travel: "D 180 x 250" },
  { no: 6, desc: "CNC LATHE M/C Goodway 8 inch 2016", unit: 1, travel: "D180x250" },
  { no: 7, desc: "CNC LATHE M/C Goodway 10 inch 2016", unit: 1, travel: "D150x500" },
  { no: 8, desc: "HORIZONTAL MILLING", unit: 1, travel: "800x800" },
];

export function FacilitySection() {
  const [activeTab, setActiveTab] = useState<"tangerang" | "surabaya">("tangerang");

  const activeMachines = activeTab === "tangerang" ? tangerangMachines : surabayaMachines;

  return (
    <section id="facility" style={{ backgroundColor: "#FFFFFF" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h3 
            style={{ 
              color: "#C8102E", 
              fontFamily: "Inter, sans-serif", 
              fontSize: "14px", 
              fontWeight: 700, 
              letterSpacing: "0.05em", 
              marginBottom: "12px" 
            }}
          >
            Our Facilities & Capacities
          </h3>
          <h2 
            style={{ 
              color: "#111827", 
              fontFamily: "Inter, sans-serif", 
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)", 
              fontWeight: 800, 
              lineHeight: 1.2,
              maxWidth: "800px"
            }}
          >
            Expanding our reach to deliver excellence across regions.
          </h2>
        </div>

        {/* Organizational & Resources Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <MapPin className="text-[#C8102E]" size={24} />
            </div>
            <div style={{ color: "#111827", fontSize: "24px", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>2</div>
            <div style={{ color: "#475569", fontSize: "13px", fontWeight: 600, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Strategic Regions</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Settings2 className="text-[#C8102E]" size={24} />
            </div>
            <div style={{ color: "#111827", fontSize: "24px", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>19+</div>
            <div style={{ color: "#475569", fontSize: "13px", fontWeight: 600, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Advanced Machines</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Wrench className="text-[#C8102E]" size={24} />
            </div>
            <div style={{ color: "#111827", fontSize: "24px", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>10+</div>
            <div style={{ color: "#475569", fontSize: "13px", fontWeight: 600, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Engineering Team</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <ShieldCheck className="text-[#C8102E]" size={24} />
            </div>
            <div style={{ color: "#111827", fontSize: "24px", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>100%</div>
            <div style={{ color: "#475569", fontSize: "13px", fontWeight: 600, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quality Assurance</div>
          </div>
        </div>

        {/* Regional Tabs */}
        <div className="mb-8 border-b border-slate-200 flex gap-8">
          <button
            onClick={() => setActiveTab("tangerang")}
            className={`pb-4 text-lg font-bold transition-colors relative ${activeTab === "tangerang" ? "text-[#C8102E]" : "text-slate-400 hover:text-slate-600"}`}
          >
            Tangerang Facility
            {activeTab === "tangerang" && (
              <span className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#C8102E] rounded-t-md" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("surabaya")}
            className={`pb-4 text-lg font-bold transition-colors relative ${activeTab === "surabaya" ? "text-[#C8102E]" : "text-slate-400 hover:text-slate-600"}`}
          >
            Surabaya Facility
            {activeTab === "surabaya" && (
              <span className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#C8102E] rounded-t-md" />
            )}
          </button>
        </div>

        {/* Facility Content */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <MapPin className="text-[#C8102E]" size={20} />
            <h4 className="font-bold text-slate-800 text-lg">
              Machine List & Manufacturing Capacities - {activeTab === "tangerang" ? "Tangerang" : "Surabaya"}
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 font-bold w-16">No</th>
                  <th className="py-4 px-6 font-bold">Description</th>
                  <th className="py-4 px-6 font-bold w-24 text-center">Unit</th>
                  <th className="py-4 px-6 font-bold w-48 text-right">Travel Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeMachines.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-slate-500 font-medium">{m.no}</td>
                    <td className="py-4 px-6 text-slate-800 font-semibold">{m.desc}</td>
                    <td className="py-4 px-6 text-slate-600 text-center font-bold bg-slate-50/50">{m.unit}</td>
                    <td className="py-4 px-6 text-slate-500 text-right font-mono text-sm">{m.travel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Future Images Placeholder Notice */}
        <div className="mt-8 flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
          <ArrowRight className="mt-0.5 flex-shrink-0" size={18} />
          <p className="text-sm font-medium">
            Gallery and images for our {activeTab === "tangerang" ? "Tangerang" : "Surabaya"} facilities will be updated soon. Check back later to see our manufacturing floors in action.
          </p>
        </div>

      </div>
    </section>
  );
}
