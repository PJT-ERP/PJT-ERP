import os

path = 'src/app/components/data/mockData.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("status: 'Completed'", "status: 'completed'")
content = content.replace("status: 'Rejected'", "status: 'rejected'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed mockData statuses')
