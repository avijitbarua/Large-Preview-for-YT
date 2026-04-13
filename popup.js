document.addEventListener('DOMContentLoaded', () => {
    const extensionToggle = document.getElementById('extensionToggle');
    const forceAudioToggle = document.getElementById('forceAudioToggle');
    const statusText = document.getElementById('statusText');

    chrome.storage.local.get(['isEnabled', 'forceAudio'], (result) => {
        extensionToggle.checked = result.isEnabled ?? true; // Default to enabled
        forceAudioToggle.checked = result.forceAudio ?? false;
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

    function updateStatusText(isEnabled) {
        statusText.innerText = isEnabled ? 'Enabled' : 'Disabled';
        statusText.style.color = isEnabled ? '#cc0000' : '#888';
    }
});