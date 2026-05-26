import React, { useCallback } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import styles from './AttendanceOverviewChart.module.css';

interface ChartDataPoint {
    name: string;
    value: number;
    color: string;
}

interface AttendanceOverviewChartProps {
    data?: {
        total: number | string;
        timein: number;
        leave: number;
        absent: number;
        lateincount: number;
        earlyoutcount: number;
    };
    title?: string;
    onBarClick?: (typeValue: string) => void;
}

const AttendanceOverviewChart: React.FC<AttendanceOverviewChartProps> = ({
    data,
    title = "Attendance Overview",
    onBarClick
}) => {
    // Default fallback data if none provided
    const chartData: ChartDataPoint[] = [
        { name: 'Total', value: Number(data?.total) ?? 0, color: '#33b5ff' },
        { name: 'Present', value: data?.timein ?? 0, color: '#5e5ce6' },
        { name: 'Leave', value: data?.leave ?? 0, color: '#30d158' },
        { name: 'Absent', value: data?.absent ?? 0, color: '#ff9f0a' },
        { name: 'Late In', value: data?.lateincount ?? 0, color: '#64d2ff' },
        { name: 'Early Out', value: data?.earlyoutcount ?? 0, color: '#bf5af2' },
    ];

    const renderCustomBar = useCallback((props: any) => {
        const { x, y, width, height, fill, payload } = props;
        const depth = 8;

        if (height <= 0) return null;

        return (
            <g
                className={styles.barGroup}
                onClick={() => {
                    const typeMap: Record<string, string> = {
                        'Total': '0',
                        'Present': '1',
                        'Leave': '2',
                        'Absent': '4',
                        'Late In': '5',
                        'Early Out': '6'
                    };
                    const typeVal = typeMap[payload.name] || '0';
                    onBarClick?.(typeVal);
                }}
            >
                {/* 3D Top surface */}
                <path
                    d={`M ${x} ${y} L ${x + depth} ${y - depth} L ${x + width + depth} ${y - depth} L ${x + width} ${y} Z`}
                    fill={fill}
                    filter="brightness(1.2)"
                />
                {/* 3D Right side surface */}
                <path
                    d={`M ${x + width} ${y} L ${x + width + depth} ${y - depth} L ${x + width + depth} ${y + height - depth} L ${x + width} ${y + height} Z`}
                    fill={fill}
                    filter="brightness(0.8)"
                />
                {/* Front face */}
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={fill}
                />
                {/* Bottom depth (optional, small line to give base depth) */}
                <path
                    d={`M ${x} ${y + height} L ${x + depth} ${y + height - depth} L ${x + width + depth} ${y + height - depth} L ${x + width} ${y + height} Z`}
                    fill={fill}
                    filter="brightness(0.6)"
                    opacity={0.3}
                />
            </g>
        );
    }, [onBarClick]);

    // Calculate Y-axis domain based on total
    const totalValue = Number(data?.total) || 0;
    let maxDomain = 100; // Standard

    if (totalValue > 100) {
        maxDomain = totalValue;
    } else if (totalValue <= 20) {
        maxDomain = 20;
    }

    // Generate 5 nice ticks based on maxDomain
    const generateTicks = (max: number) => {
        const step = Math.ceil(max / 4);
        return [0, step, step * 2, step * 3, max];
    };
    const ticks = generateTicks(maxDomain);

    return (
        <div className={styles.chartWrapper}>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 30 }}
                        barSize={20}
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
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
                        />
                        <YAxis
                            domain={[0, maxDomain]}
                            ticks={ticks}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
                        />
                        <Tooltip
                            cursor={false}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar
                            dataKey="value"
                            shape={renderCustomBar}
                            isAnimationActive={true}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot}></span>
                    <span className={styles.legendText}>{title}</span>
                </div>
            </div>
        </div>
    );
};

export default React.memo(AttendanceOverviewChart);
