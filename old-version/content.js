(function () {
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

    // পপআপ থেকে সুইচ অন/অফ করলে রান করবে
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.isEnabled) {
            toggleZoomState();
        }
    });
})();