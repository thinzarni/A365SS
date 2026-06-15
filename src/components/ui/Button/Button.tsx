import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
    iconOnly?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', fullWidth, loading, iconOnly, children, className = '', disabled, ...props }, ref) => {
        const classes = [
            styles.btn,
            styles[`btn--${variant}`],
            size !== 'md' && styles[`btn--${size}`],
            fullWidth && styles['btn--full'],
            iconOnly && styles['btn--icon'],
            className,
        ].filter(Boolean).join(' ');

        return (
            <button
                ref={ref}
                className={classes}
                disabled={disabled || loading}
                {...props}
            >
                {loading && <span className={styles.btn__spinner} />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
export default Button;
