declare module '@microlink/react' {
    import * as React from 'react';
    
    export interface MicrolinkProps {
        url: string;
        size?: 'normal' | 'large' | 'small';
        style?: React.CSSProperties;
        className?: string;
        media?: string | string[];
        lazy?: boolean;
        direction?: 'ltr' | 'rtl';
        [key: string]: any;
    }
    
    const Microlink: React.FC<MicrolinkProps>;
    export default Microlink;
}
