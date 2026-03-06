import React from 'react';
import { ThumbsUp, Heart, Building2 } from 'lucide-react';
import type { Post } from '../../types/post';
import { usePostStore } from '../../stores/post-store';
import ImageGrid from './ImageGrid';
import ReactionPicker from './ReactionPicker';
import styles from './PostCard.module.css';

interface PostCardProps {
    post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const { toggleReaction } = usePostStore();
    const [imgError, setImgError] = React.useState(false);

    React.useEffect(() => {
        setImgError(false);
    }, [post.syskey, post.user_info]);

    const handleReact = (type: number) => toggleReaction(post.syskey, type);
    const handleUnreact = () => toggleReaction(post.syskey, 0);

    // Date
    const dateStr = new Date(post.created_date).toLocaleString();

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
                <div className={styles.authorInfo}>
                    <h3 className={styles.authorName}>{authorName}</h3>
                    <span className={styles.postDate}>{dateStr}</span>
                </div>
            </div>

            {/* Content */}
            <div className={styles.content}>
                {displayContent}
                {isLongContent && (
                    <span
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ color: '#1877f2', cursor: 'pointer', fontWeight: 600, display: 'block', marginTop: '4px' }}
                    >
                        {isExpanded ? 'See Less' : 'See More'}
                    </span>
                )}
            </div>

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
                    onClick={() => alert("Comments expanding coming in Phase 3")}
                    className={styles.interactionBtn}
                >
                    <span className={styles.icon}>💬</span>
                    Comment
                </button>
            </div>
        </div>
    );
};

export default PostCard;
