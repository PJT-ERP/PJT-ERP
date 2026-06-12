import os

path = 'src/app/pages/QCPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_btn = """                  <button onClick={() => setSelectedSO(so)}
                    style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Mulai Inspeksi
                  </button>"""

new_span = """                  <span style={{ fontSize: "12px", color: S.secondary, fontWeight: 500, background: "#F1F5F9", padding: "6px 12px", borderRadius: 6 }}>
                    Menunggu Inspeksi
                  </span>"""

content = content.replace(old_btn, new_span)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed Mulai Inspeksi button in QCPage")
