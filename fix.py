import glob
import re

for file in glob.glob('c:/Users/stephanie/PJT Revisi/src/app/pages/*.tsx'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the broken StatusBadge and replace it entirely
    pattern = r'function StatusBadge\(\{\s*status\s*\}\s*:\s*\{\s*status:\s*([^}]+)\}\)\s*\{\s*const cfg = getStatusColor\([^)]+\);\s*return \(\s*<span className=\{inline-flex[^>]+>\s*<span className=\{w-\[5px\][^>]+/>\s*\{status\}\s*</span>\s*\);\s*\}'
    
    new_badge = '''function StatusBadge({ status }: { status: \g<1>}) {
  const cfg = getStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}'''

    new_content = re.sub(pattern, new_badge, content)
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Fixed ' + file)
