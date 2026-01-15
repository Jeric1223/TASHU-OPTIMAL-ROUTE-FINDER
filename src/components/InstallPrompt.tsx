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
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in max-w-xs">
            <div className="neomorph-card p-4 space-y-3">
                <div>
                    <h3 className="font-bold text-gray-800 mb-1">앱 설치</h3>
                    <p className="text-sm text-gray-600">TASHU를 홈화면에 추가하여 더 편하게 사용하세요!</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 neomorph-btn text-sm py-2 hover:bg-gray-100 transition-colors"
                    >
                        나중에
                    </button>
                    <button
                        onClick={handleInstall}
                        className="flex-1 neomorph-btn-primary text-sm py-2 font-semibold"
                    >
                        설치
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
