import { useRef, useState, useCallback, type DragEvent } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './FileUpload.module.css';

interface FileUploadProps {
    label?: string;
    files: File[];
    onChange: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number; // bytes
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({
    label,
    files,
    onChange,
    accept,
    multiple = true,
    maxSize = 1 * 1024 * 1024, // 1MB default (safeguard against base64 overhead causing 413)
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleFiles = useCallback(
        (newFiles: FileList | null) => {
            if (!newFiles) return;

            const fileArray = Array.from(newFiles);
            
            // 1. Filter by size
            const sizeValidFiles = fileArray.filter((f) => f.size <= maxSize);
            const oversizedFiles = fileArray.filter((f) => f.size > maxSize);

            if (oversizedFiles.length > 0) {
                toast.error(`File size exceeds limit of ${formatFileSize(maxSize)}: ${oversizedFiles.map(f => f.name).join(', ')}`);
            }

            // 2. Filter by accepted types (if accept prop is provided)
            let fullyValidFiles = sizeValidFiles;
            if (accept) {
                const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
                fullyValidFiles = sizeValidFiles.filter(f => {
                    const extMatch = f.name.match(/\.[0-9a-z]+$/i);
                    const ext = extMatch ? extMatch[0].toLowerCase() : '';
                    const type = f.type.toLowerCase();
                    return acceptedTypes.some(t => {
                        if (t.startsWith('.')) return ext === t;
                        if (t.endsWith('/*')) return type.startsWith(t.replace('/*', '/'));
                        return type === t;
                    });
                });

                const invalidTypeFiles = sizeValidFiles.filter(f => !fullyValidFiles.includes(f));
                if (invalidTypeFiles.length > 0) {
                    toast.error(`Invalid file type: ${invalidTypeFiles.map(f => f.name).join(', ')}. Accepted: ${accept}`);
                }
            }

            if (fullyValidFiles.length > 0) {
                if (multiple) {
                    onChange([...files, ...fullyValidFiles]);
                } else {
                    onChange(fullyValidFiles.slice(0, 1));
                }
            }
        },
        [files, onChange, multiple, maxSize]
    );

    const handleDrop = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles]
    );

    const removeFile = (index: number) => {
        onChange(files.filter((_, i) => i !== index));
    };

    return (
        <div className={styles['file-upload']}>
            {label && <span className={styles['file-upload__label']}>{label}</span>}

            <div
                className={`${styles['file-upload__dropzone']} ${dragging ? styles['file-upload__dropzone--dragging'] : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
            >
                <Upload size={24} className={styles['file-upload__icon']} />
                <span className={styles['file-upload__text']}>
                    <strong>Click to upload</strong> or drag and drop
                </span>
                <span className={styles['file-upload__hint']}>
                    {accept && <span>Supported formats: {accept.split(',').map(f => f.trim().toUpperCase().replace('.', '')).join(', ')}<br /></span>}
                    Max {formatFileSize(maxSize)} per file
                </span>
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    style={{ display: 'none' }}
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            {files.length > 0 && (
                <div className={styles['file-upload__list']}>
                    {files.map((file, i) => (
                        <div key={`${file.name}-${i}`} className={styles['file-upload__item']}>
                            <FileText size={18} className={styles['file-upload__item-icon']} />
                            <div className={styles['file-upload__item-info']}>
                                <div className={styles['file-upload__item-name']}>{file.name}</div>
                                <div className={styles['file-upload__item-size']}>{formatFileSize(file.size)}</div>
                            </div>
                            <button
                                type="button"
                                className={styles['file-upload__item-remove']}
                                onClick={() => removeFile(i)}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
