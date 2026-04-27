document.addEventListener('DOMContentLoaded', () => {
    const extensionToggle = document.getElementById('extensionToggle');
    const forceAudioToggle = document.getElementById('forceAudioToggle');
    const previewSpeedRange = document.getElementById('previewSpeedRange');
    const previewSpeedValue = document.getElementById('previewSpeedValue');
    const qualitySelect = document.getElementById('qualitySelect');
    const statusText = document.getElementById('statusText');

    function formatSpeed(speed) {
        return `${Number(speed).toFixed(1)}x`;
    }

    function clampSpeed(speed) {
        const numericSpeed = Number(speed);
        if (Number.isNaN(numericSpeed)) {
            return 1;
        }

        return Math.min(2, Math.max(0.5, numericSpeed));
    }

    chrome.storage.local.get(['isEnabled', 'forceAudio', 'previewSpeed', 'preferredQuality'], (result) => {
        extensionToggle.checked = result.isEnabled ?? true; // Default to enabled
        forceAudioToggle.checked = result.forceAudio ?? false;
        const previewSpeed = clampSpeed(result.previewSpeed ?? 1);
        previewSpeedRange.value = String(previewSpeed);
        previewSpeedValue.innerText = formatSpeed(previewSpeed);
        qualitySelect.value = result.preferredQuality ?? 'auto';
        updateStatusText(extensionToggle.checked);
    });

    extensionToggle.addEventListener('change', () => {
        const isEnabled = extensionToggle.checked;
        chrome.storage.local.set({ isEnabled: isEnabled }, () => {
            console.log(`YouTube Preview is now ${isEnabled ? 'enabled' : 'disabled'}`);
            updateStatusText(isEnabled);
        });
    });

    forceAudioToggle.addEventListener('change', () => {
        const forceAudio = forceAudioToggle.checked;
        chrome.storage.local.set({ forceAudio: forceAudio }, () => {
            console.log(`Force audio is now ${forceAudio ? 'enabled' : 'disabled'}`);
        });
    });

    previewSpeedRange.addEventListener('input', () => {
        const previewSpeed = clampSpeed(previewSpeedRange.value);
        previewSpeedValue.innerText = formatSpeed(previewSpeed);
    });

    previewSpeedRange.addEventListener('change', () => {
        const previewSpeed = clampSpeed(previewSpeedRange.value);
        previewSpeedRange.value = String(previewSpeed);
        previewSpeedValue.innerText = formatSpeed(previewSpeed);

        chrome.storage.local.set({ previewSpeed }, () => {
            console.log(`Preview speed is now ${previewSpeed}x`);
        });
    });

    qualitySelect.addEventListener('change', () => {
        const preferredQuality = qualitySelect.value;
        chrome.storage.local.set({ preferredQuality }, () => {
            console.log(`Preferred quality is now ${preferredQuality}`);
        });
    });

    function updateStatusText(isEnabled) {
        statusText.innerText = isEnabled ? 'Enabled' : 'Disabled';
        statusText.style.color = isEnabled ? '#cc0000' : '#888';
    }
});