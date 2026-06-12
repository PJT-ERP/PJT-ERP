import os

files = [
    'src/app/pages/EngineeringPage.tsx',
    'src/app/pages/EngineeringTasksPage.tsx'
]

old_str = "const isSpv = currentUser?.role === 'Engineering' && currentUser?.username === 'eng_spv';"
new_str = "const isSpv = currentUser?.isSupervisor || currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Admin' || currentUser?.role === 'Owner';"

for path in files:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = content.replace(old_str, new_str)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")
