(function () {
    const DEFAULT_PREVIEW_SPEED = 1;
    const DEFAULT_QUALITY = 'auto';

    function isPreviewVideo(video) {
        return !!video && !video.closest('#movie_player, .html5-video-player');
    }

    function formatSpeedLabel(speed) {
        return `${Number(speed).toFixed(1)}x`;
    }

    function applyPreviewSpeedToVideo(video, speed) {
        if (!video || !isPreviewVideo(video)) return;
        const normalizedSpeed = Number(speed) || DEFAULT_PREVIEW_SPEED;

        if (video.playbackRate !== normalizedSpeed) {
            video.playbackRate = normalizedSpeed;
        }
    }

    function applyPreviewSpeed() {
        chrome.storage.local.get(['previewSpeed'], (result) => {
            const speed = result.previewSpeed ?? DEFAULT_PREVIEW_SPEED;
            document.querySelectorAll('video').forEach(video => {
                applyPreviewSpeedToVideo(video, speed);
            });
        });
    }

    function applyQualityPreference(attempt = 0) {
        chrome.storage.local.get(['preferredQuality'], (result) => {
            const preferredQuality = result.preferredQuality ?? DEFAULT_QUALITY;

            if (preferredQuality === 'auto') {
                return;
            }

            const player = document.getElementById('movie_player');
            const canSetQuality = player && typeof player.setPlaybackQuality === 'function';

            if (!canSetQuality) {
                if (attempt < 10) {
                    setTimeout(() => applyQualityPreference(attempt + 1), 500);
                }
                return;
            }

            try {
                const availableLevels = typeof player.getAvailableQualityLevels === 'function'
                    ? player.getAvailableQualityLevels()
                    : [];

                const targetQuality = availableLevels.includes(preferredQuality)
                    ? preferredQuality
                    : availableLevels[0] || preferredQuality;

                player.setPlaybackQuality(targetQuality);

                if (typeof player.setPlaybackQualityRange === 'function') {
                    player.setPlaybackQualityRange(targetQuality);
                }
            } catch (error) {
                if (attempt < 10) {
                    setTimeout(() => applyQualityPreference(attempt + 1), 500);
                }
            }
        });
    }

    function syncMediaPreferences() {
        applyPreviewSpeed();
        applyQualityPreference();
    }

    // স্ক্রিনের সবচেয়ে কাছে থাকা ভিডিও খুঁজে বের করার ফাংশন
    function getMostVisibleVideo() {
        const videoCards = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer');
        let mostVisible = null;
        let minDistance = Infinity;
        const viewportCenter = window.innerHeight / 2; // স্ক্রিনের মাঝখান

        videoCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            // ভিডিও কার্ডের মাঝখানের পয়েন্ট বের করা
            const cardCenter = rect.top + (rect.height / 2);
            // স্ক্রিনের মাঝখান থেকে কার্ডের দূরত্ব মাপা
            const distance = Math.abs(viewportCenter - cardCenter);

            if (distance < minDistance) {
                minDistance = distance;
                mostVisible = card;
            }
        });

        return mostVisible;
    }

    function toggleZoomState() {
        chrome.storage.local.get(['isEnabled'], (result) => {
            const isEnabled = result.isEnabled ?? true;
            
            // ১. লেআউট চেঞ্জ হওয়ার আগে টার্গেট ভিডিওটা মনে রাখা
            const targetVideo = getMostVisibleVideo();

            // ২. লেআউট চেঞ্জ করা (CSS ক্লাস অ্যাড/রিমুভ)
            if (isEnabled) {
                document.body.classList.add('yt-zoom-extension-active');
            } else {
                document.body.classList.remove('yt-zoom-extension-active');
            }

            // ৩. লেআউট চেঞ্জ হওয়ার পর আবার সেই ভিডিওর কাছে স্ক্রল করে ফিরে যাওয়া
            if (targetVideo) {
                // ব্রাউজারকে লেআউট রেন্ডার করার জন্য একটু সময় (১০০ মিলি-সেকেন্ড) দেওয়া
                setTimeout(() => {
                    targetVideo.scrollIntoView({ behavior: 'instant', block: 'center' });
                }, 100);
            }
        });
    }

    // পেজ লোড হওয়ার সময় একবার রান করবে
    toggleZoomState();
    syncMediaPreferences();
    
    // ইউটিউব যেহেতু SPA (Single Page Application), তাই নতুন পেজ লোড হলে আবার রি-ক্যালকুলেট করতে হবে
    window.addEventListener('yt-navigate-finish', () => {
        toggleZoomState();
        syncMediaPreferences();
    });

    document.addEventListener('play', (e) => {
        if (e.target.tagName && e.target.tagName.toLowerCase() === 'video') {
            chrome.storage.local.get(['previewSpeed'], (result) => {
                applyPreviewSpeedToVideo(e.target, result.previewSpeed ?? DEFAULT_PREVIEW_SPEED);
            });
        }
    }, true);

    // পপআপ থেকে সুইচ অন/অফ করলে রান করবে
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            if (changes.isEnabled !== undefined) {
                toggleZoomState();
            }

            if (changes.previewSpeed !== undefined) {
                applyPreviewSpeed();
            }

            if (changes.preferredQuality !== undefined) {
                applyQualityPreference();
            }
        }
    });

    // ============================================
    // অ্যাডভান্সড ফোর্স আনমিউট (Force Audio) লজিক
    // ============================================
    let forceAudioEnabled = false;

    // লোকাল স্টোরেজ থেকে ইনিশিয়াল ভ্যালু পড়া
    chrome.storage.local.get(['isEnabled', 'forceAudio'], (result) => {
        forceAudioEnabled = result.isEnabled && result.forceAudio;
    });

    // ইউজারের সেটিং চেঞ্জ ট্র্যাক করা
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            chrome.storage.local.get(['isEnabled', 'forceAudio'], (result) => {
                forceAudioEnabled = result.isEnabled && result.forceAudio;
                if (forceAudioEnabled) enforceAudio();
            });
        }
    });

    let clickCooldowns = new WeakMap();

    // ডিরেক্ট HTML5 ভিডিও মিউটেশন এবং ইউটিউবের অরিজিনাল বাটন স্মার্ট-ক্লিক
    function enforceAudio() {
        if (!forceAudioEnabled) return;
        
        // ১. ভিডিও লেভেলে ফোর্সভালি আনমিউট করা
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (video.muted) {
                video.muted = false;
                video.volume = 1.0;
            }
        });

        // ২. ইউটিউবের নিজস্ব আনমিউট বাটনে ক্লিক করা (স্মার্ট কুলডাউন সহ)
        const muteButtons = document.querySelectorAll('.ytp-mute-button');
        const now = Date.now();

        muteButtons.forEach(btn => {
            const title = btn.getAttribute('data-title-no-tooltip') || btn.getAttribute('title') || '';
            if (title.toLowerCase().includes('unmute')) {
                const lastClick = clickCooldowns.get(btn) || 0;
                // ১ সেকেন্ডের কুলডাউন (১০০০ মিলিসেকেন্ড) - যাতে লুপে আটকে না যায়!
                if (now - lastClick > 1000) {
                    clickCooldowns.set(btn, now);
                    btn.click();
                }
            }
        });
    }

    // ১. ভিডিও যখনই প্লে হওয়া শুরু করবে তখনই আনমিউট করে দেওয়া
    document.addEventListener('play', (e) => {
        if (forceAudioEnabled && e.target.tagName && e.target.tagName.toLowerCase() === 'video') {
            e.target.muted = false;
            e.target.volume = 1.0;
        }
    }, true); 

    // ২. ইউটিউব যদি জাভাস্ক্রিপ্ট দিয়ে মিউট করতে চায়, তবে তা আটকে দেওয়া
    document.addEventListener('volumechange', (e) => {
        if (forceAudioEnabled && e.target.tagName && e.target.tagName.toLowerCase() === 'video') {
            if (e.target.muted || e.target.volume === 0) {
                e.target.muted = false;
                e.target.volume = 1.0;
            }
        }
    }, true);

    // ৩. ব্যাকআপ ইন্টারভ্যাল (ফেইলসেইফ)
    const audioCheckInterval = setInterval(() => {
        try {
            if (!chrome?.runtime?.id) {
                clearInterval(audioCheckInterval);
                return;
            }
            if (forceAudioEnabled) {
                enforceAudio();
            }
        } catch (error) {
            clearInterval(audioCheckInterval);
        }
    }, 200); 
})();