import os
import re

path = 'src/app/components/data/mockData.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_sos = '''
    {
      id: 'SO-2026076', customerId: '0001', partNumber: 'PJT-DMM-001', description: 'Custom Fixture Bracket',
      quantity: 15, unit: 'PCS', deadline: '2026-08-10', status: 'Rejected', createdBy: 'u1', createdAt: '2026-05-15',
      designLink: 'https://drive.google.com/file/d/example14', submittedAt: '2026-05-16',
      rejectionReason: 'Desain terlalu rumit dan mahal untuk diproduksi, customer membatalkan.',
    },
    {
      id: 'SO-2026077', customerId: '0002', partNumber: 'PJT-DMM-002', description: 'Stainless Steel Conveyor Shaft',
      quantity: 5, unit: 'PCS', deadline: '2026-08-12', status: 'Revision Required', createdBy: 'u1', createdAt: '2026-05-16',
      designLink: 'https://drive.google.com/file/d/example15', submittedAt: '2026-05-17',
      rejectionReason: 'Toleransi shaft perlu di-adjust ke h7, mohon revisi drawing.',
    },
  ];
  
  export const STATUS_STEPS'''

content = re.sub(r'\];\s*export const STATUS_STEPS', new_sos, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Success')
