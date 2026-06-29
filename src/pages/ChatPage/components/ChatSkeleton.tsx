import React from 'react';
import styles from './ChatSkeleton.module.css';

interface ChatSkeletonProps {
    count?: number;
    fromList?: boolean;
}

export const ChatSkeleton: React.FC<ChatSkeletonProps> = ({ count = 10, fromList = true }) => {
    if (fromList) {
        return (
            <div className={styles.skeletonList}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={styles.listItem}>
                        <div className={`${styles.avatar} ${styles.shimmer}`} />
                        <div className={styles.listText}>
                            <div className={`${styles.title} ${styles.shimmer}`} />
                            <div className={`${styles.subtitle} ${styles.shimmer}`} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={styles.skeletonChat}>
            {Array.from({ length: count }).map((_, i) => {
                const isMe = i % 2 !== 0;
                return (
                    <div key={i} className={`${styles.chatRow} ${isMe ? styles.chatMe : styles.chatOther}`}>
                        {!isMe && <div className={`${styles.avatar} ${styles.shimmer}`} />}
                        <div className={`${styles.chatBubbles} ${isMe ? styles.alignRight : styles.alignLeft}`}>
                            <div className={`${styles.bubbleWide} ${styles.shimmer}`} />
                            <div className={`${styles.bubbleShort} ${styles.shimmer}`} />
                        </div>
                        {isMe && <div className={`${styles.avatar} ${styles.shimmer}`} />}
                    </div>
                );
            })}
        </div>
    );
};
