import React from 'react';
import { MapPin, Briefcase, Wrench, Settings } from 'lucide-react';

export function OrganizationSection() {
  return (
    <section id="organization" className="py-16 lg:py-24 bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-5 rounded-full" />
            <span
              style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              OUR TEAM
            </span>
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-5 rounded-full" />
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
            <div className="p-4 sm:p-6 border-r border-b md:border-b-0 border-slate-200 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="text-3xl sm:text-4xl font-black text-[#C8102E] mb-1">42</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Total Workforce</div>
            </div>
            <div className="p-4 sm:p-6 border-r border-b md:border-b-0 border-slate-200 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="text-3xl sm:text-4xl font-black text-slate-800 mb-1">4</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Management Staff</div>
            </div>
            <div className="p-4 sm:p-6 border-r border-slate-200 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="text-3xl sm:text-4xl font-black text-slate-800 mb-1">8</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Engineers</div>
            </div>
            <div className="p-4 sm:p-6 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="text-3xl sm:text-4xl font-black text-slate-800 mb-1">30</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Production Operators</div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-10">
            
            {/* 2-Column Layout for Management & Engineering */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* MANAGEMENT SECTION */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest whitespace-nowrap bg-slate-100 px-3 py-1.5 rounded-md">Management</h3>
                  <div className="h-px bg-slate-200 w-full"></div>
                </div>
                
                <div className="flex flex-col gap-4">
                  {/* Main Card (Horizontal Layout) */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C8102E]"></div>
                    <div>
                      <div className="text-4xl font-black text-[#C8102E] mb-1">4</div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Management Staff</div>
                    </div>
                    
                    <div className="space-y-3 w-full sm:w-1/2">
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

                  {/* Info Cards (2 Cols) */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Info Card 1 */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-100 flex items-center justify-center text-[#C8102E] mb-3 sm:mb-4 shrink-0">
                        <MapPin size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="text-[9px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 line-clamp-1">Office Location</div>
                        <div className="text-sm sm:text-xl font-black text-slate-800 break-words">Headquarters</div>
                      </div>
                    </div>

                    {/* Info Card 2 */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-100 flex items-center justify-center text-[#C8102E] mb-3 sm:mb-4 shrink-0">
                        <Briefcase size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="text-[9px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 line-clamp-1">Department Type</div>
                        <div className="text-sm sm:text-lg font-bold text-slate-700 break-words">Management & Admin</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ENGINEERING SECTION */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest whitespace-nowrap bg-slate-100 px-3 py-1.5 rounded-md">Engineering</h3>
                  <div className="h-px bg-slate-200 w-full"></div>
                </div>
                
                <div className="flex flex-col gap-4">
                  {/* Main Card (Horizontal Layout) */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C8102E]"></div>
                    <div>
                      <div className="text-4xl font-black text-[#C8102E] mb-1">8</div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Engineers</div>
                    </div>
                    
                    <div className="space-y-3 w-full sm:w-1/2">
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

                  {/* Info Cards (2 Cols) */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Info Card 1 */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-100 flex items-center justify-center text-[#C8102E] mb-3 sm:mb-4 shrink-0">
                        <Wrench size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="text-[9px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 line-clamp-1">Core Expertise</div>
                        <div className="text-sm sm:text-xl font-black text-slate-800 break-words">Precision Machining</div>
                      </div>
                    </div>

                    {/* Info Card 2 */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-100 flex items-center justify-center text-[#C8102E] mb-3 sm:mb-4 shrink-0">
                        <Settings size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="text-[9px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 line-clamp-1">Technical Role</div>
                        <div className="text-sm sm:text-lg font-bold text-slate-700 break-words">Design & Execution</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* PRODUCTION OPERATIONS SECTION */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest whitespace-nowrap bg-slate-100 px-3 py-1.5 rounded-md">Production Operations</h3>
                <div className="h-px bg-slate-200 w-full"></div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Tangerang Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-2">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C8102E]"></div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-black text-[#C8102E] mb-1">12</div>
                    <div className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Production Operators</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 bg-red-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-red-100 shrink-0">
                    <MapPin size={14} className="sm:w-4 sm:h-4 text-[#C8102E]" />
                    <span className="text-[9px] sm:text-[11px] font-bold text-[#C8102E] uppercase tracking-wider">Tangerang</span>
                  </div>
                </div>

                {/* Surabaya Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-2">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1F1F1F]"></div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-black text-[#1F1F1F] mb-1">18</div>
                    <div className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Production Operators</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 bg-slate-100 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-200 shrink-0">
                    <MapPin size={14} className="sm:w-4 sm:h-4 text-[#1F1F1F]" />
                    <span className="text-[9px] sm:text-[11px] font-bold text-[#1F1F1F] uppercase tracking-wider">Surabaya</span>
                  </div>
                </div>

                {/* Location Distribution Bar */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col justify-center">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-3 flex justify-between">
                    <span>Location Distribution</span>
                    <span>Total: 30 Operators</span>
                  </div>
                  <div className="h-8 w-full flex rounded-lg overflow-hidden shadow-inner mb-3">
                    <div className="bg-[#C8102E] flex items-center justify-center text-xs text-white font-bold transition-all hover:brightness-110 cursor-help" title="Tangerang: 12 Operators" style={{ width: '40%' }}>
                      40%
                    </div>
                    <div className="bg-[#1F1F1F] flex items-center justify-center text-xs text-white font-bold transition-all hover:brightness-110 cursor-help" title="Surabaya: 18 Operators" style={{ width: '60%' }}>
                      60%
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#C8102E]"></div> Tangerang (12)</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#1F1F1F]"></div> Surabaya (18)</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
