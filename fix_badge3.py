import os

def fix_page(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(
        'const cfg = getStatusColor, formatSOStatus(status as any);',
        'const cfg = getStatusColor(status as any);'
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Success for {path}')

fix_page('src/app/pages/EngineeringQCPage.tsx')
fix_page('src/app/pages/OwnerApprovalPage.tsx')
fix_page('src/app/pages/ProductionPage.tsx')
