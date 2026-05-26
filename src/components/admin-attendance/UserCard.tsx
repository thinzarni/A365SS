import React from 'react';
import { ChevronRight, Clock, FileText, MapPin } from 'lucide-react';
import type { UserCardProps } from '../../types/admin-attendance';
import { STATUS_COLORS } from '../../types/admin-attendance';
import styles from './UserCard.module.css';

const UserCard: React.FC<UserCardProps> = ({ user, onCardTap }) => {
    const getStatusColor = (status: string) => {
        return STATUS_COLORS[status] || '#6b7280';
    };

    const statusColor = getStatusColor(user.status);

    // Use API field names - fallback to component expected names
    // Comprehensive safety checks for avatar URL
    const isValidImageUrl = (url: string | undefined): boolean => {
        if (!url || typeof url !== 'string') return false;
        
        const trimmedUrl = url.trim();
        if (trimmedUrl === '') return false;
        
        // Check for common invalid patterns
        if (trimmedUrl === 'null' || trimmedUrl === 'undefined' || trimmedUrl === '0') return false;
        
        // Check if it's a valid HTTP/HTTPS URL
        try {
            const urlObj = new URL(trimmedUrl);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const avatar = isValidImageUrl(user.profile) ? user.profile : 
                   isValidImageUrl(user.signedURL) ? user.signedURL : 
                   null;
    const employeeId = user.employeeId || user.eid;
    const checkInTime = user.checkInTime || user.timeintime;
    const checkOutTime = user.checkOutTime || user.timeouttime;
    const leaveDateRange = user.range || user.leaveDateRange;

    // Format leave date range for better UX
    const formatLeaveDateRange = (dateRange: string | null | undefined): string => {
        if (!dateRange) return '';
        
        try {
            const [startDate, endDate] = dateRange.split(',');
            if (startDate && endDate) {
                const start = new Date(startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
                const end = new Date(endDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
                
                const formatDate = (date: Date) => {
                    return date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                    });
                };
                
                // If start and end dates are the same, show only one date
                if (formatDate(start) === formatDate(end)) {
                    return formatDate(start);
                }
                
                return `${formatDate(start)} - ${formatDate(end)}`;
            }
        } catch {
            return dateRange || '';
        }
        
        return dateRange || '';
    };

    // Format duration for better UX
    const formatDuration = (duration: string | null | undefined): string => {
        if (!duration) return '';
        
        const numDuration = parseFloat(duration);
        if (isNaN(numDuration)) return duration || '';
        
        // Handle partial days (0.5 = half day, 0.25 = quarter day, etc.)
        if (numDuration < 1) {
            if (numDuration === 0.5) return '0.5 day (half day)';
            if (numDuration === 0.25) return '0.25 day (quarter day)';
            return `${Math.round(numDuration * 24)} hours`;
        }
        
        if (numDuration === 1) return '1 day';
        return `${numDuration} days`;
    };

    return (
        <div className={styles.userCard} onClick={() => onCardTap?.(user)}>
            <div className={styles.userAvatarContainer}>
                {avatar ? (
                    <img 
                        src={avatar} 
                        alt={user.name}
                        className={styles.userAvatar}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Hide the broken image and show initials instead
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = `${styles.userAvatar} ${styles.avatarFallback}`;
                                fallback.textContent = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
                                parent.appendChild(fallback);
                            }
                        }}
                    />
                ) : (
                    <div className={`${styles.userAvatar} ${styles.avatarFallback}`}>
                        {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                    </div>
                )}
                {user.status !== '0' && (
                    <div 
                        className={`${styles.statusDot} ${styles[`status-${user.status}`]}`}
                        style={{ backgroundColor: statusColor }}
                    />
                )}
            </div>
            
            <div className={styles.userInfo}>
                <div className={styles.userHeader}>
                    <h3 className={styles.userName}>{user.name}</h3>
                    <span className={styles.employeeId}>{employeeId}</span>
                </div>
                
                <div className={styles.userDetails}>
                    <span className={styles.userId}>{user.userid}</span>
                    
                    {/* Leave Information */}
                    {user.status === '2' && (leaveDateRange || user.range) && (
                        <div className={styles.leaveInfo}>
                            <div className={styles.leaveInfoRow}>
                                <Clock size={12} className={styles.infoIcon} />
                                <span>{formatLeaveDateRange(leaveDateRange || user.range)}</span>
                            </div>
                            {user.duration && (
                                <div className={styles.leaveInfoRow}>
                                    <FileText size={12} className={styles.infoIcon} />
                                    <span>{formatDuration(user.duration)}</span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Time Information */}
                    {(user.status === '1' || user.status === '3' || user.status === '5') && (
                        <div className={styles.timeInfo}>
                            {checkInTime && checkInTime !== 'null' && checkInTime !== null && (
                                <div className={styles.timeRow}>
                                    <Clock size={12} className={styles.infoIcon} />
                                    <span>In: {checkInTime}</span>
                                    {user.timeinoffset && user.timeinoffset !== 'null' && (
                                        <span className={styles.timeOffset}>{user.timeinoffset}</span>
                                    )}
                                </div>
                            )}
                            {checkOutTime && checkOutTime !== 'null' && checkOutTime !== null && (
                                <div className={styles.timeRow}>
                                    <Clock size={12} className={styles.infoIcon} />
                                    <span>Out: {checkOutTime}</span>
                                    {user.timeoutoffset && user.timeoutoffset !== 'null' && (
                                        <span className={styles.timeOffset}>{user.timeoutoffset}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Location Information */}
                    {user.location && (
                        <div className={styles.locationInfo}>
                            <MapPin size={12} className={styles.infoIcon} />
                            <span>{user.location}</span>
                        </div>
                    )}
                </div>
            </div>
            
            <ChevronRight size={18} className={styles.chevronIcon} />
        </div>
    );
};

export default UserCard;
