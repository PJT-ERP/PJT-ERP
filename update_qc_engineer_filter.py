import os

path = r'c:\Users\stephanie\PJT Revisi 1\src\app\pages\QCReadOnlyView.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

filter_logic = """  const isRegularEngineer = currentUser?.role === 'Engineering' && !currentUser?.isSupervisor && currentUser?.username !== 'admin';
  const baseOrders = isRegularEngineer 
    ? salesOrders.filter(so => so.engineerId === currentUser?.id)
    : salesOrders;

  const completed = baseOrders.filter(so => so.status === 'Completed');
  const pendingQC = baseOrders.filter(so => so.status === 'QC');"""

content = content.replace(
    "  const completed = salesOrders.filter(so => so.status === 'Completed');\n  const pendingQC = salesOrders.filter(so => so.status === 'QC');",
    filter_logic
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated QCReadOnlyView filter logic")
