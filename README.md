# YouTube Home Row Expander

Chrome extension for YouTube home feed that expands only the hovered video card to full row width.

## Behavior

- Default YouTube grid stays normal (3/4 columns depending on viewport).
- Hover any home video card: that card becomes full-row width.
- Other cards from that row are not hidden; they flow into the next row.
- Moving mouse away restores the original grid instantly.
- No overlay or popup player is used.
- YouTube native silent autoplay preview remains managed by YouTube.

## Toggle

- Open extension popup.
- Turn switch on or off.
- State is saved in `chrome.storage.local`.

## Files

- `manifest.json` - Extension manifest (MV3)
- `content.js` - Home hover logic and state sync
- `style.css` - Expanded card styling
- `popup.html` - Toggle UI
- `popup.js` - Popup state binding

## Install (Developer Mode)

1. Open `chrome://extensions/`
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project folder.
5. Open YouTube home page and test hover behavior.
