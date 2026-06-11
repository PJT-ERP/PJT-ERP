import { SOStatus, getStatusColor } from "../data/mockData";

interface StatusBadgeProps {
  status: SOStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = getStatusColor(status);
  const sizeClass = size === 'sm' ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3 py-1.5';
  
  return (
    <span 
      className={`inline-flex items-center rounded-md font-bold shadow-sm tracking-wide ${sizeClass} ${colors.bg} ${colors.text} ${colors.border}`}
      style={{ textTransform: 'uppercase' }}
    >
      {status}
    </span>
  );
}
