import os

path = 'src/app/pages/QCPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("'QC'", "'qc_check'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Success')
