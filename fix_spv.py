import os

path = 'src/app/pages/ProductionPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "const isSupervisor = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';",
    "const isSupervisor = currentUser?.isSupervisor || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Success fix isSupervisor')
