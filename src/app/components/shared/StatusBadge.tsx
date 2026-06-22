import { SOStatus, getStatusColor } from "../data/mockData";

interface StatusBadgeProps {
  status: SOStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = getStatusColor(status) as any;
  const sizeClass = size === 'sm' ? 'text-[11px] px-[8px] py-[2px]' : 'text-[12.5px] px-3 py-1.5';
  const dotClass = colors.dot || colors.text.replace('text-', 'bg-');
  
  return (
    <span 
      className={`inline-flex items-center gap-[5px] rounded-[4px] font-medium border whitespace-nowrap ${sizeClass} ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${dotClass}`} />
      {status}
    </span>
  );
}
