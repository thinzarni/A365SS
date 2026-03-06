import React, { useState } from 'react';
import styles from './ImageGrid.module.css';

interface ImageGridProps {
    images: any[];
    maxImages?: number; // default 4
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, maxImages = 4 }) => {
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

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

    const renderImage = (img: any, index: number, isLast: boolean, remaining: number) => {
        return (
            <div className={styles.gridItem} key={index}>
                <img
                    src={img.img_url}
                    alt={`attachment-${index}`}
                    className={styles.imageItem}
                    onError={() => handleImageError(index)}
                    onClick={() => alert('Image fullscreen view coming soon!')}
                />
                {isLast && remaining > 0 && (
                    <div className={styles.overlay} onClick={() => alert('View all images coming soon!')}>
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
        </div>
    );
};

export default ImageGrid;
