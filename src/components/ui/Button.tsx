import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[#21262d] text-[#e6edf3] border border-[#30363d] hover:bg-[#2d333b] hover:border-[#58a6ff]/40',
        ghost: 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]',
        outline: 'border border-[#30363d] text-[#e6edf3] hover:bg-[#21262d] hover:border-[#8b949e]',
        destructive: 'bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/40 hover:bg-[#da3633]/30',
        success: 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40 hover:bg-[#238636]/30',
        primary: 'bg-[#1f6feb] text-white hover:bg-[#388bfd] border border-[#388bfd]/50',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs rounded',
        md: 'h-8 px-3 text-xs',
        lg: 'h-9 px-4 text-sm',
        icon: 'h-7 w-7 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';
