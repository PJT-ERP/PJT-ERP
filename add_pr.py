import os

file_path = r"c:\Users\stephanie\PJT Revisi 1\src\app\components\data\mockData.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """  {
    id: 'PR-004', soId: 'SO-2026069', itemName: 'CrMo Steel Round Bar 4130 80mm',
    specification: 'AISI 4130, Panjang 2m, HRC 28-32',
    quantity: 6, unit: 'BTG', urgency: 'Critical',
    notes: 'Material utama camshaft bearing seat, deadline ketat', requestedBy: 'u2',
    requestedAt: '2026-05-12', status: 'Pending',
  },
];"""

replacement = """  {
    id: 'PR-004', soId: 'SO-2026069', itemName: 'CrMo Steel Round Bar 4130 80mm',
    specification: 'AISI 4130, Panjang 2m, HRC 28-32',
    quantity: 6, unit: 'BTG', urgency: 'Critical',
    notes: 'Material utama camshaft bearing seat, deadline ketat', requestedBy: 'u2',
    requestedAt: '2026-05-12', status: 'Pending',
  },
  {
    id: 'PR-005', soId: 'SO-2026075', itemName: 'Bearing NSK 6204',
    specification: 'Deep Groove Ball Bearing 6204 DDU',
    quantity: 12, unit: 'PCS', urgency: 'Urgent',
    notes: 'Dibutuhkan segera untuk assembly gearbox', requestedBy: 'u7',
    requestedAt: '2026-05-15', status: 'Menunggu SPV',
  },
  {
    id: 'PR-006', itemName: 'O-Ring NBR70 50mm',
    specification: 'NBR Shore 70, ID 50mm, Tebal 3mm',
    quantity: 50, unit: 'PCS', urgency: 'Normal',
    notes: 'Restock material consumable', requestedBy: 'u7',
    requestedAt: '2026-05-16', status: 'Menunggu SPV',
  },
];"""

new_content = content.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Added missing PRs!")
