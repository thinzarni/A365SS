/* ═══════════════════════════════════════════════════════════
   Team Shared Utils
   Common helpers used across Team pages
   ═══════════════════════════════════════════════════════════ */

import type { TeamMember } from '../../types/models';

/** Status dot color based on Flutter logic */
export function getStatusInfo(member: TeamMember) {
    const todayIn = parseInt(member.todayTimeInCount || '0', 10);
    const todayOut = parseInt(member.todayTimeOutCount || '0', 10);
    const isLeave = member.todayIsLeave === '0';
    const leaveStatus = member.leaveStatus;

    if (isLeave) {
        const statusMap: Record<number, { color: string; label: string }> = {
            1: { color: '#f59e0b', label: 'Leave (Pending)' },
            2: { color: '#f59e0b', label: 'Leave (Approved)' },
            3: { color: '#f59e0b', label: 'Leave (Rejected)' },
        };
        return statusMap[leaveStatus] || { color: '#f59e0b', label: 'On Leave' };
    }

    if (member.lastRecordTypeName === 601) {
        return { color: '#22c55e', label: 'Clocked In' };
    }

    if (todayIn > 0 || todayOut > 0) {
        return { color: '#ef4444', label: 'Clocked Out' };
    }

    return { color: '#94a3b8', label: 'No Records' };
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';
}

/** Map raw API member to TeamMember */
export function mapRawMember(raw: Record<string, unknown>, level: string, key: string): TeamMember {
    return {
        syskey: String(raw.syskey ?? ''),
        userName: String(raw.userName ?? raw.username ?? ''),
        employeeId: String(raw.employeeId ?? raw.employeeid ?? ''),
        profile: raw.profile ? String(raw.profile) : null,
        userid: String(raw.userid ?? ''),
        rank: String(raw.rank ?? ''),
        department: String(raw.department ?? ''),
        division: String(raw.division ?? ''),
        teamId: String(raw.teamId ?? raw.teamid ?? ''),
        level: level as TeamMember['level'],
        priority: String(raw.priority ?? '0'),
        role: raw.role ? String(raw.role) : null,
        type: raw.type ? String(raw.type) : null,
        hasJunior: Boolean(raw.hasJunior ?? raw.hasjunior ?? false),
        workingDays: String(raw.workingDays ?? raw.workingdays ?? '0'),
        timeInCount: String(raw.timeInCount ?? raw.timeincount ?? '0'),
        timeOutCount: String(raw.timeOutCount ?? raw.timeoutcount ?? '0'),
        activityCount: String(raw.activityCount ?? raw.activitycount ?? '0'),
        leaveCount: String(raw.leaveCount ?? raw.leavecount ?? '0'),
        requiredWorkDays: String(raw.requiredWorkDays ?? raw.requiredworkdays ?? '0'),
        todayTimeInCount: String(raw.todayTimeInCount ?? raw.todaytimeincount ?? '0'),
        todayTimeOutCount: String(raw.todayTimeOutCount ?? raw.todaytimeoutcount ?? '0'),
        todayIsLeave: String(raw.todayIsLeave ?? raw.todayisleave ?? '0'),
        leaveStatus: Number(raw.leaveStatus ?? raw.leavestatus ?? 0),
        lastRecordTypeName: Number(raw.lastRecordTypeName ?? raw.lastrecordtypename ?? 0),
        timeInTime: String(raw.timeInTime ?? raw.timeintime ?? '0'),
        timeOutTime: String(raw.timeOutTime ?? raw.timeouttime ?? '0'),
        key,
    };
}

/** Format date for API calls: yyyyMMdd */
export function formatDateApi(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

/** Get type label for attendance record */
export function getAttendanceTypeLabel(type: number): { label: string; color: string; bg: string } {
    switch (type) {
        case 601:
            return { label: 'Time In', color: '#16a34a', bg: '#f0fdf4' };
        case 602:
            return { label: 'Time Out', color: '#dc2626', bg: '#fef2f2' };
        case 603:
            return { label: 'Activity', color: '#2563eb', bg: '#eff6ff' };
        default:
            return { label: 'Record', color: '#64748b', bg: '#f8fafc' };
    }
}
/**
 * checkCurrentUserAccessToCheckUpperLevelMembers equivalent
 * returns true if access granted, false otherwise.
 */
export async function checkTeamAccess({
    targetUserId,
    currentUserId,
    configData,
    hasHrAccess,
    fetchTeamHierarchy,
    onDenied,
}: {
    targetUserId: string;
    currentUserId: string;
    configData: any;
    hasHrAccess: boolean;
    fetchTeamHierarchy: (userId: string) => Promise<any[] | null>;
    onDenied: (msg: string) => void;
}): Promise<boolean> {
    if (!targetUserId || targetUserId === currentUserId) return true;

    // 1. System Config (teamMemberProfile == 0 means disabled)
    // Matches Flutter: if (configProvider.config?.teamMemberProfile == 0) return false;
    if (configData && configData.teamMemberProfile === 0) {
        onDenied("Access denied by system configuration.");
        return false;
    }

    // 2. HR Access
    // Matches Flutter: if (dashProvider.hasHrAccess) return true;
    if (hasHrAccess) return true;

    // 3. Reporting Officer Check
    // Matches Flutter: checks if current user is in target's senior list as "Reporting Officer"
    try {
        const seniors = await fetchTeamHierarchy(targetUserId);
        if (!seniors) return false;

        const isRO = seniors.some(s =>
            String(s.userid || s.sender_id || '') === currentUserId &&
            String(s.type || '').toLowerCase() === 'reporting officer'
        );

        if (isRO) return true;

        // onDenied("You do not have permission to view this team hierarchy.");
        return false;
    } catch (err) {
        onDenied("Failed to verify access permission.");
        return false;
    }
}
