import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-[#21262d] text-[#e6edf3] border-[#30363d]',
    success: 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40',
    warning: 'bg-[#d29922]/20 text-[#d29922] border-[#d29922]/40',
    destructive: 'bg-[#da3633]/20 text-[#f85149] border-[#da3633]/40',
    info: 'bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/40',
    outline: 'border-[#30363d] text-[#8b949e]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
