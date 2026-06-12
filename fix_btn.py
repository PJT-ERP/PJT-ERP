import os

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
    'style={{ fontSize: "11px", background: S.cyan, color: "#fff", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontWeight: 500 }}',
    'style={{ fontSize: "11px", background: S.slate, color: "#fff", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontWeight: 500 }}'
)

replace_in_file(
    'src/app/pages/ProductionPage.tsx',
    'style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>\n                    Tugaskan Operator',
    'style={{ padding: "8px 16px", background: S.slate, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>\n                    Tugaskan Operator'
)
