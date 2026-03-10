/* ═══════════════════════════════════════════════════════════
   HRViewPage — searchable employee list for HR / managers
   Click an employee → MemberDetailView (calendar + check-in timeline)
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, Users, ChevronRight, Building2, Briefcase, Loader2 } from 'lucide-react';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import { CHAT_SEARCH_USER } from '../../config/api-routes';
import '../../styles/pages.css';
import styles from './HRViewPage.module.css';


/* eslint-disable @typescript-eslint/no-explicit-any */

interface Employee {
    syskey: string;
    userid: string;
    name: string;
    department?: string;
    rank?: string;
    profile?: string;
}

function mapEmployee(raw: any): Employee {
    return {
        syskey: String(raw.syskey ?? raw.employeeSyskey ?? raw.usersyskey ?? ''),
        userid: String(raw.userid ?? raw.user_id ?? raw.email ?? ''),
        name: String(raw.name ?? raw.k_eng_name ?? raw.username ?? raw.userid ?? ''),
        department: raw.department || raw.dept_name || raw.dept || '',
        rank: raw.rank || raw.position || raw.title || '',
        profile: raw.profile || raw.photo || '',
    };
}

function getInitials(name: string): string {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function HRViewPage() {
    const navigate = useNavigate();
    const { userId, domain } = useAuthStore();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [search]);

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage
    } = useInfiniteQuery({
        queryKey: ['hr-employee-list', debouncedSearch],
        initialPageParam: 1,
        queryFn: async ({ pageParam = 1 }) => {
            const res = await mainClient.post(CHAT_SEARCH_USER, {
                userid: userId || '',
                domain: domain || '',
                searchkey: debouncedSearch,
                currentpage: pageParam,
                pagesize: 20,
                sortby: 'name',
                sortorder: '',
            });
            const raw = res.data;
            let users: any[] = [];
            if (Array.isArray(raw)) {
                users = raw;
            } else if (raw?.employeelist && Array.isArray(raw.employeelist)) {
                users = raw.employeelist;
            } else if (raw?.data_list && Array.isArray(raw.data_list)) {
                users = raw.data.data_list;
            } else if (raw?.data && Array.isArray(raw.data)) {
                users = raw.data;
            } else if (raw?.data?.employeelist && Array.isArray(raw.data.employeelist)) {
                users = raw.data.employeelist;
            } else if (raw?.data?.data_list && Array.isArray(raw.data.data_list)) {
                users = raw.data.data_list;
            } else if (raw?.datalist && Array.isArray(raw.datalist)) {
                users = raw.datalist;
            }
            return users.map(mapEmployee);
        },
        getNextPageParam: (lastPage, allPages) => {
            // If the last page returned fewer than 20 items, there are no more pages
            if (lastPage.length < 20) return undefined;
            return allPages.length + 1;
        },
        staleTime: 60 * 1000,
    });

    const employees = data?.pages.flat() || [];

    // Intersection Observer for infinite scroll
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const target = observerTarget.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(target);
        return () => observer.unobserve(target);
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleSelect = (emp: Employee) => {
        if (!emp.syskey || !emp.userid) return;
        // Navigate to Team structure page for the selected user
        navigate(`/team?userId=${encodeURIComponent(emp.userid)}`);
    };

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title">HR View</h1>
                        <p className="page-header__subtitle">Employee attendance &amp; check-in records</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search employees..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {isLoading && <Loader2 size={16} className={styles.searchLoader} />}
            </div>

            {/* List */}
            <div className={styles.list}>
                {!isLoading && employees.length === 0 && (
                    <div className={styles.empty}>
                        <Users size={40} strokeWidth={1} />
                        <p>{search ? 'No employees found' : 'Search for an employee'}</p>
                    </div>
                )}

                {employees.map(emp => (
                    <button
                        key={emp.syskey || emp.userid}
                        className={styles.card}
                        onClick={() => handleSelect(emp)}
                    >
                        {/* Avatar */}
                        <div className={styles.avatar}>
                            {emp.profile ? (
                                <img src={emp.profile} alt="" className={styles.avatarImg} />
                            ) : (
                                <span>{getInitials(emp.name)}</span>
                            )}
                        </div>

                        {/* Info */}
                        <div className={styles.info}>
                            <div className={styles.name}>{emp.name}</div>
                            <div className={styles.meta}>
                                {emp.department && (
                                    <span className={styles.metaItem}>
                                        <Building2 size={11} />
                                        {emp.department}
                                    </span>
                                )}
                                {emp.rank && (
                                    <span className={styles.metaItem}>
                                        <Briefcase size={11} />
                                        {emp.rank}
                                    </span>
                                )}
                                {!emp.department && !emp.rank && (
                                    <span className={styles.metaItem} style={{ color: '#94a3b8' }}>
                                        {emp.userid}
                                    </span>
                                )}
                            </div>
                        </div>

                        <ChevronRight size={16} className={styles.chevron} />
                    </button>
                ))}

                {/* Loading indicator for next page */}
                {isFetchingNextPage && (
                    <div className={styles.loadingMore}>
                        <Loader2 size={24} className={styles.spinner} />
                    </div>
                )}

                {/* Intersection target */}
                <div ref={observerTarget} style={{ height: '20px' }} />
            </div>
        </div>
    );
}
