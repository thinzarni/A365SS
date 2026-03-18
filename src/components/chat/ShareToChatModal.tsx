import { useState, useEffect, useRef } from 'react';
import { Search, X, Send, CheckCircle2, Forward } from 'lucide-react';
import { useChatStore } from '../../stores/chat-store';
import { useAuthStore } from '../../stores/auth-store';
import chatClient from '../../lib/chat-client';
import * as routes from '../../config/api-routes';
import styles from './ShareToChatModal.module.css';

interface Props {
    shareText: string;
    onClose: () => void;
}

function getInitials(name: string) {
    return (name || '?').charAt(0).toUpperCase();
}

export function ShareToChatModal({ shareText, onClose }: Props) {
    const { conversations, fetchConversations } = useChatStore();
    const { userId, domain, user } = useAuthStore();
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState(false);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (conversations.length === 0) fetchConversations();
        setTimeout(() => searchRef.current?.focus(), 100);
    }, [conversations.length, fetchConversations]);

    // Close on backdrop click
    const handleBackdrop = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const filtered = conversations.filter(c => {
        const name = (c.group_name || c.opposite_user_name || c.name || '').toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const handleShare = async (conv: typeof conversations[0]) => {
        if (sending) return;
        setSending(true);
        try {
            const typeTitle = shareText.split('\n')[0].trim();
            const forwardedContent = `🔁 Shared from ${typeTitle}\n\n${shareText}`;
            const username = user?.name || userId || '';
            const teamname = conv.group_name || '';

            const payload = {
                conversation_id: conv.syskey,
                sender_id: userId || '',
                content: forwardedContent,
                content_type: 'text',
                username,
                teamname,
                domain: domain || 'demouat',
            };

            await chatClient.post(routes.CHAT_SEND_MSG, payload);
            setSentTo(conv.syskey);

            // Auto close after brief success flash
            setTimeout(() => onClose(), 800);
        } catch (err) {
            console.error('[ShareToChatModal] send failed:', err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdrop}>
            <div className={styles.sheet}>
                {/* Handle */}
                <div className={styles.handle} />

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerIcon}><Forward size={20} /></div>
                    <div className={styles.headerText}>
                        <span className={styles.headerTitle}>Share to Chat</span>
                        <span className={styles.headerSub}>Send this record to a conversation</span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                </div>

                {/* Search */}
                <div className={styles.searchBox}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search conversations..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                    {search && (
                        <button className={styles.clearBtn} onClick={() => setSearch('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Preview */}
                <div className={styles.preview}>
                    <div className={styles.previewText}>{shareText}</div>
                </div>

                <div className={styles.divider} />

                {/* Conversation list */}
                <div className={styles.convList}>
                    {filtered.length === 0 ? (
                        <div className={styles.empty}>No conversations found</div>
                    ) : (
                        filtered.map(conv => {
                            const displayName = conv.group_name || conv.opposite_user_name || conv.name || 'Unknown';
                            const isSent = sentTo === conv.syskey;

                            return (
                                <div key={conv.syskey} className={styles.convItem}>
                                    <div className={styles.convAvatar}>
                                        {conv.image ? (
                                            <img src={conv.image} alt="" className={styles.convAvatarImg} />
                                        ) : (
                                            getInitials(displayName)
                                        )}
                                    </div>
                                    <div className={styles.convName}>{displayName}</div>
                                    <button
                                        className={`${styles.sendBtn} ${isSent ? styles.sentBtn : ''}`}
                                        onClick={() => handleShare(conv)}
                                        disabled={sending || !!sentTo}
                                        title="Send"
                                    >
                                        {isSent ? (
                                            <><CheckCircle2 size={13} /> Sent</>
                                        ) : (
                                            <><Send size={13} /> Send</>
                                        )}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
