import os

path = 'src/app/components/data/mockData.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# I need to add the new statuses into the map.
#    'waiting_dp'
#    'pending_assignment'
#    'material_preparation'
#    'in_production'
#    'qc_check'

new_map_str = """  const map: Record<SOStatus, { bg: string; text: string; border: string }> = {
    'Pending Design':       { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300' },
    'Waiting Approval':     { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'Revision Required':    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' },
    'Ready for Production': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'In Production':        { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'QC':                   { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-300' },
    'Completed':            { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300' },
    'Rejected':             { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300' },
    'waiting_dp':           { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    'pending_assignment':   { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'material_preparation': { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-300' },
    'in_production':        { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'qc_check':             { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-300' },
  };"""

old_map_str = """  const map: Record<SOStatus, { bg: string; text: string; border: string }> = {
    'Pending Design':       { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300' },
    'Waiting Approval':     { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'Revision Required':    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' },
    'Ready for Production': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'In Production':        { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'QC':                   { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-300' },
    'Completed':            { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300' },
    'Rejected':             { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300' },
  };"""

if old_map_str in content:
    content = content.replace(old_map_str, new_map_str)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Failed to find old map string")
