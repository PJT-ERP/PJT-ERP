import os
import re

def replace_in_file(path, old_str, new_str):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Success for {path}')
    else:
        print(f'Failed to find string in {path}')

replace_in_file(
    'src/app/pages/EngineeringTasksPage.tsx',
    '"#EAB308"',
    '"#2563EB"'
)

replace_in_file(
    'src/app/pages/ProductionPage.tsx',
    '"#EAB308"',
    '"#2563EB"'
)
