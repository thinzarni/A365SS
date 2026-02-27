import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: ReactNode;
    rightIcon?: ReactNode;
    required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, icon, rightIcon, required, className = '', ...props }, ref) => {
        const inputClasses = [
            styles['input-group__input'],
            error && styles['input-group__input--error'],
            className,
        ].filter(Boolean).join(' ');

        return (
            <div className={styles['input-group']}>
                {label && (
                    <label className={styles['input-group__label']} htmlFor={props.id}>
                        {label}
                        {required && <span className={styles['input-group__required']}>*</span>}
                    </label>
                )}
                {icon || rightIcon ? (
                    <div className={styles['input-group__wrapper']}>
                        {icon && <span className={styles['input-group__icon']}>{icon}</span>}
                        <input ref={ref} className={inputClasses} {...props} />
                        {rightIcon && <span className={styles['input-group__right-icon']}>{rightIcon}</span>}
                    </div>
                ) : (
                    <input ref={ref} className={inputClasses} {...props} />
                )}
                {error && <span className={styles['input-group__error']}>{error}</span>}
                {hint && !error && <span className={styles['input-group__hint']}>{hint}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';

// ── Textarea ──
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, hint, required, className = '', ...props }, ref) => {
        const textareaClasses = [
            styles['input-group__input'],
            styles['input-group__textarea'],
            error && styles['input-group__input--error'],
            className,
        ].filter(Boolean).join(' ');

        return (
            <div className={styles['input-group']}>
                {label && (
                    <label className={styles['input-group__label']} htmlFor={props.id}>
                        {label}
                        {required && <span className={styles['input-group__required']}>*</span>}
                    </label>
                )}
                <textarea ref={ref} className={textareaClasses} {...props} />
                {error && <span className={styles['input-group__error']}>{error}</span>}
                {hint && !error && <span className={styles['input-group__hint']}>{hint}</span>}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
export default Input;
