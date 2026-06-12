import os

path = 'src/app/pages/CustomerAnalyticsPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace dark grey (#475569) with vibrant red (#C8102E)
content = content.replace('#475569', '#C8102E')

# Replace the specific bg-slate-100 and border-slate-300 in the predicted cells to use red theme
content = content.replace("bg-slate-100 text-[#C8102E]'", "bg-red-50 text-[#C8102E]'")
content = content.replace("bg-slate-100 text-[", "bg-red-50 text-[")
content = content.replace("bg-slate-100 px-2", "bg-red-50 px-2")
content = content.replace("border-slate-300\">", "border-red-200\">")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed grey colors to bright red')
