import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X, Check, Search } from 'lucide-react';
import Input from '../../ui/Input/Input';
import Modal from '../../ui/Modal/Modal';
import { Button } from '../../ui';
import apiClient from '../../../lib/api-client';
import { MEMBER_LIST } from '../../../config/api-routes';
import styles from './MemberPicker.module.css';

export interface MemberItem {
    syskey: string;
    employeeid?: string;
    name: string;
    department?: string;
    position?: string;
}

interface MemberPickerProps {
    label: string;
    members: MemberItem[];
    onChange: (members: MemberItem[]) => void;
    multiple?: boolean;
    required?: boolean;
    excludeSyskeys?: string[];
}

export default function MemberPicker({
    label,
    members,
    onChange,
    multiple = true,
    required,
    excludeSyskeys = [],
}: MemberPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const { data: employees = [], isLoading } = useQuery<MemberItem[]>({
        queryKey: ['employees'],
        queryFn: async () => {
            const res = await apiClient.post(MEMBER_LIST, {});
            return res.data?.datalist || [];
        },
        enabled: open,
        staleTime: 5 * 60 * 1000,
    });

    const filtered = useMemo(() => {
        let list = employees;
        if (excludeSyskeys && excludeSyskeys.length > 0) {
            const excludeSet = new Set(excludeSyskeys.map(String));
            list = list.filter((e: any) => {
                const s1 = String(e.syskey);
                const s2 = e.employeeid ? String(e.employeeid) : null;
                const s3 = e.userid ? String(e.userid) : null;
                const s4 = e.employee_id ? String(e.employee_id) : null;
                return !excludeSet.has(s1) &&
                       (!s2 || !excludeSet.has(s2)) &&
                       (!s3 || !excludeSet.has(s3)) &&
                       (!s4 || !excludeSet.has(s4));
            });
        }
        if (!search.trim()) return list;
        const q = search.toLowerCase();
        return list.filter(
            (e) =>
                e.name?.toLowerCase().includes(q) ||
                e.employeeid?.toLowerCase().includes(q) ||
                e.department?.toLowerCase().includes(q)
        );
    }, [employees, search, excludeSyskeys]);

    const selectedKeys = useMemo(() => new Set(members.map((m) => m.syskey)), [members]);

    const toggle = useCallback(
        (emp: MemberItem) => {
            if (selectedKeys.has(emp.syskey)) {
                onChange(members.filter((m) => m.syskey !== emp.syskey));
            } else if (multiple) {
                onChange([...members, emp]);
            } else {
                onChange([emp]);
                setOpen(false);
            }
        },
        [members, onChange, selectedKeys, multiple]
    );

    const remove = (syskey: string) => {
        onChange(members.filter((m) => m.syskey !== syskey));
    };

    return (
        <div className={styles['member-picker']}>
            <span className={styles['member-picker__label']}>
                {label}
                {required && <span style={{ color: 'var(--color-danger-500)', marginLeft: 2 }}>*</span>}
            </span>

            {members.length > 0 && (
                <div className={styles['member-picker__list']}>
                    {members.map((m) => (
                        <span key={m.syskey} className={styles['member-picker__chip']}>
                            {m.name}
                            <button
                                type="button"
                                className={styles['member-picker__chip-remove']}
                                onClick={() => remove(m.syskey)}
                            >
                                <X size={14} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <button
                type="button"
                className={styles['member-picker__add-btn']}
                onClick={() => setOpen(true)}
            >
                <Plus size={16} />
                {members.length === 0 ? `Select ${label}` : 'Add more'}
            </button>

            <Modal
                open={open}
                onClose={() => { setOpen(false); setSearch(''); }}
                title={`Select ${label}`}
                footer={
                    <Button variant="secondary" onClick={() => { setOpen(false); setSearch(''); }}>
                        Done
                    </Button>
                }
            >
                <div className={styles['member-picker__search']}>
                    <Input
                        placeholder="Search by name or ID…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search size={18} />}
                        autoFocus
                    />
                </div>

                {isLoading ? (
                    <div className={styles['member-picker__empty']}>Loading employees…</div>
                ) : filtered.length === 0 ? (
                    <div className={styles['member-picker__empty']}>No employees found</div>
                ) : (
                    <div className={styles['member-picker__results']}>
                        {filtered.map((emp) => {
                            const isSelected = selectedKeys.has(emp.syskey);
                            return (
                                <div
                                    key={emp.syskey}
                                    className={`${styles['member-picker__item']} ${isSelected ? styles['member-picker__item--selected'] : ''}`}
                                    onClick={() => toggle(emp)}
                                >
                                    <div className={styles['member-picker__item-avatar']}>
                                        {emp.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className={styles['member-picker__item-info']}>
                                        <div className={styles['member-picker__item-name']}>{emp.name}</div>
                                        <div className={styles['member-picker__item-dept']}>
                                            {emp.department || emp.position || emp.employeeid || ''}
                                        </div>
                                    </div>
                                    {isSelected && <Check size={18} className={styles['member-picker__item-check']} />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Modal>
        </div>
    );
}
