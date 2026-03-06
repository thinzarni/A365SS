import React, { useRef, useState } from 'react';
import { usePostStore } from '../../stores/post-store';
import { useAuthStore } from '../../stores/auth-store';
import styles from './CreatePostModal.module.css';

interface CreatePostModalProps {
    onClose: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose }) => {
    const { createPost, isCreating } = usePostStore();
    const { user } = useAuthStore();

    const [text, setText] = useState('');
    const [imagePreviews, setImagePreviews] = useState<{ url: string; file: File }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            setImagePreviews(prev => [...prev, { url, file }]);
        });
        // Reset input so re-selecting same file works
        e.target.value = '';
    };

    const handleRemoveImage = (idx: number) => {
        setImagePreviews(prev => {
            URL.revokeObjectURL(prev[idx].url);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const handleSubmit = async () => {
        if (!text.trim() && imagePreviews.length === 0) return;

        // Convert images to base64
        const imagePayloads = await Promise.all(
            imagePreviews.map(({ file }) =>
                new Promise<{ caption: string; data: string }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve({ caption: file.name, data: base64 });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                })
            )
        );

        const success = await createPost({
            user_id: user?.userid || '',
            name: user?.name || '',
            content: text.trim(),
            post_type: 'general',
            domain: '',
            images: imagePayloads,
        });

        if (success) {
            onClose();
        }
    };

    const canPost = (text.trim().length > 0 || imagePreviews.length > 0) && !isCreating;
    const initial = user?.name?.charAt(0).toUpperCase() || '?';

    return (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Create Post</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Author */}
                <div className={styles.authorRow}>
                    <div className={styles.avatar}>
                        {user?.photo
                            ? <img src={user.photo} alt="avatar" />
                            : initial
                        }
                    </div>
                    <span className={styles.authorName}>{user?.name || 'You'}</span>
                </div>

                {/* Textarea */}
                <textarea
                    className={styles.textarea}
                    placeholder="What's on your mind?"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    autoFocus
                />

                {/* Image previews */}
                {imagePreviews.length > 0 && (
                    <div className={styles.imagePreviews}>
                        {imagePreviews.map((img, idx) => (
                            <div key={idx} className={styles.previewContainer}>
                                <img src={img.url} className={styles.previewImg} alt={`preview-${idx}`} />
                                <button className={styles.removeImgBtn} onClick={() => handleRemoveImage(idx)}>✕</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.addImgBtn} onClick={() => fileInputRef.current?.click()}>
                        🖼️ Photo
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={!canPost}
                    >
                        {isCreating ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePostModal;
