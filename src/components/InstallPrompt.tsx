import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }
}

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('PWA 설치됨');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
    };

    if (!showPrompt || !deferredPrompt) {
        return null;
    }

    return (
        <div className="fixed z-[var(--z-overlay)] animate-fade-in max-w-xs" style={{ bottom: 'calc(var(--nav-h) + 16px)', right: '16px' }}>
            <div className="bg-white border border-outline-variant rounded-lg p-4 space-y-3">
                <div>
                    <h3 className="font-headline font-bold text-on-surface mb-1">앱 설치</h3>
                    <p className="text-sm text-on-surface-variant">타슈를 홈화면에 추가하여 더 편하게 사용하세요</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 rounded-lg border border-outline-variant text-sm py-2 text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    >
                        나중에
                    </button>
                    <button
                        onClick={handleInstall}
                        className="flex-1 rounded-lg bg-primary text-white text-sm py-2 font-semibold hover:brightness-95 transition-all"
                    >
                        설치
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
