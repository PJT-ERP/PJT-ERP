import os
import re

old_path = 'c:/Users/stephanie/PJT Revisi/src/app/pages/CustomerAnalyticsPage.tsx'
new_path = 'c:/Users/stephanie/PJT Revisi 1/src/app/pages/CustomerAnalyticsPage.tsx'

with open(old_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Colors
content = content.replace('#06B6D4', '#C8102E')
content = content.replace('#3B82F6', '#C8102E')
content = content.replace('text-blue-500', 'text-red-500')
content = content.replace('bg-blue-50', 'bg-red-50')
content = content.replace('text-cyan-500', 'text-red-500')
content = content.replace('bg-cyan-50', 'bg-red-50')
content = content.replace('text-cyan', 'text-red')
content = content.replace('bg-[#ECFEFF]', 'bg-red-50')
content = content.replace('border-cyan-200', 'border-red-200')

# 2. Statuses
content = content.replace("'Rejected'", "'rejected'")
content = content.replace("'Completed'", "'completed'")

# 3. Add to imports if necessary
# No formatSOStatus needed here because it's just analytics? Wait, let's see if there are any statuses rendered
# CustomerAnalyticsPage in PJT Revisi doesn't render full statuses, just groups orders by customer.

with open(new_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('CustomerAnalyticsPage Migrated Successfully')
