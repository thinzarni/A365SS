import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ImageGrid.module.css';

interface ImageGridProps {
    images: any[];
    maxImages?: number; // default 4
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, maxImages = 4 }) => {
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
    const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

    // Filter out invalid images safely
    const validImages = images.filter((img, index) =>
        img && img.img_url && !brokenImages.has(index)
    );

    if (validImages.length === 0) return null;

    const imagesToShow = validImages.slice(0, maxImages);
    const remainingCount = validImages.length - imagesToShow.length;

    const handleImageError = (index: number) => {
        setBrokenImages(prev => new Set(prev).add(index));
    };

    const openModal = (index: number) => {
        setActiveImageIndex(index);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setActiveImageIndex(null);
        document.body.style.overflow = '';
    };

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeImageIndex !== null) {
            setActiveImageIndex((activeImageIndex + 1) % validImages.length);
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeImageIndex !== null) {
            setActiveImageIndex((activeImageIndex - 1 + validImages.length) % validImages.length);
        }
    };

    const renderImage = (img: any, index: number, isLast: boolean, remaining: number) => {
        return (
            <div className={styles.gridItem} key={index}>
                <img
                    src={img.img_url}
                    alt={`attachment-${index}`}
                    className={styles.imageItem}
                    onError={() => handleImageError(index)}
                    onClick={() => openModal(index)}
                />
                {isLast && remaining > 0 && (
                    <div className={styles.overlay} onClick={() => openModal(index)}>
                        +{remaining}
                    </div>
                )}
            </div>
        );
    };

    const count = imagesToShow.length;

    return (
        <div className={styles.gridContainer}>
            {count === 1 && (
                <div className={styles.layout1}>
                    {renderImage(imagesToShow[0], 0, false, 0)}
                </div>
            )}

            {count === 2 && (
                <div className={styles.layout2}>
                    {renderImage(imagesToShow[0], 0, false, 0)}
                    {renderImage(imagesToShow[1], 1, remainingCount > 0, remainingCount)}
                </div>
            )}

            {count === 3 && (
                <div className={styles.layout3}>
                    <div className={styles.layout3Left}>
                        {renderImage(imagesToShow[0], 0, false, 0)}
                    </div>
                    <div className={styles.layout3Right}>
                        {renderImage(imagesToShow[1], 1, false, 0)}
                        {renderImage(imagesToShow[2], 2, remainingCount > 0, remainingCount)}
                    </div>
                </div>
            )}

            {count >= 4 && (
                <div className={styles.layout4}>
                    {renderImage(imagesToShow[0], 0, false, 0)}
                    {renderImage(imagesToShow[1], 1, false, 0)}
                    {renderImage(imagesToShow[2], 2, false, 0)}
                    {renderImage(imagesToShow[3], 3, remainingCount > 0, remainingCount)}
                </div>
            )}

            {/* Fullscreen Image Modal */}
            {activeImageIndex !== null && (
                <div className={styles.modalBackdrop} onClick={closeModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.closeBtn} onClick={closeModal}>
                            <X size={24} />
                        </button>
                        
                        {validImages.length > 1 && (
                            <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={prevImage}>
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        
                        <img 
                            src={validImages[activeImageIndex].img_url} 
                            alt={`Fullscreen ${activeImageIndex}`}
                            className={styles.fullscreenImage}
                        />

                        {validImages.length > 1 && (
                            <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={nextImage}>
                                <ChevronRight size={24} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGrid;
