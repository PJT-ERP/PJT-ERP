import os

def fix_page(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Import formatSOStatus
    if 'formatSOStatus' not in content:
        content = content.replace('getStatusColor', 'getStatusColor, formatSOStatus')

    # Update StatusBadge to use formatSOStatus
    if '{status}' in content.split('function StatusBadge')[1].split('</span>')[0]:
        content = content.replace(
            '<span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />\n        {status}\n      </span>',
            '<span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />\n        {formatSOStatus(status)}\n      </span>'
        )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Success for {path}')

fix_page('src/app/pages/EngineeringQCPage.tsx')
fix_page('src/app/pages/OwnerApprovalPage.tsx')
fix_page('src/app/pages/ProductionPage.tsx')
