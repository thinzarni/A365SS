/* ═══════════════════════════════════════════════════════════
   Admin Attendance Types
   ═══════════════════════════════════════════════════════════ */

export interface AttendanceUser {
    userid: string;
    syskey: string;
    eid: string;
    employeeId: string; // API field name
    name: string;
    signedURL?: string;
    profile?: string; // API field for profile image
    status: string; // '1', '2', '4', '5', '6'
    range?: string; // API field for leave date range
    duration?: string;
    checkInTime?: string; // API field name
    checkOutTime?: string; // API field name
    attendancevalidation: boolean;
    timeinoffset?: string;
    timeoutoffset?: string;
    location?: string;
    // Legacy field names for backward compatibility
    timeintime?: string; // Legacy - use checkInTime
    timeouttime?: string; // Legacy - use checkOutTime
    leaveDateRange?: string; // Legacy - use range
}

export interface AttendanceResponse {
    datalist: AttendanceUser[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    hasMore: boolean;
}

export interface AttendanceCounts {
    // API response field names
    timein: number;
    timeout: number;
    absent: number;
    leave: number;
    workfromhome: number;
    total: string;
    activityorcheckin: number;
    withoutactivityorcheckin: number;
    lateincount: number;
    earlyoutcount: number;
}

export interface AttendanceState {
    // Data storage
    cachedData: {
        '0': AttendanceUser[]; // All
        '1': AttendanceUser[]; // Present
        '2': AttendanceUser[]; // Leave
        '4': AttendanceUser[]; // Absent
        '5': AttendanceUser[]; // Late In
        '6': AttendanceUser[]; // Early Out
    };
    
    // Pagination
    currentPage: { '0': number; '1': number; '2': number; '4': number; '5': number; '6': number };
    hasMoreData: { '0': boolean; '1': boolean; '2': boolean; '4': boolean; '5': boolean; '6': boolean };
    isLoading: { '0': boolean; '1': boolean; '2': boolean; '4': boolean; '5': boolean; '6': boolean };
    
    // UI State
    selectedStatus: string;
    selectedDate: Date;
    searchText: string;
    isCountLoading: boolean;
    isListLoading: boolean;
    
    // Statistics
    presentCount: number;
    leaveCount: number;
    absentCount: number;
    lateInCount: number;
    earlyOutCount: number;
    totalCount: number;
}

export interface StatItemProps {
    label: string;
    count: number;
    color: string;
    status: string;
    isInteractive?: boolean;
    isActive?: boolean;
    onClick?: () => void;
}

export interface UserCardProps {
    user: AttendanceUser;
    onCardTap?: (user: AttendanceUser) => void;
}

export interface FilterSectionProps {
    selectedDate: Date;
    searchText: string;
    selectedStatus: string;
    onDateChange: (date: Date) => void;
    onSearchChange: (text: string) => void;
    onStatusChange: (status: string) => void;
    onSearchSubmit: () => void;
}

export interface AttendanceStatsProps {
    presentCount: number;
    leaveCount: number;
    absentCount: number;
    lateInCount: number;
    earlyOutCount: number;
    totalCount: number;
    selectedStatus: string;
    onStatusClick: (status: string) => void;
    isInteractive?: boolean;
}

export interface AdminAttendancePageProps {
    // Props can be added as needed
}

export type AttendanceStatus = '0' | '1' | '2' | '4' | '5' | '6';

export const STATUS_LABELS: Record<string, string> = {
    '0': 'All',
    '1': 'Present',
    '2': 'Leave',
    '4': 'Absent',
    '5': 'Late In',
    '6': 'Early Out'
};

export const STATUS_COLORS: Record<string, string> = {
    '0': '#6b7280',    // Gray
    '1': '#10b981',    // Green
    '2': '#f97316',    // Orange
    '4': '#ef4444',    // Red
    '5': '#9333ea',    // Purple
    '6': '#9333ea'     // Purple
};
