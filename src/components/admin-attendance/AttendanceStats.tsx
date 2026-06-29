// import React from 'react';
// import { Info } from 'lucide-react';
// import type { AttendanceStatsProps, StatItemProps } from '../../types/admin-attendance';
// import styles from './AttendanceStats.module.css';

// const StatItem: React.FC<StatItemProps> = ({ 
//     label, 
//     count, 
//     color, 
//     isInteractive = true, 
//     isActive = false, 
//     onClick 
// }) => {
//     return (
//         <div 
//             className={`${styles.statItem} ${isInteractive ? styles.interactive : ''} ${isActive ? styles.active : ''}`}
//             onClick={isInteractive && onClick ? onClick : undefined}
//         >
//             <div className={styles.statCount}>{count}</div>
//             <div className={styles.statLabel} style={{ color }}>{label}</div>
//         </div>
//     );
// };

// const CompactStatItem: React.FC<StatItemProps> = ({ 
//     label, 
//     count, 
//     color, 
//     isInteractive = true, 
//     onClick 
// }) => {
//     return (
//         <div 
//             className={`${styles.compactStatItem} ${isInteractive ? styles.interactive : ''}`}
//             onClick={isInteractive && onClick ? onClick : undefined}
//         >
//             <span className={styles.compactStatCount}>{count}</span>
//             <span className={styles.compactStatLabel} style={{ color }}>{label}</span>
//         </div>
//     );
// };

// const AttendanceStats: React.FC<AttendanceStatsProps> = ({ 
//     presentCount, 
//     leaveCount, 
//     absentCount, 
//     lateInCount, 
//     earlyOutCount, 
//     totalCount, 
//     selectedStatus, 
//     onStatusClick, 
//     isInteractive = true 
// }) => {
//     return (
//         <div className={styles.attendanceStats}>
//             {/* Main Statistics Row */}
//             <div className={styles.statsRow}>
//                 <StatItem 
//                     label="Present" 
//                     count={presentCount} 
//                     color="#10b981" 
//                     status="1"
//                     isActive={selectedStatus === '1'}
//                     isInteractive={isInteractive}
//                     onClick={() => isInteractive && onStatusClick('1')}
//                 />
//                 <StatItem 
//                     label="Leave" 
//                     count={leaveCount} 
//                     color="#f97316" 
//                     status="2"
//                     isActive={selectedStatus === '2'}
//                     isInteractive={isInteractive}
//                     onClick={() => isInteractive && onStatusClick('2')}
//                 />
//                 <StatItem 
//                     label="Absent" 
//                     count={absentCount} 
//                     color="#ef4444" 
//                     status="4"
//                     isActive={selectedStatus === '4'}
//                     isInteractive={isInteractive}
//                     onClick={() => isInteractive && onStatusClick('4')}
//                 />
//                 <StatItem 
//                     label="Total" 
//                     count={totalCount} 
//                     color="#6b7280" 
//                     status="0"
//                     isActive={selectedStatus === '0'}
//                     isInteractive={isInteractive}
//                     onClick={() => isInteractive && onStatusClick('0')}
//                 />
//             </div>
            
//             {/* Sub-category Row */}
//             {(lateInCount > 0 || earlyOutCount > 0) && (
//                 <div className={styles.subStatsRow}>
//                     <div className={styles.subStatsContainer}>
//                         <div className={styles.subStatsHeader}>
//                             <Info size={14} />
//                             <span>Present includes:</span>
//                         </div>
//                         <div className={styles.subStatsItems}>
//                             {lateInCount > 0 && (
//                                 <CompactStatItem 
//                                     label="Late In" 
//                                     count={lateInCount} 
//                                     color="#9333ea" 
//                                     status="5"
//                                     isInteractive={isInteractive}
//                                     onClick={() => isInteractive && onStatusClick('5')}
//                                 />
//                             )}
//                             {earlyOutCount > 0 && (
//                                 <CompactStatItem 
//                                     label="Early Out" 
//                                     count={earlyOutCount} 
//                                     color="#9333ea" 
//                                     status="6"
//                                     isInteractive={isInteractive}
//                                     onClick={() => isInteractive && onStatusClick('6')}
//                                 />
//                             )}
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default AttendanceStats;
