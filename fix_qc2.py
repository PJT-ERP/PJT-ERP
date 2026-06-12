import os

path = 'src/app/components/data/mockData.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "quantity: 10, unit: 'PCS', deadline: '2026-07-12', status: 'in_production', assignedTo: 'u2', createdBy: 'u1', createdAt: '2026-05-02',",
    "quantity: 10, unit: 'PCS', deadline: '2026-07-12', status: 'qc_check', assignedTo: 'u2', createdBy: 'u1', createdAt: '2026-05-02',"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Success')
