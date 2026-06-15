import React from 'react';
import { MapPin } from 'lucide-react';

export function OrganizationSection() {
  return (
    <section id="organization" className="py-20 lg:py-28 bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
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
          >
            Human Resources Overview
          </h2>
        </div>

        {/* Main Dashboard Container */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 font-sans">
          
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-50 border-b border-slate-200">
            <div className="p-6 border-r border-b md:border-b-0 border-slate-200 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="text-4xl font-black text-[#C8102E] mb-1">42</div>
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Total Workforce</div>
            </div>
            <div className="p-6 border-r border-b md:border-b-0 border-slate-200 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="text-4xl font-black text-slate-800 mb-1">4</div>
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Management Staff</div>
            </div>
            <div className="p-6 border-r border-slate-200 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="text-4xl font-black text-slate-800 mb-1">8</div>
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Engineers</div>
            </div>
            <div className="p-6 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="text-4xl font-black text-slate-800 mb-1">30</div>
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Production Operators</div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-10">
            
            {/* MANAGEMENT SECTION */}
            <div>
              <div className="flex items-center gap-4 mb-5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest whitespace-nowrap bg-slate-100 px-3 py-1 rounded-md">Management</h3>
                <div className="h-px bg-slate-200 w-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Main Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C8102E]"></div>
                  <div className="text-4xl font-black text-[#C8102E] mb-1">4</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Management Staff</div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm text-slate-600 font-medium">
                      <span>Bachelor Degree</span>
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold text-xs border border-slate-200">2</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-600 font-medium">
                      <span>High School Diploma</span>
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold text-xs border border-slate-200">2</span>
                    </div>
                  </div>
                </div>

                {/* Info Card 1 */}
                <div className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-3">Office Location</div>
                  <div className="text-2xl font-black text-slate-800">Headquarters</div>
                </div>

                {/* Info Card 2 */}
                <div className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-3">Department Type</div>
                  <div className="text-lg font-bold text-slate-700">Management & Admin</div>
                </div>
              </div>
            </div>

            {/* ENGINEERING SECTION */}
            <div>
              <div className="flex items-center gap-4 mb-5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest whitespace-nowrap bg-slate-100 px-3 py-1 rounded-md">Engineering</h3>
                <div className="h-px bg-slate-200 w-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Main Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2563EB]"></div>
                  <div className="text-4xl font-black text-[#2563EB] mb-1">8</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Engineers</div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm text-slate-600 font-medium">
                      <span>Bachelor Degree</span>
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold text-xs border border-slate-200">2</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-600 font-medium">
                      <span>Associate Degree</span>
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold text-xs border border-slate-200">6</span>
                    </div>
                  </div>
                </div>

                {/* Info Card 1 */}
                <div className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-3">Core Expertise</div>
                  <div className="text-xl font-black text-slate-800">Precision Machining</div>
                </div>

                {/* Info Card 2 */}
                <div className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-3">Technical Role</div>
                  <div className="text-lg font-bold text-slate-700">Design & Execution</div>
                </div>
              </div>
            </div>

            {/* PRODUCTION OPERATIONS SECTION */}
            <div>
              <div className="flex items-center gap-4 mb-5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest whitespace-nowrap bg-slate-100 px-3 py-1 rounded-md">Production Operations</h3>
                <div className="h-px bg-slate-200 w-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                {/* Tangerang Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#16A34A]"></div>
                  <div>
                    <div className="text-4xl font-black text-[#16A34A] mb-1">12</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Production Operators</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                    <MapPin size={16} className="text-green-600" />
                    <span className="text-xs font-bold text-green-700">Tangerang</span>
                  </div>
                </div>

                {/* Surabaya Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#F59E0B]"></div>
                  <div>
                    <div className="text-4xl font-black text-[#F59E0B] mb-1">18</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Production Operators</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 bg-orange-50 px-3 py-2 rounded-lg border border-orange-100">
                    <MapPin size={16} className="text-orange-600" />
                    <span className="text-xs font-bold text-orange-700">Surabaya</span>
                  </div>
                </div>
              </div>

              {/* Location Distribution Bar */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-3 flex justify-between">
                  <span>Location Distribution</span>
                  <span>Total: 30 Operators</span>
                </div>
                <div className="h-8 w-full flex rounded-lg overflow-hidden shadow-inner">
                  <div className="bg-[#16A34A] flex items-center justify-center text-xs text-white font-bold transition-all hover:brightness-110 cursor-help" title="Tangerang: 12 Operators" style={{ width: '40%' }}>
                    40%
                  </div>
                  <div className="bg-[#F59E0B] flex items-center justify-center text-xs text-white font-bold transition-all hover:brightness-110 cursor-help" title="Surabaya: 18 Operators" style={{ width: '60%' }}>
                    60%
                  </div>
                </div>
                <div className="flex justify-between mt-3 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#16A34A]"></div> Tangerang (12)</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div> Surabaya (18)</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
