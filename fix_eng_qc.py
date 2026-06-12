import os

path = 'src/app/pages/EngineeringQCPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("status === 'QC'", "status === 'qc_check'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Success')
