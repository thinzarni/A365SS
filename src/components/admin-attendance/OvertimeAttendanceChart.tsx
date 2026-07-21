import React from 'react';
import styles from './OvertimeAttendanceChart.module.css';

export interface OTRecordsData {
    timeDeviations: number;
    approvedOvertime: number;
    otCompensation: number;
    attendanceProcessed: number;
}

interface OvertimeAttendanceChartProps {
    data?: OTRecordsData | null;
    isLoading?: boolean;
}

const KPI_CONFIG = [
    {
        key: 'timeDeviations' as keyof OTRecordsData,
        label: 'Time Deviations',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.10)',
        icon: '⏱',
    },
    {
        key: 'approvedOvertime' as keyof OTRecordsData,
        label: 'Overtime',
        color: '#6366f1',
        bg: 'rgba(99,102,241,0.10)',
        icon: '✅',
    },
    {
        key: 'otCompensation' as keyof OTRecordsData,
        label: 'Overtime & Allowance',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.10)',
        icon: '💰',
    },
    {
        key: 'attendanceProcessed' as keyof OTRecordsData,
        label: 'Attendance',
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.10)',
        icon: '📋',
    },
];

const OvertimeAttendanceChart: React.FC<OvertimeAttendanceChartProps> = ({ data, isLoading }) => {
    const maxValue = Math.max(
        ...KPI_CONFIG.map((cfg) => (data ? data[cfg.key] : 0)),
        1
    );

    return (
        <div className={styles.wrapper}>
            {/* KPI Cards only — no chart */}
            <div className={styles.kpiGrid}>
                {KPI_CONFIG.map((cfg) => {
                    const count = data ? data[cfg.key] : 0;
                    const pct = Math.round((count / maxValue) * 100);
                    return (
                        <div
                            key={cfg.key}
                            className={styles.kpiCard}
                            style={{ '--kpi-color': cfg.color, '--kpi-bg': cfg.bg } as React.CSSProperties}
                        >
                            <div className={styles.kpiIcon}>{cfg.icon}</div>
                            <div className={styles.kpiCount}>
                                {isLoading ? (
                                    <span className={styles.kpiSkeleton} />
                                ) : (
                                    count
                                )}
                            </div>
                            <div className={styles.kpiLabel}>{cfg.label}</div>
                            <div className={styles.kpiBar}>
                                <div
                                    className={styles.kpiBarFill}
                                    style={{
                                        width: `${pct}%`,
                                        background: cfg.color,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(OvertimeAttendanceChart);
