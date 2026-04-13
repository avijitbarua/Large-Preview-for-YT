document.addEventListener('DOMContentLoaded', () => {
    const extensionToggle = document.getElementById('extensionToggle');
    const statusText = document.getElementById('statusText');

    // Get the current state from storage
    chrome.storage.local.get(['isEnabled'], (result) => {
        extensionToggle.checked = result.isEnabled ?? true; // Default to enabled
        updateStatusText(extensionToggle.checked);
    });

    extensionToggle.addEventListener('change', () => {
        const isEnabled = extensionToggle.checked;
        chrome.storage.local.set({ isEnabled: isEnabled }, () => {
            console.log(`YouTube Preview is now ${isEnabled ? 'enabled' : 'disabled'}`);
            updateStatusText(isEnabled);
        });
    });

    function updateStatusText(isEnabled) {
        statusText.innerText = isEnabled ? 'Enabled' : 'Disabled';
        statusText.style.color = isEnabled ? '#cc0000' : '#888';
    }
});