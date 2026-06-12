import os

path = 'src/app/components/data/mockData.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "status: 'In Production', createdBy: 'u1'",
    "status: 'in_production', assignedTo: 'u2', createdBy: 'u1'",
    2
)

content = content.replace(
    "status: 'In Production', createdBy: 'u1'",
    "status: 'qc_check', assignedTo: 'u2', createdBy: 'u1'"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = 'src/app/pages/ProductionPage.tsx'
with open(path2, 'r', encoding='utf-8') as f2:
    content2 = f2.read()

# remove inProductionRev and waitingQCRev definitions
content2 = content2.replace("const inProductionRev = salesOrders.filter(so => so.status === 'In Production');\n", "")
content2 = content2.replace("const waitingQCRev = salesOrders.filter(so => so.status === 'QC');\n", "")

# replace in UI
content2 = content2.replace("inProductionRev", "inProduction")
content2 = content2.replace("waitingQCRev", "waitingQC")

with open(path2, 'w', encoding='utf-8') as f2:
    f2.write(content2)

print('Success')
