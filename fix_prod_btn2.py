import os
import re

path = 'src/app/pages/ProductionPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'background: S\.slate(.*?)>(\s*Tugaskan Operator)',
    r'background: "#EAB308"\1>\2',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Success')
