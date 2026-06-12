import os

path = 'src/app/pages/EngineeringQCPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update useApp
content = content.replace(
    'const { salesOrders, customers } = useApp();',
    'const { salesOrders, customers, currentUser } = useApp();\n  const isSpv = currentUser?.isSupervisor || currentUser?.role === \'Engineering Supervisor\' || currentUser?.role === \'Admin\' || currentUser?.role === \'Owner\';'
)

# 2. Update button
old_btn = """                  <button onClick={() => setSelectedSO(so)}
                    style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Mulai Inspeksi
                  </button>"""

new_btn = """                  {isSpv ? (
                    <button onClick={() => setSelectedSO(so)}
                      style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Mulai Inspeksi
                    </button>
                  ) : (
                    <span style={{ fontSize: "12px", color: S.secondary, fontWeight: 500, background: "#F1F5F9", padding: "6px 12px", borderRadius: 6 }}>
                      Menunggu Inspeksi Supervisor
                    </span>
                  )}"""

content = content.replace(old_btn, new_btn)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated EngineeringQCPage.tsx for engineer restrictions.")
