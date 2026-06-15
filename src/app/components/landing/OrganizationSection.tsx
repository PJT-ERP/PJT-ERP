import React from 'react';
import { Users, Briefcase, Wrench, GraduationCap, MapPin } from 'lucide-react';

const orgData = [
  {
    title: "Management Staff",
    total: 4,
    icon: Briefcase,
    color: "#C8102E",
    bg: "bg-red-50",
    details: [
      { label: "Bachelor Degree", count: 2, icon: GraduationCap },
      { label: "High School Diplomas", count: 2, icon: GraduationCap },
    ],
  },
  {
    title: "Engineers",
    total: 8,
    icon: Wrench,
    color: "#2563EB",
    bg: "bg-blue-50",
    details: [
      { label: "Bachelor Degree", count: 2, icon: GraduationCap },
      { label: "Associate Degree", count: 6, icon: GraduationCap },
    ],
  },
  {
    title: "Production Operators",
    total: 30,
    icon: Users,
    color: "#16A34A",
    bg: "bg-green-50",
    details: [
      { label: "Tangerang Facility", count: 12, icon: MapPin },
      { label: "Surabaya Facility", count: 18, icon: MapPin },
    ],
  },
];

export function OrganizationSection() {
  return (
    <section id="organization" style={{ backgroundColor: "#FFFFFF" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
            <span
              style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              OUR TEAM
            </span>
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
          </div>
          <h2
            style={{
              color: "#111827",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
            className="mb-5"
          >
            Organizational Structure
          </h2>
          <p
            style={{
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
              fontSize: "16px",
              lineHeight: 1.75,
            }}
          >
            Our company is driven by a total of <strong>42 dedicated professionals</strong> across management, engineering, and production divisions. Each individual plays a vital role in ensuring high-quality manufacturing standards.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {orgData.map((dept, idx) => {
            const Icon = dept.icon;
            return (
              <div 
                key={idx} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Card Header */}
                <div className={`p-6 ${dept.bg} border-b border-slate-100 flex items-center justify-between`}>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm"
                      style={{ color: dept.color }}
                    >
                      <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{dept.title}</h3>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Department</p>
                    </div>
                  </div>
                </div>

                {/* Main Stat */}
                <div className="p-6 border-b border-slate-100 flex items-end gap-2">
                  <span className="text-5xl font-black" style={{ color: dept.color, fontFamily: "Inter, sans-serif", lineHeight: 0.8 }}>
                    {dept.total}
                  </span>
                  <span className="text-slate-500 font-medium pb-1">Personnel</span>
                </div>

                {/* Details List */}
                <div className="p-6 bg-slate-50/50">
                  <ul className="space-y-4">
                    {dept.details.map((detail, dIdx) => {
                      const DetailIcon = detail.icon;
                      return (
                        <li key={dIdx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-slate-600">
                            <DetailIcon size={16} className="text-slate-400" />
                            <span className="text-sm font-medium">{detail.label}</span>
                          </div>
                          <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-sm shadow-sm">
                            {detail.count}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
