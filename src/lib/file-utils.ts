import apiClient from './api-client';
import { FILE_DIRECT_DOWNLOAD } from '../config/api-routes';
import { useAuthStore } from '../stores/auth-store';
import toast from 'react-hot-toast';

/**
 * Downloads or opens an attachment.
 * If the attachment contains a fully-qualified HTTP URL (like a signed S3 URL), it opens it directly.
 * Otherwise, it requests the file via the FILE_DIRECT_DOWNLOAD API and opens the resulting blob.
 */
export async function downloadOrOpenAttachment(att: any): Promise<void> {
    if (!att) return;

    // Check if it's already a full URL
    const rawUrl = typeof att === 'string' ? att : att.signedURL || att.url || att.filepath || att.filePath || '';
    if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
        window.open(rawUrl, '_blank', 'noopener,noreferrer');
        return;
    }

    // Otherwise, we need a filename to download via the API
    const fileName = typeof att === 'string' ? att : att.filename || att.fileName || att.name || rawUrl;
    if (!fileName) {
        toast.error('Cannot open file: no file name provided.');
        return;
    }

    const { userId, domain } = useAuthStore.getState();
    try {
        const response = await apiClient.get(FILE_DIRECT_DOWNLOAD, {
            params: { fileName, userid: userId, domain: domain || 'dev' },
            responseType: 'blob',
        });
        const blob = new Blob([response.data], {
            type: response.headers['content-type'] || 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const ct = response.headers['content-type'] || '';
        
        // If the backend returned a JSON error instead of a file (some backends return 200 OK for errors)
        if (ct.includes('application/json')) {
            const text = await blob.text();
            try {
                const json = JSON.parse(text);
                toast.error(json.message || json.error || 'File not found');
            } catch {
                toast.error('File not found');
            }
            return;
        }

        if (ct.startsWith('image/') || ct === 'application/pdf') {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.click();
        } else {
            // Extract just the file name from path
            const downloadName = fileName.split('/').pop() || fileName.split('\\').pop() || 'attachment';
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // Use a longer timeout (5 minutes) because if the user's browser prompts 'Save As', 
        // a 10s timeout will revoke the URL before the download starts, causing a 'File not found' browser error.
        setTimeout(() => URL.revokeObjectURL(url), 300000);
    } catch (err) {
        console.error('Download error:', err);
        toast.error('Failed to download attachment');
    }
}
