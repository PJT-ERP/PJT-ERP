import os
import re

old_path = 'c:/Users/stephanie/PJT Revisi/src/app/pages/DashboardPage.tsx'
new_path = 'c:/Users/stephanie/PJT Revisi 1/src/app/pages/DashboardPage.tsx'

with open(old_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Colors
content = content.replace('#06B6D4', '#C8102E')
content = content.replace('text-blue-600', 'text-red-600')
content = content.replace('bg-blue-50', 'bg-red-50')
content = content.replace('border-blue-200', 'border-red-200')
content = content.replace('text-blue-500', 'text-red-500')
content = content.replace('bg-cyan-50', 'bg-red-50')

# 2. Imports
content = content.replace('import { SOStatus, calcProductionDuration } from', 'import { SOStatus, calcProductionDuration, formatSOStatus } from')

# 3. Status Arrays
old_status_order = """const STATUS_ORDER: SOStatus[] = [
  'Pending Design', 'Waiting Approval',
  'Ready for Production', 'In Production', 'QC', 'Completed', 'Rejected',
];"""

new_status_order = """const STATUS_ORDER: SOStatus[] = [
  'design_pending', 'design_review', 'client_design_approval',
  'waiting_dp', 'pending_assignment', 'material_preparation',
  'in_production', 'qc_check', 'completed'
];"""
content = content.replace(old_status_order, new_status_order)

old_status_colors = """const STATUS_COLORS: Record<string, string> = {
  'Pending Design': '#94A3B8',
  'Waiting Approval': '#FCD34D',
  'Ready for Production': '#A78BFA',
  'In Production': '#FB923C',
  'QC': '#22D3EE',
  'Completed': '#34D399',
  'Rejected': '#F87171',
};"""

new_status_colors = """const STATUS_COLORS: Record<string, string> = {
  'design_pending': '#94A3B8',
  'design_review': '#FCD34D',
  'client_design_approval': '#A78BFA',
  'waiting_dp': '#8B5CF6',
  'pending_assignment': '#6366F1',
  'material_preparation': '#EC4899',
  'in_production': '#FB923C',
  'qc_check': '#22D3EE',
  'completed': '#34D399',
};"""
content = content.replace(old_status_colors, new_status_colors)

# 4. Status Checks
content = content.replace("so.status === 'Completed'", "so.status === 'completed'")
content = content.replace("['Completed', 'Rejected']", "['completed']")
content = content.replace("s.status === 'Waiting Approval'", "s.status === 'design_review'")
content = content.replace("s.status === 'In Production'", "s.status === 'in_production'")
content = content.replace("s.status === 'Completed'", "s.status === 'completed'")

# 5. Format Status for pie chart
content = content.replace("fullStatus: status,", "fullStatus: formatSOStatus(status),")
content = content.replace("name: status", "name: formatSOStatus(status)")

# Also format status in the late SOs list
content = content.replace(">{so.status}</p>", ">{formatSOStatus(so.status)}</p>")

with open(new_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Dashboard Migrated Successfully')
