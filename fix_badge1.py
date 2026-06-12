import os

path = 'src/app/components/data/mockData.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_func = '''
export function formatSOStatus(status: string): string {
  const map: Record<string, string> = {
    'qc_check': 'QC',
    'in_production': 'In Production',
    'material_preparation': 'Material Prep',
    'pending_assignment': 'Menunggu Penugasan',
    'waiting_dp': 'Menunggu DP'
  };
  return map[status] || status;
}

  export function getStatusColor'''

if 'export function formatSOStatus' not in content:
    content = content.replace('  export function getStatusColor', new_func)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
print('Success mockData')
