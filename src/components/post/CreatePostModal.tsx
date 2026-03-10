import React, { useRef, useState } from 'react';
import { usePostStore } from '../../stores/post-store';
import { useAuthStore } from '../../stores/auth-store';
import { Building2 } from 'lucide-react';
import styles from './CreatePostModal.module.css';

interface CreatePostModalProps {
    onClose: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose }) => {
    const { createPost, isCreating } = usePostStore();
    const { user } = useAuthStore();

    const [text, setText] = useState('');
    const [imagePreviews, setImagePreviews] = useState<{ url: string; file: File }[]>([]);
    const [isPersonal, setIsPersonal] = useState(true);
    const [orgImgError, setOrgImgError] = useState(false);
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
        // If posting as personal, targetType is empty, user_domain is ''
        // If posting as org, targetType might just be the org syskey or empty array (using mobile default for now: all=empty array)
        const targetType = user?.paycompanysyskey != null ? [user.paycompanysyskey] : [];
        const userDomain = isPersonal ? '' : (user?.domainName || '');

        const success = await createPost({
            userid: user?.userid || '',
            content: text.trim(),
            domain: '',
            content_type: targetType,
            user_domain: userDomain,
            image: imagePayloads,
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
                        {isPersonal ? (
                            user?.photo
                                ? <img src={user.photo} alt="avatar" />
                                : initial
                        ) : (
                            !orgImgError ? (
                                <img
                                    src={`https://iamassetsspace.mitcloud.com/domain/logomain/${user?.domainName || user?.domain || ''}.png`}
                                    alt="org-avatar"
                                    onError={() => setOrgImgError(true)}
                                />
                            ) : (
                                <div className={styles.avatarOrg}>
                                    <Building2 size={22} color="#fff" strokeWidth={1.8} />
                                </div>
                            )
                        )}
                    </div>
                    <div>
                        <span className={styles.authorName}>
                            {isPersonal ? (user?.name || 'You') : (user?.domainName || user?.domain || 'Organization')}
                        </span>
                        {/* Privacy / Post As Selector */}
                        {user?.hr_access && (
                            <div className={styles.privacyDropdown} onClick={() => setIsPersonal(!isPersonal)}>
                                <span>{isPersonal ? 'Personal' : 'Organization'}</span>
                                <span className={styles.dropdownIcon}>▼</span>
                            </div>
                        )}
                    </div>
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
