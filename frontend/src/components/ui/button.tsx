import { cn } from '@/utils/helpers';
import React from 'react';
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
    "inline-flex max-w-full cursor-pointer items-center overflow-hidden justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            bounce: {
                true: "active:scale-[0.98]",
                false: "",
            },
            variant: {
                default:
                    "bg-primary-600 text-white hover:bg-primary-700 transition-all duration-300",
                destructive:
                    "bg-gradient-to-r from-destructive/90 to-destructive/80 border border-destructive/20 text-white shadow-[0_0_12px_-3px_rgba(var(--destructive-rgb),0.3)] hover:shadow-[0_0_16px_-3px_rgba(var(--destructive-rgb),0.4)] hover:border-destructive/30 hover:from-destructive hover:to-destructive/90",
                outline:
                    "border border-default-500 bg-default-200 text-default-800 backdrop-blur-[2px] hover:bg-default-300 hover:text-default-900",
                secondary:
                    "bg-gradient-to-r from-secondary/90 to-secondary-foreground/5 border border-secondary/20 text-white/90 hover:text-white hover:from-secondary hover:border-secondary/30",
                ghost: "text-default-600 hover:bg-default-100",
                link: "text-primary-400 underline-offset-4 hover:text-primary-300 hover:underline",
            },
            size: {
                default: "h-9 px-5 py-2",
                sm: "h-9 gap-2 px-3 text-xs",
                lg: "h-10 px-4 text-base",
                icon: "h-9 w-9",
                dynamic: "h-9 px-3 py-2 text-xs sm:h-9 sm:px-4 sm:py-2 sm:text-sm"
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            bounce: true,
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, bounce, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(buttonVariants({ variant, size, bounce, className }))}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export default Button;
