import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import styles from './Select.module.css';

interface Option {
    value: string;
    label: string;
    lat?: string;
    long?: string;
}

interface EditableSelectProps {
    label?: string;
    value: string;
    options: Option[];
    onChange: (value: string, selectedOption?: Option) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    isLoading?: boolean;
}

const EditableSelect: React.FC<EditableSelectProps> = ({
    label,
    value,
    options,
    onChange,
    placeholder,
    disabled,
    required,
    error,
    isLoading
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        onChange(val);
        setIsOpen(true);
    };

    const handleOptionSelect = (opt: Option) => {
        setSearchTerm(opt.label);
        onChange(opt.label, opt);
        setIsOpen(false);
    };

    return (
        <div className={styles['select-group']} ref={containerRef}>
            {label && (
                <label className={styles['select-group__label']}>
                    {label}
                    {required && <span className={styles['select-group__required']}>*</span>}
                </label>
            )}
            <div className={styles['editable-select-container']}>
                <div className={styles['input-wrapper']}>
                    <input
                        type="text"
                        className={`${styles['select-group__select']} ${error ? styles['select-group__select--error'] : ''}`}
                        value={searchTerm}
                        onChange={handleInputChange}
                        onFocus={() => !disabled && setIsOpen(true)}
                        placeholder={placeholder}
                        disabled={disabled}
                    />
                    <div className={styles['icon-wrapper']}>
                        {isLoading ? (
                            <div className={styles['spinner']} />
                        ) : (
                            <ChevronDown 
                                size={18} 
                                className={`${styles['chevron']} ${isOpen ? styles['chevron--open'] : ''}`}
                                onClick={() => !disabled && setIsOpen(!isOpen)}
                            />
                        )}
                    </div>
                </div>

                {isOpen && !disabled && (
                    <div className={styles['dropdown-menu']}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    className={styles['dropdown-item']}
                                    onClick={() => handleOptionSelect(opt)}
                                >
                                    <MapPin size={14} className={styles['item-icon']} />
                                    <div className={styles['item-content']}>
                                        <span className={styles['item-label']}>{opt.label}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles['no-options']}>
                                {searchTerm ? `Use "${searchTerm}"` : 'No options found'}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {error && <span className={styles['select-group__error']}>{error}</span>}
        </div>
    );
};

export default EditableSelect;
