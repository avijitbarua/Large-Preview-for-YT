(function () {
    const BODY_ENABLED_CLASS = 'ytlpe-enabled';
    const EXPANDED_CLASS = 'ytlpe-expanded';
    const HOME_PATH = '/';
    const RENDERER_SELECTOR = 'ytd-rich-grid-renderer';
    const GRID_CONTENT_SELECTOR = '#contents';
    const CARD_SELECTOR = 'ytd-rich-item-renderer';
    const THUMBNAIL_SELECTOR = '#thumbnail';

    let isEnabled = true;
    let forceAudio = false;
    let expandedCard = null;
    let restoreAnchor = null;
    let previewAssistTimer = null;

    function isHomePage() {
        return window.location.pathname === HOME_PATH;
    }

    function getRenderer() {
        return document.querySelector(RENDERER_SELECTOR);
    }

    function getCards(renderer) {
        const gridContent = renderer.querySelector(GRID_CONTENT_SELECTOR);
        if (!gridContent) {
            return [];
        }

        return Array.from(gridContent.querySelectorAll(':scope > ytd-rich-item-renderer'));
    }

    function parseGridTemplateColumns(templateColumns) {
        if (!templateColumns || templateColumns === 'none') {
            return 0;
        }

        const repeatMatch = templateColumns.match(/repeat\((\d+),/);
        if (repeatMatch) {
            return parseInt(repeatMatch[1], 10);
        }

        return templateColumns
            .split(' ')
            .map((part) => part.trim())
            .filter(Boolean)
            .length;
    }

    function detectColumns(renderer, cards) {
        const gridContent = renderer.querySelector(GRID_CONTENT_SELECTOR);

        if (gridContent) {
            const gridColumns = parseGridTemplateColumns(getComputedStyle(gridContent).gridTemplateColumns);
            if (gridColumns > 0) {
                return gridColumns;
            }
        }

        const cssValue = getComputedStyle(renderer).getPropertyValue('--ytd-rich-grid-items-per-row').trim();
        const parsed = parseInt(cssValue, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
            return parsed;
        }

        if (cards.length < 2) {
            return 1;
        }

        const firstTop = cards[0].getBoundingClientRect().top;
        let count = 1;

        for (let i = 1; i < cards.length; i += 1) {
            const top = cards[i].getBoundingClientRect().top;
            if (Math.abs(top - firstTop) <= 4) {
                count += 1;
            } else {
                break;
            }
        }

        return Math.max(1, count);
    }

    function restoreCardPosition() {
        stopPreviewAssist();

        if (!expandedCard) {
            return;
        }

        expandedCard.classList.remove(EXPANDED_CLASS);

        if (restoreAnchor && restoreAnchor.parentNode) {
            restoreAnchor.parentNode.insertBefore(expandedCard, restoreAnchor);
            restoreAnchor.remove();
        }

        restoreAnchor = null;
        expandedCard = null;
    }

    function stopPreviewAssist() {
        if (previewAssistTimer) {
            clearInterval(previewAssistTimer);
            previewAssistTimer = null;
        }
    }

    function tryEnablePreviewPlayback(card) {
        const video = card.querySelector('video');
        if (!video) {
            return false;
        }

        if (forceAudio) {
            video.muted = false;
            video.defaultMuted = false;
            video.volume = 1;
        }

        try {
            const maybePromise = video.play();
            if (maybePromise && typeof maybePromise.catch === 'function') {
                maybePromise.catch(() => {
                    // Ignore autoplay rejections from browser policy.
                });
            }
        } catch (_error) {
            // Ignore autoplay rejections from browser policy.
        }

        return true;
    }

    function pokeThumbnailHover(card) {
        const thumbnail = card.querySelector(THUMBNAIL_SELECTOR);
        if (!thumbnail) {
            return;
        }

        const rect = thumbnail.getBoundingClientRect();
        const clientX = rect.left + Math.min(24, Math.max(8, rect.width / 5));
        const clientY = rect.top + Math.min(24, Math.max(8, rect.height / 5));

        thumbnail.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true, view: window }));
        thumbnail.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX,
            clientY
        }));
    }

    function startPreviewAssist(card) {
        stopPreviewAssist();

        let attempts = 0;
        const maxAttempts = 24;

        const tick = () => {
            if (expandedCard !== card || !document.contains(card)) {
                stopPreviewAssist();
                return;
            }

            pokeThumbnailHover(card);
            tryEnablePreviewPlayback(card);

            attempts += 1;
            if (attempts >= maxAttempts) {
                stopPreviewAssist();
            }
        };

        tick();
        previewAssistTimer = setInterval(tick, 250);
    }

    function expandCard(card) {
        if (!isEnabled || !isHomePage()) {
            return;
        }

        if (expandedCard === card) {
            return;
        }

        restoreCardPosition();

        const renderer = getRenderer();
        if (!renderer || !renderer.contains(card)) {
            return;
        }

        const cards = getCards(renderer);
        const cardIndex = cards.indexOf(card);
        if (cardIndex < 0) {
            return;
        }

        const columns = detectColumns(renderer, cards);
        const rowStartIndex = cardIndex - (cardIndex % columns);
        const rowStartCard = cards[rowStartIndex];

        if (rowStartCard && rowStartCard !== card) {
            restoreAnchor = document.createElement('span');
            restoreAnchor.style.display = 'none';
            restoreAnchor.setAttribute('data-ytlpe-anchor', 'true');

            card.parentNode.insertBefore(restoreAnchor, card);
            card.parentNode.insertBefore(card, rowStartCard);
        }

        card.classList.add(EXPANDED_CLASS);
        expandedCard = card;
        startPreviewAssist(card);
    }

    function onMouseOver(event) {
        if (!isEnabled || !isHomePage()) {
            return;
        }

        const card = event.target.closest(CARD_SELECTOR);
        if (!card) {
            return;
        }

        expandCard(card);
    }

    function onMouseOut(event) {
        if (!expandedCard) {
            return;
        }

        const fromCard = event.target.closest(CARD_SELECTOR);
        if (fromCard !== expandedCard) {
            return;
        }

        const toElement = event.relatedTarget;
        if (toElement && expandedCard.contains(toElement)) {
            return;
        }

        restoreCardPosition();
    }

    function applyEnabledState(nextState) {
        isEnabled = nextState;

        if (isEnabled) {
            document.body.classList.add(BODY_ENABLED_CLASS);
        } else {
            document.body.classList.remove(BODY_ENABLED_CLASS);
            restoreCardPosition();
        }

        if (!isHomePage()) {
            restoreCardPosition();
        }
    }

    function syncStateFromStorage() {
        chrome.storage.local.get(['isEnabled', 'forceAudio'], (result) => {
            forceAudio = Boolean(result.forceAudio ?? false);
            applyEnabledState(result.isEnabled ?? true);

            if (expandedCard) {
                startPreviewAssist(expandedCard);
            }
        });
    }

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);

    window.addEventListener('yt-navigate-start', restoreCardPosition);
    window.addEventListener('yt-navigate-finish', syncStateFromStorage);

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') {
            return;
        }

        if (Object.prototype.hasOwnProperty.call(changes, 'isEnabled')) {
            applyEnabledState(Boolean(changes.isEnabled.newValue));
        }

        if (Object.prototype.hasOwnProperty.call(changes, 'forceAudio')) {
            forceAudio = Boolean(changes.forceAudio.newValue);
            if (expandedCard) {
                startPreviewAssist(expandedCard);
            }
        }
    });

    syncStateFromStorage();
})();