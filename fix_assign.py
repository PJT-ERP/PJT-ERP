import os
path = r'c:\Users\stephanie\PJT Revisi 1\src\app\components\data\mockData.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("assignedTo: 'u7'", "assignedTo: 'u2'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
