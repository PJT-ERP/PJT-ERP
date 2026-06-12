import os

# 1. Update EngineeringQCPage.tsx
eng_qc_path = r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\EngineeringQCPage.tsx'
with open(eng_qc_path, 'r', encoding='utf-8') as f:
    eng_content = f.read()

spv_line = "  const isSpv = currentUser?.isSupervisor || currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Admin' || currentUser?.role === 'Owner';"
inspect_line = "  const canInspect = currentUser?.isSupervisor || currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner';"

eng_content = eng_content.replace(spv_line, spv_line + '\n' + inspect_line)

old_btn_check = "{isSpv ? ("
new_btn_check = "{canInspect ? ("
eng_content = eng_content.replace(old_btn_check, new_btn_check)

with open(eng_qc_path, 'w', encoding='utf-8') as f:
    f.write(eng_content)


# 2. Update QCPage.tsx to render EngineeringQCPage
admin_qc_path = r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\QCPage.tsx'
admin_content = """import React from 'react';
import { EngineeringQCPage } from './EngineeringQCPage';

export function QCPage() {
  return <EngineeringQCPage />;
}
"""
with open(admin_qc_path, 'w', encoding='utf-8') as f:
    f.write(admin_content)

print('Admin QC page reverted to Workspace view and button locked.')
