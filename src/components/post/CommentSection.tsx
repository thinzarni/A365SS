import React, { useEffect, useState } from 'react';
import { usePostStore } from '../../stores/post-store';
import { useAuthStore } from '../../stores/auth-store';
import { Send, CornerDownRight } from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal/ConfirmModal';
import styles from './CommentSection.module.css';
import type { Comment } from '../../types/post';

interface CommentSectionProps {
    postId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
    const { posts, fetchComments, fetchReplies, createComment, deleteComment } = usePostStore();
    const { user } = useAuthStore();
    const post = posts.find(p => p.syskey === postId);
    const allComments = Array.isArray(post?.comments) ? post.comments : [];

    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    
    // Shared delete state
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter to top-level comments natively
    const topLevelComments = allComments.filter(c => !c.parent_comment_id);

    useEffect(() => {
        const load = async () => {
            setIsFetching(true);
            await fetchComments(postId, 1);
            setIsFetching(false);
        };
        load();
    }, [postId, fetchComments]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const success = await createComment(postId, content.trim());
        if (success) {
            setContent('');
        }
        setIsSubmitting(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleDeleteClick = (commentId: string) => {
        setCommentToDelete(commentId);
    };

    const confirmDelete = async () => {
        if (!commentToDelete) return;
        setIsDeleting(true);
        try {
            await deleteComment(postId, commentToDelete);
        } finally {
            setIsDeleting(false);
            setCommentToDelete(null);
        }
    };

    const formatTimestamp = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // Recursive component to render a single comment and its replies
    const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => {
        const isAuthor = comment.userid === user?.userid || comment.user_id === user?.userid;
        const initial = (comment.username || comment.user?.name || '?').charAt(0).toUpperCase();
        const avatarSrc = comment.profile || comment.user?.image;
        
        const replies = allComments.filter(c => c.parent_comment_id === comment.syskey);
        const hasReplies = (comment.total_child_comments || 0) > 0 || replies.length > 0;

        const [isReplying, setIsReplying] = useState(false);
        const [replyContent, setReplyContent] = useState('');
        const [isSubmittingReply, setIsSubmittingReply] = useState(false);
        const [showReplies, setShowReplies] = useState(false);
        const [isLoadingReplies, setIsLoadingReplies] = useState(false);

        const toggleReplies = async () => {
            if (!showReplies && replies.length === 0 && comment.total_child_comments) {
                setIsLoadingReplies(true);
                await fetchReplies(postId, comment.syskey);
                setIsLoadingReplies(false);
            }
            setShowReplies(!showReplies);
        };

        const handleReplySubmit = async () => {
            if (!replyContent.trim() || isSubmittingReply) return;
            setIsSubmittingReply(true);
            const success = await createComment(postId, replyContent.trim(), comment.syskey);
            if (success) {
                setReplyContent('');
                setIsReplying(false);
                setShowReplies(true); // Always expand to show the fresh reply
            }
            setIsSubmittingReply(false);
        };

        const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleReplySubmit();
            }
        };

        return (
            <div className={styles.commentItem}>
                {avatarSrc ? (
                    <img src={avatarSrc} alt="avatar" className={depth > 0 ? styles.avatarReply : styles.avatar} />
                ) : (
                    <div className={depth > 0 ? styles.avatarFallbackReply : styles.avatarFallback}>{initial}</div>
                )}
                
                <div className={styles.contentWrapper}>
                    <div className={styles.bubble}>
                        <div className={styles.bubbleHeader}>
                            <span className={styles.authorName}>
                                {comment.username || comment.user?.name || 'Unknown User'}
                            </span>
                        </div>
                        <div className={styles.commentText}>
                            {comment.comment}
                        </div>
                    </div>
                    
                    <div className={styles.metaRow}>
                        <span className={styles.timestamp}>
                            {formatTimestamp(comment.createddate)}
                        </span>
                        
                        {/* Only allow replying up to max depth of 1 to keep UI clean, or allow infinite */}
                        {depth < 1 && (
                            <button 
                                className={styles.actionBtn}
                                onClick={() => setIsReplying(!isReplying)}
                            >
                                Reply
                            </button>
                        )}

                        {isAuthor && (
                            <button 
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                onClick={() => handleDeleteClick(comment.syskey)}
                            >
                                Delete
                            </button>
                        )}
                    </div>

                    {/* View Replies Toggle */}
                    {hasReplies && depth < 1 && (
                        <button className={styles.toggleReplies} onClick={toggleReplies}>
                            <CornerDownRight size={14} /> 
                            {showReplies ? "Hide replies" : `View ${comment.total_child_comments || replies.length} replies`}
                        </button>
                    )}

                    {/* Reply Input Box */}
                    {isReplying && (
                        <div className={styles.replyInputWrapper}>
                            <textarea
                                className={styles.replyInput}
                                placeholder="Write a reply..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                onKeyDown={handleReplyKeyDown}
                                disabled={isSubmittingReply}
                                rows={1}
                                autoFocus
                            />
                            <button 
                                className={styles.replySendBtn}
                                onClick={handleReplySubmit}
                                disabled={!replyContent.trim() || isSubmittingReply}
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    )}

                    {/* Nested Replies List */}
                    {showReplies && (
                        <div className={styles.replyList}>
                            {isLoadingReplies && replies.length === 0 ? (
                                <span className={styles.timestamp}>Loading...</span>
                            ) : (
                                replies.map(reply => (
                                    <CommentItem key={reply.syskey} comment={reply} depth={depth + 1} />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.commentList}>
                {isFetching && topLevelComments.length === 0 ? (
                    <div className={styles.emptyState}>Loading comments...</div>
                ) : topLevelComments.length === 0 ? (
                    <div className={styles.emptyState}>No comments yet. Be the first to start the discussion!</div>
                ) : (
                    topLevelComments.map(comment => (
                        <CommentItem key={comment.syskey} comment={comment} />
                    ))
                )}
            </div>

            <div className={styles.inputWrapper}>
                <textarea
                    className={styles.input}
                    placeholder="Write a comment..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    rows={1}
                />
                <button 
                    className={styles.sendBtn}
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                >
                    <Send size={18} />
                </button>
            </div>

            <ConfirmModal
                open={!!commentToDelete}
                onClose={() => !isDeleting && setCommentToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Comment"
                message="Are you sure you want to delete this comment? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                loading={isDeleting}
            />
        </div>
    );
};

export default CommentSection;
