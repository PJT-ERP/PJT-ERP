import os

# 1. Create QCReadOnlyView.tsx
old_qc_path = r'src\app\pages\QCPage.tsx'
old_qc_full_path = r'c:\Users\stephanie\PJT Revisi\\' + old_qc_path
new_qc_full_path = r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\QCReadOnlyView.tsx'

with open(old_qc_full_path, 'r', encoding='utf-8') as f:
    qc_content = f.read()

# Update colors
qc_content = qc_content.replace('cyan: "#06B6D4"', 'cyan: "#C8102E"')
qc_content = qc_content.replace('navy: "#0F172A"', 'navy: "#1F1F1F"')
qc_content = qc_content.replace('export function QCPage() {', 'export function QCReadOnlyView() {')

with open(new_qc_full_path, 'w', encoding='utf-8') as f:
    f.write(qc_content)

# 2. Update EngineeringQCPage.tsx to use QCReadOnlyView for regular engineers
eng_qc_path = r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\EngineeringQCPage.tsx'
with open(eng_qc_path, 'r', encoding='utf-8') as f:
    eng_content = f.read()

# Add import
eng_content = eng_content.replace(
    'import { SalesOrder, getStatusColor, formatSOStatus } from "../components/data/mockData";',
    'import { SalesOrder, getStatusColor, formatSOStatus } from "../components/data/mockData";\nimport { QCReadOnlyView } from "./QCReadOnlyView";'
)

spv_line = "  const isSpv = currentUser?.isSupervisor || currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Admin' || currentUser?.role === 'Owner';"
if spv_line in eng_content:
    eng_content = eng_content.replace(
        spv_line,
        spv_line + "\n\n  if (!isSpv) {\n    return <QCReadOnlyView />;\n  }\n"
    )

with open(eng_qc_path, 'w', encoding='utf-8') as f:
    f.write(eng_content)

# 3. Update QCPage.tsx (Admin view) to ONLY render QCReadOnlyView
admin_qc_path = r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\QCPage.tsx'
admin_content = """import React from 'react';
import { QCReadOnlyView } from './QCReadOnlyView';

export function QCPage() {
  return <QCReadOnlyView />;
}
"""
with open(admin_qc_path, 'w', encoding='utf-8') as f:
    f.write(admin_content)

print('All QC views updated successfully!')
