import React, { useState } from 'react';
import { ThumbsUp, Heart, Building2, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import type { Post } from '../../types/post';
import { usePostStore } from '../../stores/post-store';
import { useAuthStore } from '../../stores/auth-store';
import ImageGrid from './ImageGrid';
import ReactionPicker from './ReactionPicker';
import EditPostModal from './EditPostModal';
import CommentSection from './CommentSection';
import ConfirmModal from '../ui/ConfirmModal/ConfirmModal';
import Microlink from '@microlink/react';
import styles from './PostCard.module.css';

interface PostCardProps {
    post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const { toggleReaction, deletePost } = usePostStore();
    const { user } = useAuthStore();
    const [imgError, setImgError] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showComments, setShowComments] = useState(false);

    React.useEffect(() => {
        setImgError(false);
    }, [post.syskey, post.user_info]);

    const handleReact = (type: number) => toggleReaction(post.syskey, type);
    const handleUnreact = () => toggleReaction(post.syskey, 0);

    // Date
    const dateStr = new Date(post.created_date).toLocaleString();

    // Check permissions
    const isAuthor = user?.userid === post.user_id || user?.hr_access;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deletePost(post.syskey);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // Author
    const isDomainPost = post.user_info?.user_domain && post.user_info.user_domain !== post.name;
    const authorName = isDomainPost ? post?.user_info?.user_domain : post.name;
    const authorLogo = isDomainPost
        ? `https://iamassetsspace.mitcloud.com/domain/logomain/${post?.user_info?.user_domain}.png`
        : post?.user_info?.profile;

    // Collapsable content
    const [isExpanded, setIsExpanded] = React.useState(false);
    const content = post.content || '';
    const isLongContent = content.length > 150;
    const displayContent = isLongContent && !isExpanded ? `${content.slice(0, 150)}...` : content;

    // URL Extraction for Links and Preview
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);
    const previewUrl = urls ? urls[0] : null;

    const renderTextWithLinks = (text: string) => {
        if (!text) return null;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                        {part}
                    </a>
                );
            }
            return <React.Fragment key={i}>{part}</React.Fragment>;
        });
    };

    return (
        <div className={styles.card}>

            {/* Header */}
            <div className={styles.header}>
                <div className={styles.avatar}>
                    {authorLogo && !imgError ? (
                        <img
                            src={authorLogo}
                            alt="avatar"
                            className={styles.avatarImg}
                            onError={() => setImgError(true)}
                        />
                    ) : isDomainPost ? (
                        /* Organization post — building icon */
                        <div className={styles.avatarOrg}>
                            <Building2 size={22} color="#fff" strokeWidth={1.8} />
                        </div>
                    ) : (
                        /* Personal post — initial letter */
                        <div className={styles.avatarFallback}>
                            {authorName?.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className={styles.authorInfo} style={{ flex: 1 }}>
                    <h3 className={styles.authorName}>{authorName}</h3>
                    <span className={styles.postDate}>{dateStr}</span>
                </div>
                
                {isAuthor && (
                    <div style={{ position: 'relative' }}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-neutral-600)' }}
                        >
                            <MoreHorizontal size={20} />
                        </button>
                        
                        {showMenu && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowMenu(false)} />
                                <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', border: '1px solid var(--color-neutral-200)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '150px', overflow: 'hidden' }}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); setIsEditing(true); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', border: 'none', background: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', borderBottom: '1px solid var(--color-neutral-100)' }}
                                    >
                                        <Edit2 size={16} /> Edit Post
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', border: 'none', background: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', color: '#e53e3e' }}
                                    >
                                        <Trash2 size={16} /> Delete Post
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={styles.content}>
                {renderTextWithLinks(displayContent)}
                {isLongContent && (
                    <span
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ color: '#1877f2', cursor: 'pointer', fontWeight: 600, display: 'block', marginTop: '4px' }}
                    >
                        {isExpanded ? 'See Less' : 'See More'}
                    </span>
                )}
            </div>

            {/* Link Preview */}
            {previewUrl && (!post.files || post.files.length === 0) && (
                <div style={{ padding: '0 16px', marginBottom: '12px' }}>
                    <Microlink 
                        url={previewUrl} 
                        size="normal"
                        style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-neutral-200)', fontFamily: 'var(--font-family, Inter, sans-serif)' }} 
                    />
                </div>
            )}

            {/* Attachments */}
            {post.files && post.files.length > 0 && (
                <div className={styles.attachments}>
                    <ImageGrid images={post.files} maxImages={4} />
                </div>
            )}

            {/* Reaction Overview */}
            {post.likes_count > 0 && (
                <div className={styles.interactionStats}>
                    <div className={styles.reactionOverview}>
                        {/* Show circles for top reactions (max 3 types) */}
                        <div className={styles.reactionCircles}>
                            {(post.reactions ?? [])
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 3)
                                .map(r => {
                                    const ICON_MAP: Record<number, { bg: string; content: React.ReactNode }> = {
                                        1: { bg: '#1877f2', content: <ThumbsUp size={10} color="white" fill="white" strokeWidth={0} /> },
                                        2: { bg: '#f33e58', content: <Heart size={10} color="white" fill="white" strokeWidth={0} /> },
                                        3: { bg: 'transparent', content: <span style={{ fontSize: 14, lineHeight: 1 }}>🥰</span> },
                                        5: { bg: 'transparent', content: <span style={{ fontSize: 14, lineHeight: 1 }}>😮</span> },
                                        6: { bg: 'transparent', content: <span style={{ fontSize: 14, lineHeight: 1 }}>😢</span> },
                                        8: { bg: 'transparent', content: <span style={{ fontSize: 14, lineHeight: 1 }}>🙏</span> },
                                    };
                                    const icon = ICON_MAP[r.reaction_status];
                                    if (!icon) return null;
                                    return (
                                        <span
                                            key={r.reaction_status}
                                            className={styles.reactionCircle}
                                            style={{ background: icon.bg }}
                                        >
                                            {icon.content}
                                        </span>
                                    );
                                })}
                        </div>
                        <span className={styles.reactionCount}>{post.likes_count}</span>
                    </div>
                    <div className={styles.commentCount}>{post.comment_count > 0 ? `${post.comment_count} Comments` : ''}</div>
                </div>
            )}

            {/* Interaction Bar */}
            <hr className={styles.divider} />
            <div className={styles.interactionBar}>
                <ReactionPicker
                    isLiked={post.is_liked}
                    currentReactionType={post.my_reaction_type}
                    onReact={handleReact}
                    onUnreact={handleUnreact}
                />

                <button
                    onClick={() => setShowComments(!showComments)}
                    className={styles.interactionBtn}
                >
                    <span className={styles.icon}>💬</span>
                    Comment
                </button>
            </div>

            {showComments && (
                <CommentSection postId={post.syskey} />
            )}

            {isEditing && (
                <EditPostModal 
                    post={post}
                    onClose={() => setIsEditing(false)}
                />
            )}

            <ConfirmModal
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Post"
                message="Are you sure you want to delete this post? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                loading={isDeleting}
            />
        </div>
    );
};

export default PostCard;
