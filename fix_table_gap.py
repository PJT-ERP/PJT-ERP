import os

path = r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\QCReadOnlyView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Header
old_header = 'display: "grid", gridTemplateColumns: isAdmin ? "110px 140px 1fr 90px 100px 100px 90px" : "110px 140px 1fr 90px 100px 60px 100px 90px", padding: "8px 18px"'
new_header = 'display: "grid", gridTemplateColumns: isAdmin ? "110px 140px 1fr 90px 100px 100px 90px" : "110px 140px 1fr 90px 100px 60px 100px 90px", gap: 16, padding: "8px 18px"'

content = content.replace(old_header, new_header)

# Rows
old_row = 'display: "grid", gridTemplateColumns: isAdmin ? "110px 140px 1fr 90px 100px 100px 90px" : "110px 140px 1fr 90px 100px 60px 100px 90px",\n                      padding: "10px 18px"'
new_row = 'display: "grid", gridTemplateColumns: isAdmin ? "110px 140px 1fr 90px 100px 100px 90px" : "110px 140px 1fr 90px 100px 60px 100px 90px", gap: 16,\n                      padding: "10px 18px"'

content = content.replace(old_row, new_row)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Gap added successfully.")
