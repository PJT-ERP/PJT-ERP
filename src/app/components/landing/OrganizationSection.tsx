import React from 'react';
import { MapPin } from 'lucide-react';

export function OrganizationSection() {
  return (
    <section id="organization" className="py-16 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Dashboard Container */}
        <div className="bg-[#1E1E1E] rounded-xl overflow-hidden shadow-2xl font-sans text-white border border-[#2A2A2A]">
          
          {/* Top Header */}
          <div className="bg-[#C8102E] px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-bold text-lg tracking-widest uppercase flex items-center gap-2">
              HUMAN RESOURCES <span className="text-red-200">—</span> COMPANY OVERVIEW
            </h2>
            <div className="bg-white/20 px-3 py-1 rounded text-xs font-bold tracking-wider">
              PJT
            </div>
          </div>

          {/* Top Stats Row */}
          <div className="grid grid-cols-4 border-b border-[#333333]">
            <div className="p-6 border-r border-[#333333]">
              <div className="text-4xl font-bold text-[#C8102E] mb-1">42</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Workforce</div>
            </div>
            <div className="p-6 border-r border-[#333333]">
              <div className="text-4xl font-bold text-[#C8102E] mb-1">4</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Management Staff</div>
            </div>
            <div className="p-6 border-r border-[#333333]">
              <div className="text-4xl font-bold text-[#C8102E] mb-1">8</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Engineers</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-[#C8102E] mb-1">30</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Production Operators</div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            
            {/* MANAGEMENT SECTION */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest whitespace-nowrap">Management</h3>
                <div className="h-px bg-[#333333] w-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Card */}
                <div className="bg-[#262626] rounded-lg border border-[#333333] p-5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C8102E]"></div>
                  <div className="text-3xl font-bold text-[#C8102E] mb-1">4</div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-6">Management Staff</div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Bachelor Degree</span>
                      <span className="bg-[#1A1A1A] w-6 h-6 rounded-full flex items-center justify-center border border-[#333333] font-bold text-white">2</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>High School Diploma</span>
                      <span className="bg-[#1A1A1A] w-6 h-6 rounded-full flex items-center justify-center border border-[#333333] font-bold text-white">2</span>
                    </div>
                  </div>
                </div>

                {/* Info Card 1 */}
                <div className="border border-dashed border-[#444444] rounded-lg p-5 flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Office Location</div>
                  <div className="text-xl font-bold">HQ</div>
                </div>

                {/* Info Card 2 */}
                <div className="border border-dashed border-[#444444] rounded-lg p-5 flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Type</div>
                  <div className="text-lg font-bold">Management Staff</div>
                </div>
              </div>
            </div>

            {/* ENGINEERING SECTION */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest whitespace-nowrap">Engineering</h3>
                <div className="h-px bg-[#333333] w-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Card */}
                <div className="bg-[#262626] rounded-lg border border-[#333333] p-5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2563EB]"></div>
                  <div className="text-3xl font-bold text-[#2563EB] mb-1">8</div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-6">Engineers</div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Bachelor Degree</span>
                      <span className="bg-[#1A1A1A] w-6 h-6 rounded-full flex items-center justify-center border border-[#333333] font-bold text-white">2</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Associate Degree</span>
                      <span className="bg-[#1A1A1A] w-6 h-6 rounded-full flex items-center justify-center border border-[#333333] font-bold text-white">6</span>
                    </div>
                  </div>
                </div>

                {/* Education Breakdown Bar Chart */}
                <div className="bg-[#262626] rounded-lg border border-[#333333] p-5 relative overflow-hidden flex flex-col">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-auto">Education Breakdown</div>
                  <div className="flex items-end gap-6 mt-8 h-20">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 bg-[#2563EB] rounded-t-sm" style={{ height: '25%' }}></div>
                      <div className="text-xs text-gray-400">S1</div>
                      <div className="text-sm font-bold text-[#2563EB]">2</div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 bg-[#2563EB] rounded-t-sm" style={{ height: '75%' }}></div>
                      <div className="text-xs text-gray-400">D3</div>
                      <div className="text-sm font-bold text-[#2563EB]">6</div>
                    </div>
                  </div>
                </div>

                {/* Ratio Card */}
                <div className="border border-dashed border-[#444444] rounded-lg p-5 flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Ratio S1:D3</div>
                  <div className="text-2xl font-bold text-[#2563EB]">1:3</div>
                </div>
              </div>
            </div>

            {/* PRODUCTION OPERATIONS SECTION */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest whitespace-nowrap">Production Operations</h3>
                <div className="h-px bg-[#333333] w-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Tangerang Card */}
                <div className="bg-[#262626] rounded-lg border border-[#333333] p-5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#16A34A]"></div>
                  <div className="text-3xl font-bold text-[#16A34A] mb-1">12</div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2">Production Operators</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={12} /> Tangerang
                  </div>
                </div>

                {/* Surabaya Card */}
                <div className="bg-[#262626] rounded-lg border border-[#333333] p-5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F59E0B]"></div>
                  <div className="text-3xl font-bold text-[#F59E0B] mb-1">18</div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2">Production Operators</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={12} /> Surabaya
                  </div>
                </div>
              </div>

              {/* Location Distribution Bar */}
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Location Distribution</div>
                <div className="h-6 w-full flex rounded overflow-hidden">
                  <div className="bg-[#16A34A] flex items-center justify-center text-[10px] font-bold" style={{ width: '40%' }}>
                    TNG 12
                  </div>
                  <div className="bg-[#F59E0B] flex items-center justify-center text-[10px] font-bold" style={{ width: '60%' }}>
                    SBY 18
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                  <span>40% Tangerang</span>
                  <span>60% Surabaya</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
