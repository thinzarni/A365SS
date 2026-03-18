/* ═══════════════════════════════════════════════════════════
   RulesAndRegulationsPage
   Shows a list of folders containing PDF rules.
   ═══════════════════════════════════════════════════════════ */

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Folder, ChevronRight, HardDrive } from 'lucide-react';
import apiClient from '../../lib/api-client';
import { RULES_AND_REGULATIONS_LIST } from '../../config/api-routes';
import styles from './RulesAndRegulationsPage.module.css';
import '../../styles/pages.css';

interface RuleFolder {
    syskey: string;
    code: string;
    description: string;
}

export default function RulesAndRegulationsPage() {
    const navigate = useNavigate();

    const { data: folders = [], isLoading } = useQuery<RuleFolder[]>({
        queryKey: ['rulesAndRegulationsFolders'],
        queryFn: async () => {
            const res = await apiClient.post(RULES_AND_REGULATIONS_LIST, {
                rootsyskey: '0',
                type: 'folder'
            });
            const raw = res.data?.datalist || [];
            if (!Array.isArray(raw)) return [];
            return raw;
        },
    });

    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title">Employee Handbook</h1>
                        <p className="page-header__subtitle">
                            Browse company policies and guidelines
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            {isLoading ? (
                <div className={styles.loadingList}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={styles.skeletonCard} />
                    ))}
                </div>
            ) : folders.length === 0 ? (
                <div className="empty-state">
                    <HardDrive size={64} className="empty-state__icon" />
                    <h3 className="empty-state__title">No Folders</h3>
                    <p className="empty-state__desc">There are no rule folders available at this time.</p>
                </div>
            ) : (
                <div className={styles.folderList}>
                    {folders.map((folder, i) => (
                        <div
                            key={folder.syskey}
                            className={styles.folderCard}
                            style={{ animationDelay: `${i * 50}ms` }}
                            onClick={() => navigate(`/rulesandreg/${folder.syskey}`, { state: { title: folder.code } })}
                        >
                            <div className={styles.folderIconWrapper}>
                                <Folder size={24} className={styles.folderIcon} />
                            </div>
                            <div className={styles.folderInfo}>
                                <h3 className={styles.folderTitle}>{folder.code}</h3>
                            </div>
                            <ChevronRight size={20} className={styles.folderArrow} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
