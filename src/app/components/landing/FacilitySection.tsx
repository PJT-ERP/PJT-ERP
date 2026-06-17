import React, { useState } from 'react';
import { MapPin, Settings2, ShieldCheck, Wrench, ImageIcon, Box } from 'lucide-react';

const tangerangMachines = [
  { no: 1, desc: "CNC Milling Hurco 2014", unit: 1, img: null },
  { no: 2, desc: "CNC Milling Twinhorn 2021", unit: 1, img: null },
  { no: 3, desc: "CNC Milling YCM 2022", unit: 1, img: "/CNC MILLING YCM E5.png" },
  { no: 4, desc: "CNC Milling Akira Seiki 2015", unit: 1, img: null },
  { no: 5, desc: "CNC Lathe M/C MAZAK 8 inch 2016", unit: 3, img: "/CNC Turning.png" },
  { no: 6, desc: "CNC LATHE M/C Goodway 8 inch 2016", unit: 1, img: "/CNC Turning.png" },
  { no: 7, desc: "CNC LATHE M/C Microcut 6 inch 2016", unit: 1, img: "/CNC Turning.png" },
  { no: 8, desc: "Lathe Machine", unit: 1, img: "/BUBUT MANUAL.webp" },
  { no: 9, desc: "Surface Grinding PROTH 2012", unit: 1, img: "/SURFACE GRINDING.png" },
  { no: 10, desc: "Milling Machine STD SM5", unit: 1, img: "/MILLING MANUAL.jpeg" },
  { no: 11, desc: "Milling Machine STD SM4", unit: 1, img: "/MILLING MANUAL.jpeg" },
];

const surabayaMachines = [
  { no: 1, desc: "CNC Milling YCM 2015", unit: 3, img: "/CNC MILLING YCM E5.png" },
  { no: 2, desc: "CNC Milling YCM 2015", unit: 1, img: "/CNC MILLING YCM E5.png" },
  { no: 3, desc: "CNC Milling VICTOR 2018", unit: 1, img: null },
  { no: 4, desc: "CNC Milling First 2017", unit: 1, img: null },
  { no: 5, desc: "CNC Lathe M/C MAZAK 8 inch 2016", unit: 2, img: "/CNC Turning.png" },
  { no: 6, desc: "CNC LATHE M/C Goodway 8 inch 2016", unit: 1, img: "/CNC Turning.png" },
  { no: 7, desc: "CNC LATHE M/C Goodway 10 inch 2016", unit: 1, img: "/CNC Turning.png" },
  { no: 8, desc: "HORIZONTAL MILLING", unit: 1, img: null },
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12 max-w-4xl">
          <div className="bg-slate-50 py-4 px-3 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1 flex flex-col items-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <MapPin className="text-[#C8102E]" size={18} />
            </div>
            <div style={{ color: "#111827", fontSize: "20px", fontWeight: 800, fontFamily: "Inter, sans-serif", lineHeight: 1.2 }}>2</div>
            <div style={{ color: "#475569", fontSize: "11px", fontWeight: 700, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Strategic Regions</div>
          </div>
          <div className="bg-slate-50 py-4 px-3 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1 flex flex-col items-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <Settings2 className="text-[#C8102E]" size={18} />
            </div>
            <div style={{ color: "#111827", fontSize: "20px", fontWeight: 800, fontFamily: "Inter, sans-serif", lineHeight: 1.2 }}>19+</div>
            <div style={{ color: "#475569", fontSize: "11px", fontWeight: 700, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Advanced Machines</div>
          </div>
          <div className="bg-slate-50 py-4 px-3 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1 flex flex-col items-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <Wrench className="text-[#C8102E]" size={18} />
            </div>
            <div style={{ color: "#111827", fontSize: "20px", fontWeight: 800, fontFamily: "Inter, sans-serif", lineHeight: 1.2 }}>10+</div>
            <div style={{ color: "#475569", fontSize: "11px", fontWeight: 700, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Engineering Team</div>
          </div>
          <div className="bg-slate-50 py-4 px-3 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1 flex flex-col items-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <ShieldCheck className="text-[#C8102E]" size={18} />
            </div>
            <div style={{ color: "#111827", fontSize: "20px", fontWeight: 800, fontFamily: "Inter, sans-serif", lineHeight: 1.2 }}>100%</div>
            <div style={{ color: "#475569", fontSize: "11px", fontWeight: 700, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quality Assurance</div>
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

        {/* Machine Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeMachines.map((m, idx) => (
            <div 
              key={idx} 
              className="flex flex-col bg-white overflow-hidden p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
            >
              {/* Image / Placeholder */}
              <div className="w-full aspect-[4/3] mb-5 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-slate-100 transition-colors overflow-hidden">
                {m.img ? (
                  <img src={m.img} alt={m.desc} className="w-full h-full object-contain mix-blend-multiply" />
                ) : (
                  <>
                    <ImageIcon className="text-slate-300 mb-2" size={48} />
                    <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Image Coming Soon</span>
                  </>
                )}
              </div>
              
              {/* Machine Details */}
              <div className="flex-1 flex flex-col">
                <h3 
                  style={{ 
                    color: "#111827", 
                    fontFamily: "Inter, sans-serif", 
                    fontSize: "16px", 
                    fontWeight: 700, 
                    marginBottom: "16px",
                    lineHeight: 1.4
                  }}
                >
                  {m.desc}
                </h3>
                
                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-3">
                    <div className="flex items-center text-slate-500">
                      <Box size={16} className="mr-2 opacity-70" />
                      <span>Total Units</span>
                    </div>
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{m.unit}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
