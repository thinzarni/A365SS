/* ═══════════════════════════════════════════════════════════
   HolidaysPage — Public Holiday Calendar
   Shows 12 months for the selected year, holidays highlighted.
   Tap a holiday → bottom-sheet style modal with details.
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarX2, X, PartyPopper } from 'lucide-react';
import mainClient from '../../lib/main-client';
import { HOLIDAYS } from '../../config/api-routes';
import styles from './HolidaysPage.module.css';
import '../../styles/pages.css';

/* ── Types ── */
interface Holiday {
    holidayname: string;
    date: string; // "YYYY-MM-DD" (normalized from API's "YYYYMMDD")
}

/** Normalize "YYYYMMDD" → "YYYY-MM-DD".  Already-hyphenated strings pass through. */
function normalizeDateStr(raw: string): string {
    const s = raw.trim();
    if (s.length === 8 && !s.includes('-')) {
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    }
    return s;
}

/* ── Helpers (Names are now localized inside the component) ── */

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function getFirstDayOffset(year: number, month: number): number {
    // month is 1-based; returns 0=Sun..6=Sat
    return new Date(year, month - 1, 1).getDay();
}



/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */
export default function HolidaysPage() {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentDay = new Date().getDate();

    /* ── Year selector ── */
    const years = useMemo(() => {
        const arr: number[] = [];
        for (let i = -2; i <= 2; i++) arr.push(currentYear + i);
        return arr;
    }, [currentYear]);

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    /* ── Fetch holidays ── */
    const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
        queryKey: ['holidays', selectedYear],
        queryFn: async () => {
            const res = await mainClient.post(`${HOLIDAYS}?year=${selectedYear}`);
            const raw = res.data?.data ?? res.data ?? [];
            if (!Array.isArray(raw)) return [];
            return raw.map((item: Record<string, unknown>) => ({
                holidayname: String(item.holidayname ?? ''),
                date: normalizeDateStr(String(item.date ?? '')),
            }));
        },
    });

    /* ── Group by month ── */
    const holidaysByMonth = useMemo(() => {
        const map: Record<number, Record<number, Holiday>> = {};
        for (const h of holidays) {
            const d = new Date(h.date);
            if (isNaN(d.getTime())) continue;
            const month = d.getMonth() + 1;
            const day = d.getDate();
            if (!map[month]) map[month] = {};
            map[month][day] = h;
        }
        return map;
    }, [holidays]);

    /* ── Count per month for badges ── */
    const countByMonth = useMemo(() => {
        const counts: Record<number, number> = {};
        for (let m = 1; m <= 12; m++) {
            counts[m] = holidaysByMonth[m] ? Object.keys(holidaysByMonth[m]).length : 0;
        }
        return counts;
    }, [holidaysByMonth]);

    /* ── Modal close ── */
    const closeModal = useCallback(() => setSelectedHoliday(null), []);

    useEffect(() => {
        if (!selectedHoliday) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [selectedHoliday, closeModal]);

    /* ── Auto-scroll to current month on load ── */
    const monthRefs = useRef<(HTMLDivElement | null)[]>([]);
    useEffect(() => {
        if (selectedYear === currentYear && !isLoading) {
            const el = monthRefs.current[currentMonth - 1];
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        }
    }, [selectedYear, currentYear, currentMonth, isLoading]);

    /* ═══════════════════════════ Render ═══════════════════════ */
    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title">{t('nav.holidays')}</h1>
                        <p className="page-header__subtitle">
                            {t('holidays.holidayCount', { count: holidays.length })} {t('holidays.inYear', { year: selectedYear })}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Year Selector ── */}
            <div className={styles.yearSelector}>
                {years.map((year) => (
                    <button
                        key={year}
                        className={`${styles.yearBtn} ${year === selectedYear ? styles.yearBtnActive : ''}`}
                        onClick={() => setSelectedYear(year)}
                    >
                        {year}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            {isLoading ? (
                <div className={styles.loadingGrid}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={styles.skeletonCard} />
                    ))}
                </div>
            ) : holidays.length === 0 ? (
                <div className="empty-state">
                    <CalendarX2 size={64} className="empty-state__icon" />
                    <h3 className="empty-state__title">{t('holidays.noHolidays')}</h3>
                    <p className="empty-state__desc">{t('holidays.noHolidaysDesc', { year: selectedYear })}</p>
                </div>
            ) : (
                <div className={styles.monthsGrid}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <MonthCard
                            key={month}
                            ref={(el) => { monthRefs.current[month - 1] = el; }}
                            year={selectedYear}
                            month={month}
                            holidays={holidaysByMonth[month] || {}}
                            holidayCount={countByMonth[month]}
                            isCurrentMonth={selectedYear === currentYear && month === currentMonth}
                            currentDay={selectedYear === currentYear && month === currentMonth ? currentDay : null}
                            onHolidayClick={setSelectedHoliday}
                            t={t}
                        />
                    ))}
                </div>
            )}

            {/* ── Holiday Detail Modal ── */}
            {selectedHoliday && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div
                        ref={modalRef}
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className={styles.modalClose} onClick={closeModal}>
                            <X size={20} />
                        </button>
                        <HolidayDetail holiday={selectedHoliday} />
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   MonthCard — A single month calendar grid
   ═══════════════════════════════════════════════════════════ */
import { forwardRef } from 'react';

interface MonthCardProps {
    year: number;
    month: number;
    holidays: Record<number, Holiday>;
    holidayCount: number;
    isCurrentMonth: boolean;
    currentDay: number | null;
    onHolidayClick: (h: Holiday) => void;
    t: any;
}

const MonthCard = forwardRef<HTMLDivElement, MonthCardProps>(function MonthCard(
    { year, month, holidays, holidayCount, isCurrentMonth, currentDay, onHolidayClick, t },
    ref,
) {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOffset = getFirstDayOffset(year, month);

    return (
        <div
            ref={ref}
            className={`${styles.monthCard} ${isCurrentMonth ? styles.monthCardCurrent : ''}`}
        >
            {/* Month header */}
            <div className={styles.monthHeader}>
                <h3 className={styles.monthName}>{t(`common.months.${month - 1}`)}</h3>
                {holidayCount > 0 && (
                    <span className={styles.monthBadge}>{holidayCount}</span>
                )}
            </div>

            {/* Weekday names */}
            <div className={styles.weekRow}>
                {DAY_NAMES_FALLBACK.map((_, i) => (
                    <span key={i} className={styles.weekDay}>{t(`common.days.${i}`)}</span>
                ))}
            </div>

            {/* Day grid */}
            <div className={styles.dayGrid}>
                {/* Empty offset cells */}
                {Array.from({ length: firstDayOffset }, (_, i) => (
                    <span key={`empty-${i}`} className={styles.dayEmpty} />
                ))}

                {/* Actual days */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const holiday = holidays[day];
                    const isToday = currentDay === day;

                    return (
                        <button
                            key={day}
                            className={`${styles.dayCell} ${holiday ? styles.dayCellHoliday : ''} ${isToday ? styles.dayCellToday : ''}`}
                            onClick={holiday ? () => onHolidayClick(holiday) : undefined}
                            title={holiday ? holiday.holidayname : undefined}
                            disabled={!holiday}
                        >
                            <span className={styles.dayNum}>{day}</span>
                            {holiday && <span className={styles.holidayDot} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

/* ── Fallback ── */
const DAY_NAMES_FALLBACK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function HolidayDetail({ holiday }: { holiday: Holiday }) {
    const { t } = useTranslation();
    const date = new Date(holiday.date);
    const dayNum = date.getDate();
    const monthIdx = date.getMonth();
    const weekdayIdx = date.getDay();

    return (
        <div className={styles.detailContent}>
            {/* Big date display */}
            <div className={styles.detailDateBlock}>
                <span className={styles.detailDayBig}>{dayNum}</span>
                <span className={styles.detailMonthYear}>
                    {t(`common.months.${monthIdx}`)} {date.getFullYear()}
                </span>
                <span className={styles.detailWeekday}>
                    {t(`common.daysLong.${weekdayIdx}`)}
                </span>
            </div>

            {/* Holiday name */}
            <h2 className={styles.detailName}>{holiday.holidayname}</h2>

            {/* Badge */}
            <span className={styles.detailBadge}>
                <PartyPopper size={14} />
                {t('holidays.publicHoliday')}
            </span>
        </div>
    );
}
