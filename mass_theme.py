import os
import glob

# Files we already modified and themed in PJT Revisi 1
exclude_files = [
    "EngineeringPage.tsx",
    "EngineeringTasksPage.tsx",
    "EngineeringPurchasingPage.tsx",
    "OwnerApprovalPage.tsx",
    "mockData.ts",
]

base_dir = r"c:\Users\stephanie\PJT Revisi 1\src\app"

# Find all tsx files
files = glob.glob(os.path.join(base_dir, "**", "*.tsx"), recursive=True)

old_s = """const S = {
  font: "Inter, sans-serif",
  navy: "#0F172A",
  cyan: "#06B6D4",
  slate: "#1E293B",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};"""

new_s = """const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};"""

count = 0
for f in files:
    filename = os.path.basename(f)
    if filename in exclude_files:
        continue
    
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    
    original_content = content
    
    # 1. Replace S object if it matches perfectly
    content = content.replace(old_s, new_s)
    
    # 2. If it's a slightly different S object, we can just replace the specific lines
    content = content.replace('cyan: "#06B6D4"', 'cyan: "#C8102E"')
    content = content.replace('navy: "#0F172A"', 'navy: "#1F1F1F"')
    content = content.replace('slate: "#1E293B"', 'slate: "#111827"')
    
    # 3. Replace hardcoded blue colors with red
    content = content.replace('"#EFF6FF"', '"#FEF2F2"') # bg-blue-50 to bg-red-50
    content = content.replace('"#2563EB"', '"#C8102E"') # text-blue-600 to text-red-600 / primary action
    
    if content != original_content:
        with open(f, "w", encoding="utf-8") as file:
            file.write(content)
        count += 1
        print(f"Updated {filename}")

print(f"Total files updated: {count}")
