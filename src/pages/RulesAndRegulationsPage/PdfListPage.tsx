/* ═══════════════════════════════════════════════════════════
   PdfListPage
   Shows a list of PDFs (rules) inside a specific folder.
   ═══════════════════════════════════════════════════════════ */

import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Download, Eye, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api-client';
import { RULES_AND_REGULATIONS_LIST, RULES_AND_REGULATIONS_DETAIL } from '../../config/api-routes';
import styles from './RulesAndRegulationsPage.module.css';
import '../../styles/pages.css';
import React from 'react';

interface SearchUserData {
    eid?: string;
    name?: string;
    profile?: string;
}

interface PdfDocument {
    syskey: string;
    code: string;
    description: string;
    attachment?: string;
    viewerlist?: SearchUserData[];
}

export default function PdfListPage() {
    const { id } = useParams<{ id: string }>(); // Folder syskey
    const location = useLocation();
    const navigate = useNavigate();
    const folderName = (location.state as { title?: string })?.title || 'Documents';
    const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

    const { data: documents = [], isLoading } = useQuery<PdfDocument[]>({
        queryKey: ['rulesAndRegulationsDocs', id],
        queryFn: async () => {
            if (!id) return [];
            const res = await apiClient.post(RULES_AND_REGULATIONS_LIST, {
                rootsyskey: id,
                type: 'document'
            });
            const raw = res.data?.datalist || [];
            if (!Array.isArray(raw)) return [];
            return raw;
        },
        enabled: !!id,
    });

    const fetchDocumentUrl = async (syskey: string): Promise<string | null> => {
        try {
            setDownloadingId(syskey);
            const res = await apiClient.get(`${RULES_AND_REGULATIONS_DETAIL}/${syskey}`);

            // The API returns statuscode 300 for success on this endpoint
            if ((res.data?.statuscode === 200 || res.data?.statuscode === 300) && res.data?.signedURL) {
                return res.data.signedURL;
            }

            console.error('Unexpected API response:', res.data);
            return null;
        } catch (error) {
            console.error('Failed to fetch document URL:', error);
            return null;
        } finally {
            setDownloadingId(null);
        }
    };

    const handleView = async (e: React.MouseEvent, pdf: PdfDocument) => {
        e.stopPropagation();

        const url = await fetchDocumentUrl(pdf.syskey);
        if (url) {
            window.open(url, '_blank');
        } else {
            toast.error('Failed to open document. URL not available.');
        }
    };

    const handleDownload = async (e: React.MouseEvent, pdf: PdfDocument) => {
        e.stopPropagation();

        const url = await fetchDocumentUrl(pdf.syskey);
        if (url) {
            try {
                // Fetch the PDF blob to force download instead of browser opening it
                const response = await fetch(url);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${pdf.code}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Clean up the object URL after a short delay
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            } catch (error) {
                console.error("Download failed:", error);
                toast.error('Failed to download document from server.');
            }
        } else {
            toast.error('Failed to download document. URL not available.');
        }
    };

    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <button className={styles.backButton} onClick={() => navigate('/rulesandreg')}>
                        <ArrowLeft size={16} />
                        Back to Folders
                    </button>
                    <h1 className="page-header__title">{folderName}</h1>
                </div>
            </div >

            {/* ── Content ── */}
            {
                isLoading ? (
                    <div className={styles.loadingList}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={styles.skeletonCard} />
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={64} className="empty-state__icon" />
                        <h3 className="empty-state__title">No PDFs</h3>
                        <p className="empty-state__desc">There are no documents in this folder.</p>
                    </div>
                ) : (
                    <div className={styles.folderList}>
                        {documents.map((pdf, i) => {
                            const viewers = pdf.viewerlist || [];
                            const displayViewers = viewers.slice(0, 3);
                            const hasMore = viewers.length > 3;

                            return (
                                <div
                                    key={pdf.syskey}
                                    className={styles.pdfCard}
                                    style={{ animationDelay: `${i * 50}ms`, cursor: 'default' }}
                                >
                                    <div className={styles.pdfIconWrapper}>
                                        <FileText size={24} className={styles.pdfIcon} />
                                    </div>
                                    <div className={styles.pdfInfo}>
                                        <h3 className={styles.pdfTitle}>{pdf.code}</h3>

                                        {/* Viewers Row */}
                                        <div className={styles.viewersRow}>
                                            <span className={styles.viewersLabel}>
                                                <Eye size={12} />
                                                {viewers.length > 0 ? '' : 'No viewers yet'}
                                            </span>
                                            {viewers.length > 0 && (
                                                <div className={styles.avatarStack}>
                                                    {displayViewers.map((v, idx) => (
                                                        v.profile ? (
                                                            <img
                                                                key={idx}
                                                                src={v.profile}
                                                                className={styles.viewerAvatar}
                                                                alt={v.name}
                                                                onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>' }}
                                                            />
                                                        ) : (
                                                            <span key={idx} className={styles.viewerAvatar}>
                                                                {v.name?.charAt(0) || '?'}
                                                            </span>
                                                        )
                                                    ))}
                                                    {hasMore && (
                                                        <span className={styles.moreAvatar} title={`${viewers.length - 3} more`}>
                                                            +{viewers.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {pdf.syskey === downloadingId ? (
                                        <div className={styles.cardActions} style={{ paddingRight: '16px' }}>
                                            <Loader2 size={24} className="animate-spin text-[var(--primary-accent)]" />
                                        </div>
                                    ) : (
                                        <div className={styles.cardActions}>
                                            <button
                                                className={`${styles.actionBtn} ${styles.viewBtn}`}
                                                onClick={(e) => handleView(e, pdf)}
                                                title="View Document"
                                                disabled={!!downloadingId}
                                            >
                                                <Eye size={20} />
                                            </button>
                                            <button
                                                className={`${styles.actionBtn} ${styles.downloadBtn}`}
                                                onClick={(e) => handleDownload(e, pdf)}
                                                title="Download Document"
                                                disabled={!!downloadingId}
                                            >
                                                <Download size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            }
        </div >
    );
}
