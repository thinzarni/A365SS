import React, { useEffect, useState } from 'react';
import { usePostStore } from '../../stores/post-store';
import { useAuthStore } from '../../stores/auth-store';
import PostCard from '../../components/post/PostCard';
import CreatePostModal from '../../components/post/CreatePostModal';
import { Image as ImageIcon } from 'lucide-react';
import styles from './FeedPage.module.css';

const FeedPage: React.FC = () => {
    const { posts, isLoading, fetchPosts } = usePostStore();
    const { user } = useAuthStore();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchPosts(1);
    }, [fetchPosts]);

    return (
        <div className={styles.feedWrapper}>
            <div className={styles.container}>

                {/* Create Post Box */}
                <div className={styles.createPostBox}>
                    <div className={styles.createPostInputRow}>
                        <img
                            src={user?.photo || '/favicon.png'}
                            alt="avatar"
                            className={styles.createPostAvatar}
                        />
                        <input
                            type="text"
                            placeholder="What's on your mind?"
                            className={styles.createPostInput}
                            onClick={() => setShowModal(true)}
                            readOnly
                        />
                    </div>
                    <div className={styles.createPostActions}>
                        <button className={styles.createPostActionBtn} onClick={() => setShowModal(true)}>
                            <ImageIcon size={20} color="#10b981" /> Photo/Video
                        </button>
                    </div>
                </div>

                {/* Posts */}
                {isLoading && posts.length === 0 ? (
                    <div className={styles.loadingSpinner}>Loading posts...</div>
                ) : (
                    <div className={styles.feedList}>
                        {posts.map(post => (
                            <PostCard key={post.syskey} post={post} />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Post Modal */}
            {showModal && (
                <CreatePostModal onClose={() => setShowModal(false)} />
            )}
        </div>
    );
};

export default FeedPage;
