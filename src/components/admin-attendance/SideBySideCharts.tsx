import React, { useCallback } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import styles from './SideBySideCharts.module.css';

/* ── Types ── */
export interface OTRecordsData {
    timeDeviations: number;
    approvedOvertime: number;
    otCompensation: number;
    attendanceProcessed: number;
}

export interface SwipeExceptionData {
    total?: number;
    missingIn?: number;
    missingOut?: number;
    absent?: number;
    swipeOverlapWithLeave?: number;
    oddSwipes?: number;
}

/* ── Shared Custom Tooltip (matches AttendanceOverviewChart style) ── */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#fff',
                borderRadius: 8,
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '8px 14px',
                fontSize: 12,
            }}>
                <div style={{ color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{label}</div>
                <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 18 }}>{payload[0].value}</div>
            </div>
        );
    }
    return null;
};

/* ── Shared 3D-style custom bar (vertical, matching AttendanceOverviewChart) ── */
const make3DBar = (depth = 6) => function Custom3DBar(props: any) {
    const { x, y, width, height, fill } = props;
    if (height <= 0 || !fill) return null;
    return (
        <g className={styles.barGroup}>
            {/* Top face */}
            <path
                d={`M ${x} ${y} L ${x + depth} ${y - depth} L ${x + width + depth} ${y - depth} L ${x + width} ${y} Z`}
                fill={fill}
                style={{ filter: 'brightness(1.25)' }}
            />
            {/* Right face */}
            <path
                d={`M ${x + width} ${y} L ${x + width + depth} ${y - depth} L ${x + width + depth} ${y + height - depth} L ${x + width} ${y + height} Z`}
                fill={fill}
                style={{ filter: 'brightness(0.78)' }}
            />
            {/* Front face */}
            <rect x={x} y={y} width={width} height={height} fill={fill} />
            {/* Bottom depth */}
            <path
                d={`M ${x} ${y + height} L ${x + depth} ${y + height - depth} L ${x + width + depth} ${y + height - depth} L ${x + width} ${y + height} Z`}
                fill={fill}
                style={{ filter: 'brightness(0.6)', opacity: 0.3 }}
            />
        </g>
    );
};

const Bar3D = make3DBar(6);

/* ── Shared chart panel ── */
interface ChartPanelProps {
    title: string;
    subtitle: string;
    accentColor: string;
    data: { name: string; value: number; color: string }[];
    isLoading?: boolean;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ title, subtitle, accentColor, data, isLoading }) => {
    // Compute nice Y-axis domain (same approach as AttendanceOverviewChart)
    const maxVal = Math.max(...data.map(d => d.value), 1);
    let maxDomain = maxVal <= 20 ? 20 : maxVal;
    const generateTicks = (max: number) => {
        const step = Math.ceil(max / 4);
        return [0, step, step * 2, step * 3, max];
    };
    const ticks = generateTicks(maxDomain);

    const renderBar = useCallback((props: any) => <Bar3D {...props} />, []);

    return (
        <div className={styles.panel}>
            {/* Soft gradient overlay — same as analyticsCard::before */}
            <div className={styles.panelGlow} style={{ '--accent': accentColor } as React.CSSProperties} />

            {/* Header */}
            <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>{title}</div>
                <div className={styles.panelSubtitle}>{subtitle}</div>
            </div>

            {/* Divider */}
            <div className={styles.divider} />

            {/* Chart */}
            {isLoading ? (
                <div className={styles.skeleton} />
            ) : (
                <div className={styles.chartArea}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 24, left: 0, bottom: 36 }}
                            barSize={22}
                        >
                            <CartesianGrid
                                strokeDasharray="0"
                                vertical={true}
                                horizontal={true}
                                stroke="#e5e7eb"
                            />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                angle={-35}
                                textAnchor="end"
                                height={60}
                                tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }}
                            />
                            <YAxis
                                domain={[0, maxDomain]}
                                ticks={ticks}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }}
                            />
                            <Tooltip
                                cursor={false}
                                content={<CustomTooltip />}
                            />
                            <Bar
                                dataKey="value"
                                shape={renderBar}
                                isAnimationActive={true}
                            >
                                {data.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Legend dots */}
            <div className={styles.legendRow}>
                {data.map((d) => (
                    <span key={d.name} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: d.color }} />
                        <span className={styles.legendText}>{d.name}</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════
   OT Chart (left panel)
   ══════════════════════════════════════════════ */
interface OTChartProps {
    data?: OTRecordsData | null;
    isLoading?: boolean;
}

export const OTBarChart: React.FC<OTChartProps> = ({ data, isLoading }) => {
    const chartData = [
        { name: 'Time Dev.', value: data?.timeDeviations ?? 0, color: '#f59e0b' },
        { name: 'Overtime', value: data?.approvedOvertime ?? 0, color: '#6366f1' },
        { name: 'OT & Allow.', value: data?.otCompensation ?? 0, color: '#10b981' },
        { name: 'Attendance', value: data?.attendanceProcessed ?? 0, color: '#3b82f6' },
    ];

    return (
        <ChartPanel
            title="Overtime & Attendance"
            subtitle="This period"
            accentColor="#6366f1"
            data={chartData}
            isLoading={isLoading}
        />
    );
};

/* ══════════════════════════════════════════════
   Swipe Exception Chart (right panel)
   ══════════════════════════════════════════════ */
interface SwipeExceptionChartProps {
    data?: SwipeExceptionData | null;
    isLoading?: boolean;
}

export const SwipeExceptionBarChart: React.FC<SwipeExceptionChartProps> = ({ data, isLoading }) => {
    const chartData = [
        { name: 'Total', value: data?.total ?? 0, color: '#33b5ff' },
        { name: 'Miss. In', value: data?.missingIn ?? 0, color: '#ef4444' },
        { name: 'Miss. Out', value: data?.missingOut ?? 0, color: '#9d0b93ff' },
        { name: 'Absent', value: data?.absent ?? 0, color: '#ff9f0a' },
        { name: 'Overlap', value: data?.swipeOverlapWithLeave ?? 0, color: '#ffee00ff' },
        { name: 'Odd Swipes', value: data?.oddSwipes ?? 0, color: '#10b981' },
    ];

    return (
        <ChartPanel
            title="Swipe Exceptions"
            subtitle="Today"
            accentColor="#f59e0b"
            data={chartData}
            isLoading={isLoading}
        />
    );
};
