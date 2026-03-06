import React, { useRef, useState, useEffect } from 'react';
import { ThumbsUp, Heart } from 'lucide-react';
import { PostReactionType } from '../../types/post';
import styles from './ReactionPicker.module.css';

// Exact order from Flutter's PostReactionType enum
const REACTIONS = [
    { type: PostReactionType.LIKE, label: 'Like', color: '#1877f2', isIcon: true, iconType: 'like' },
    { type: PostReactionType.HEART, label: 'Heart', color: '#f33e58', isIcon: true, iconType: 'heart' },
    { type: PostReactionType.CARE, label: 'Care', color: '#f7b125', isIcon: false, emoji: '🥰' },
    { type: PostReactionType.THANK_YOU, label: 'Thank You', color: '#1877f2', isIcon: false, emoji: '🙏' },
    { type: PostReactionType.WOW, label: 'Wow', color: '#f7b125', isIcon: false, emoji: '😮' },
    { type: PostReactionType.SAD, label: 'Sad', color: '#5b94d2', isIcon: false, emoji: '😢' },
] as const;

type Reaction = typeof REACTIONS[number];

interface ReactionPickerProps {
    isLiked: boolean;
    currentReactionType?: number;
    onReact: (type: number) => void;
    onUnreact: () => void;
}

// Facebook-style colored circle with white icon
const ReactionCircle: React.FC<{ size?: number; bgColor: string; iconType: string }> = ({ size = 34, bgColor, iconType }) => (
    <span
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            borderRadius: '50%',
            background: bgColor,
            flexShrink: 0,
        }}
    >
        {iconType === 'like'
            ? <ThumbsUp size={size * 0.55} color="white" fill="white" strokeWidth={0} />
            : <Heart size={size * 0.55} color="white" fill="white" strokeWidth={0} />
        }
    </span>
);

const ReactionPicker: React.FC<ReactionPickerProps> = ({
    isLiked, currentReactionType, onReact, onUnreact,
}) => {
    const [bubbleVisible, setBubbleVisible] = useState(false);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const activeReaction: Reaction = REACTIONS.find(r => r.type === currentReactionType) ?? REACTIONS[0];

    useEffect(() => {
        if (!bubbleVisible) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setBubbleVisible(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [bubbleVisible]);

    const showBubble = (delay: number) => { holdTimerRef.current = setTimeout(() => setBubbleVisible(true), delay); };
    const cancelBubble = () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); };

    const handleTriggerClick = () => {
        setBubbleVisible(false);
        cancelBubble();
        isLiked ? onUnreact() : onReact(PostReactionType.LIKE);
    };

    const handleSelect = (type: number) => {
        setBubbleVisible(false);
        (isLiked && currentReactionType === type) ? onUnreact() : onReact(type);
    };

    return (
        <div className={styles.pickerWrapper} ref={wrapperRef}>

            {/* Floating emoji/icon bubble */}
            <div className={`${styles.bubble} ${bubbleVisible ? styles.visible : ''}`}>
                {REACTIONS.map(r => (
                    <button
                        key={r.type}
                        className={styles.reactionBtn}
                        onClick={() => handleSelect(r.type)}
                    >
                        {r.isIcon
                            ? <ReactionCircle size={38} bgColor={r.color} iconType={r.iconType} />
                            : <span className={styles.reactionEmoji}>{r.emoji}</span>
                        }
                        <span className={styles.tooltip}>{r.label}</span>
                    </button>
                ))}
            </div>

            {/* Trigger button */}
            <button
                className={`${styles.triggerBtn} ${isLiked ? styles.active : ''}`}
                style={isLiked ? { color: activeReaction.color } : {}}
                onMouseEnter={() => showBubble(400)}
                onMouseLeave={cancelBubble}
                onClick={handleTriggerClick}
                onTouchStart={() => showBubble(500)}
                onTouchEnd={cancelBubble}
            >
                {/* Show circle icon for Like/Heart, emoji for others, gray thumb when not reacted */}
                {!isLiked ? (
                    <span className={styles.triggerIconWrap}>
                        <ThumbsUp size={16} color="#65676b" fill="#65676b" strokeWidth={0} />
                    </span>
                ) : activeReaction.isIcon ? (
                    <ReactionCircle size={22} bgColor={activeReaction.color} iconType={activeReaction.iconType} />
                ) : (
                    <span className={styles.triggerEmoji}>{activeReaction.emoji}</span>
                )}
                <span>{isLiked ? activeReaction.label : 'Like'}</span>
            </button>
        </div>
    );
};

export default ReactionPicker;
