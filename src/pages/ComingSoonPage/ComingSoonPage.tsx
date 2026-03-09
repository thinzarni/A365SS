import { Construction } from 'lucide-react';
import styles from './ComingSoonPage.module.css';

export default function ComingSoonPage() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.iconWrap}>
                    <Construction size={48} className={styles.icon} />
                </div>
                <h1 className={styles.title}>Coming Soon</h1>
                <p className={styles.subtitle}>
                    This feature is currently under development. Please check back later!
                </p>
            </div>
        </div>
    );
}
