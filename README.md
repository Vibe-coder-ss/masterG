# masterG 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com)
[![Privacy First](https://img.shields.io/badge/Privacy-First-purple.svg)](#privacy)
[![Open Source](https://img.shields.io/badge/Open-Source-orange.svg)](#)

> **Boost your productivity and enhance your browser experience!**

masterG is a powerful Chrome extension designed to help users improve their productivity and browser experience. Built with privacy and transparency as core principles.

---

## ✨ Features

### 🎨 Display Theme Control
Take control of your browsing experience with three theme options:

| Theme | Description |
|-------|-------------|
| 🌙 **Dark Mode** | Easy on the eyes, perfect for night browsing |
| ☀️ **Light Mode** | Bright and clear visibility |
| 💻 **Default** | Respect the website's original styling |

### 🎨 Dark Color Preferences
When Dark Mode is selected, choose your preferred color scheme:

| Color | Description |
|-------|-------------|
| ⚫ **Charcoal** | Pure dark with neutral grays |
| 🔵 **Midnight Blue** | Deep blue for a modern look |
| 🟣 **Navy Purple** | Classic dark with purple accent |
| 🩶 **Dark Slate** | VS Code inspired dark theme |
| 🌲 **Forest Night** | Dark green for a natural feel |

### 🍅 Pomodoro Timer
Boost your productivity with the proven Pomodoro Technique:

- **Focus Sessions** - Default 25 minutes of focused work
- **Short Breaks** - Default 5 minutes to recharge
- **Long Breaks** - 15 minutes after every 4 focus sessions
- **Customizable Times** - Adjust focus, break, and long break durations
- **Session Tracking** - Visual dots show completed sessions
- **Smart Alerts** - Different notifications for focus vs break complete
- **Quick Actions** - Start next phase directly from the alert popup

| Setting | Default | Range |
|---------|---------|-------|
| Focus Time | 25 min | 1-120 min |
| Break Time | 5 min | 1-60 min |
| Long Break | 15 min | 1-60 min |

### ⏱️ Timer
Set a countdown timer to boost your productivity:

- **Custom Time Input** - Set hours, minutes, and seconds
- **Quick Presets** - 1, 5, 10, 15, 25, 30, 45, 60 minutes
- **Multi-Alert System** - Never miss a timer completion:
  - 🔔 **Sound Alert** - Multiple beeps with increasing pitch
  - 💬 **Chrome Notification** - Desktop notification that stays until dismissed
  - 🪟 **Popup Window** - Full-screen alert popup on any screen
- **Background Running** - Timer continues even when popup is closed
- **Pause & Resume** - Full control over your timer
- **Visual Feedback** - Pulsing animation and color changes

### ⏰ Stopwatch
Track time with precision:

- **Millisecond Accuracy** - Precise time tracking
- **Lap Times** - Record multiple laps with time differences
- **Pause & Resume** - Control your stopwatch anytime
- **Persistent State** - Continues running across popup opens/closes

### 📋 Clipboard History
Never lose copied text again:

- **🔄 Auto-Capture** - Automatically captures text when you press Ctrl/Cmd+C
- **📥 Manual Capture** - Or click button to save current clipboard
- **📚 History Storage** - Store up to 50 items (configurable)
- **🔄 Quick Copy** - Click any item to copy it back to clipboard
- **🗑️ Delete Items** - Remove individual items or clear all
- **🌐 Source Tracking** - Shows which website text was copied from
- **📅 Smart Display** - Shows preview, character count, and time ago
- **💾 Persistent Storage** - History survives browser restarts

| Setting | Default | Range |
|---------|---------|-------|
| Auto-Capture | ON | ON/OFF |
| Max Items | 10 | 5-50 |

*More features coming soon!*

---

## 🔒 Privacy & Transparency

**We take your privacy seriously.** masterG is built with these core principles:

- ✅ **No Data Collection**: We don't collect any personal data
- ✅ **No Tracking**: Your browsing activity is never tracked
- ✅ **No External Sharing**: Your preferences stay on your device
- ✅ **Local Storage Only**: All settings are stored locally using Chrome's storage API
- ✅ **Open Source**: Our code is fully transparent and open for review

### What Data We Store (Locally)
- Your theme preference (dark/light/default)
- Installation date (for version management)

**That's it!** No personal information, no browsing history, no analytics.

---

## 📦 Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)

1. **Download or Clone** this repository:
   ```bash
   git clone https://github.com/Vibe-coder-ss/masterG.git
   ```

2. **Open Chrome** and navigate to:
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode** (toggle in top-right corner)

4. **Click "Load unpacked"** and select the `masterG` folder

5. **Done!** 🎉 You should see the masterG icon in your toolbar

---

## 🚀 Usage

1. Click the **masterG icon** in your browser toolbar
2. Select your preferred theme:
   - 🌙 **Dark** - Applies dark mode to all websites
   - ☀️ **Light** - Forces light mode on all websites
   - 💻 **Default** - Uses the website's original appearance
3. The theme is applied instantly and remembered for future sessions

---

## 📁 Project Structure

```
masterG/
├── manifest.json          # Extension configuration
├── config.js              # 🔧 CENTRAL CONFIG - Update links/settings here
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup functionality
├── content/
│   ├── content.js        # Page theme application
│   └── content.css       # Theme CSS styles
├── background/
│   └── background.js     # Service worker & timer alarms
├── alert/
│   ├── alert.html        # Timer completion popup
│   └── alert.js          # Alert sound & interaction
├── offscreen/
│   ├── offscreen.html    # Offscreen audio document
│   └── offscreen.js      # Background audio playback
├── icons/
│   ├── icon16.png        # Toolbar icon
│   ├── icon48.png        # Extension icon
│   └── icon128.png       # Store icon
├── README.md             # This file
├── PRIVACY.md            # Privacy policy
└── LICENSE               # MIT License
```

### Central Configuration

All configurable values (GitHub links, version, theme settings, dark colors) are stored in `config.js`. 
To update any links or settings, modify this single file:

```javascript
// config.js
const CONFIG = {
  name: 'masterG',
  version: '1.0.0',
  github: {
    repo: 'https://github.com/Vibe-coder-ss/masterG',
    // ... other links
  },
  darkColors: {
    charcoal: { background: '#1a1a1a', ... },
    midnight: { background: '#0f172a', ... },
    navy: { background: '#1a1a2e', ... },
    slate: { background: '#1e1e1e', ... },
    forest: { background: '#0d1912', ... }
  },
  defaultDarkColor: 'navy',
  // ... other settings
};
```

To add a new dark color scheme, simply add a new entry to `darkColors` in config.js.

---

## 🛠️ Development

### Prerequisites
- Google Chrome or Chromium-based browser
- Basic knowledge of HTML, CSS, and JavaScript

### Local Development

1. Clone the repository
2. Make your changes
3. Reload the extension in `chrome://extensions/`
4. Test your changes

### Converting SVG Icons to PNG

For production, convert SVG icons to PNG:
```bash
# Using ImageMagick
convert -background none icons/icon16.svg icons/icon16.png
convert -background none icons/icon48.svg icons/icon48.png
convert -background none icons/icon128.svg icons/icon128.png
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Guidelines
- Follow existing code style
- Add comments for complex logic
- Update documentation as needed
- Test your changes thoroughly

---

## 📋 Roadmap

- [x] Dark Mode / Light Mode / Default theme
- [ ] Per-site theme preferences
- [ ] Scheduled theme switching (auto dark mode at night)
- [ ] Custom color themes
- [ ] Productivity timer
- [ ] Tab management features
- [ ] Reading mode
- [ ] More productivity tools...

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

> **Note:** Update these links in `config.js` to change them everywhere in the extension.

- **GitHub**: [https://github.com/Vibe-coder-ss/masterG](https://github.com/Vibe-coder-ss/masterG)
- **Issues**: [Report a bug or request a feature](https://github.com/Vibe-coder-ss/masterG/issues)
- **Discussion**: [Join the conversation](https://github.com/Vibe-coder-ss/masterG/discussions)

---

## 💖 Support

If you find masterG helpful, please consider:
- ⭐ **Starring** the repository
- 📢 **Sharing** with friends
- 🐛 **Reporting** bugs or issues
- 💡 **Suggesting** new features

---

<p align="center">
  <strong>Made with ❤️ by the masterG Team</strong>
  <br>
  <em>Privacy First • Open Source • User Focused</em>
</p>