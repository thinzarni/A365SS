import React, { useRef, useState } from 'react';
import { usePostStore } from '../../stores/post-store';
import { Building2, X } from 'lucide-react';
import type { Post } from '../../types/post';
import styles from './CreatePostModal.module.css';

interface EditPostModalProps {
    post: Post;
    onClose: () => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({ post, onClose }) => {
    const { editPost } = usePostStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [text, setText] = useState(post.content || '');

    // Existing images from the API
    const [existingImages, setExistingImages] = useState<any[]>(post.files || []);

    // New images added by the user
    const [newImagePreviews, setNewImagePreviews] = useState<{ url: string; file: File }[]>([]);

    const [orgImgError, setOrgImgError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Is this an organization post?
    const isDomainPost = post.user_info?.user_domain && post.user_info.user_domain !== post.name;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            setNewImagePreviews(prev => [...prev, { url, file }]);
        });
        e.target.value = '';
    };

    const handleRemoveNewImage = (idx: number) => {
        setNewImagePreviews(prev => {
            URL.revokeObjectURL(prev[idx].url);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const handleRemoveExistingImage = (idx: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async () => {
        if (!text.trim() && existingImages.length === 0 && newImagePreviews.length === 0) return;

        setIsSubmitting(true);

        try {
            // Process existing images to matching payload format
            const existingImagePayloads = existingImages.map(img => ({
                image_id: img.image_id || img.syskey || img.img_id || '',
                caption: img.caption || img.image_title || ''
            }));

            // Process new images to base64
            const newImagePayloads = await Promise.all(
                newImagePreviews.map(({ file }) =>
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

            const success = await editPost({
                messageid: post.syskey,
                content: text.trim(),
                image: [...existingImagePayloads, ...newImagePayloads],
                file: [] // ignoring files for now as mobile does
            });

            if (success) {
                onClose();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const canPost = (text.trim().length > 0 || existingImages.length > 0 || newImagePreviews.length > 0) && !isSubmitting;

    const authorName = isDomainPost ? post?.user_info?.user_domain : post.name;
    const authorLogo = isDomainPost
        ? `https://iamassetsspace.mitcloud.com/domain/logomain/${post?.user_info?.user_domain}.png`
        : post?.user_info?.profile;
    const initial = authorName?.charAt(0).toUpperCase() || '?';

    return (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Edit Post</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} color="var(--color-neutral-800)" />
                    </button>
                </div>

                {/* Author */}
                <div className={styles.authorRow}>
                    <div className={styles.avatar}>
                        {authorLogo && !orgImgError ? (
                            <img src={authorLogo} alt="avatar" onError={() => setOrgImgError(true)} />
                        ) : isDomainPost ? (
                            <div className={styles.avatarOrg}>
                                <Building2 size={22} color="#fff" strokeWidth={1.8} />
                            </div>
                        ) : (
                            <div className={styles.avatarFallback} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                                {initial}
                            </div>
                        )}
                    </div>
                    <div>
                        <span className={styles.authorName}>
                            {authorName}
                        </span>
                        <div className={styles.privacyDropdown} style={{ cursor: 'default' }}>
                            <span>{isDomainPost ? 'Organization' : 'Personal'}</span>
                        </div>
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
                {(existingImages.length > 0 || newImagePreviews.length > 0) && (
                    <div className={styles.imagePreviews}>
                        {existingImages.map((img, idx) => (
                            <div key={`existing-${idx}`} className={styles.previewContainer}>
                                <img src={img.img_url || img.image_url} className={styles.previewImg} alt={`preview-existing-${idx}`} />
                                <button className={styles.removeImgBtn} onClick={() => handleRemoveExistingImage(idx)}>
                                    <X size={14} color="white" />
                                </button>
                            </div>
                        ))}
                        {newImagePreviews.map((img, idx) => (
                            <div key={`new-${idx}`} className={styles.previewContainer}>
                                <img src={img.url} className={styles.previewImg} alt={`preview-new-${idx}`} />
                                <button className={styles.removeImgBtn} onClick={() => handleRemoveNewImage(idx)}>
                                    <X size={14} color="white" />
                                </button>
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
                        {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditPostModal;
