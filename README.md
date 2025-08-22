# Training Tracker - Mobile Workout App

A modern, mobile-friendly web application for tracking your workouts and progress. Built with vanilla HTML, CSS, and JavaScript, this Progressive Web App (PWA) provides the same functionality as your tkinter desktop app but optimized for mobile use.

## 🚀 Features

### Core Functionality
- **4 Training Programs**: Chest & Triceps, Shoulder & Biceps, Back, and Legs
- **Exercise Tracking**: Record weight, reps, and sets for each exercise
- **Workout History**: View all your saved workouts with filtering options
- **Progress Tracking**: Visual charts showing your strength progression over time
- **Mobile-First Design**: Optimized for phone use during workouts

### Technical Features
- **Progressive Web App**: Install on your phone like a native app
- **Offline Support**: Works without internet connection
- **Local Storage**: All data stored locally on your device
- **Responsive Design**: Adapts to any screen size
- **Dark Theme**: Easy on the eyes during workouts

## 📱 How to Use

### 1. Access the App
- Open the app in your phone's web browser
- Or install it as a PWA for app-like experience

### 2. Start a Workout
- Choose your training program from the main menu
- Enter weight, reps, and sets for each exercise
- Save your workout when finished

### 3. Track Progress
- View workout history with filtering options
- Check progress charts for specific exercises
- Monitor your strength improvements over time

## 🛠️ Setup & Installation

### Option 1: Local Development Server
```bash
# Navigate to the project directory
cd training_app_webb

# Start a local server (Python 3)
python -m http.server 8000

# Or use Node.js if available
npx serve .

# Open in browser: http://localhost:8000
```

### Option 2: Deploy to Web Server
1. Upload all files to your web server
2. Ensure HTTPS is enabled (required for PWA features)
3. Access via your domain

### Option 3: GitHub Pages
1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. Access via `https://username.github.io/repository-name`

## 📁 File Structure

```
training_app_webb/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── app.js             # Main JavaScript application
├── manifest.json      # PWA manifest for mobile installation
├── sw.js             # Service worker for offline functionality
├── README.md          # This file
└── programs/          # Original tkinter program files
    ├── chest_triceps.py
    ├── shoulder_biceps.py
    ├── back.py
    └── legs.py
```

## 🔧 Configuration

### Customizing Exercises
Edit the `programs` object in `app.js` to modify:
- Exercise names
- Number of exercises per program
- Program names and descriptions

### Styling
Modify `styles.css` to customize:
- Color scheme (CSS variables in `:root`)
- Layout and spacing
- Typography and visual elements

## 📊 Data Storage

- **Local Storage**: All workout data is stored in your browser's local storage
- **No Server Required**: Works completely offline
- **Data Persistence**: Your workouts are saved between sessions
- **Export/Import**: Data can be exported via browser developer tools

## 🌐 Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Samsung Internet
- **PWA Support**: Chrome, Edge, Safari (iOS 11.3+)

## 🚀 PWA Installation

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (⋮) → "Add to Home screen"
3. Follow the prompts to install

### iOS (Safari)
1. Open the app in Safari
2. Tap the share button (□↑)
3. Select "Add to Home Screen"
4. Tap "Add"

## 🔒 Privacy & Security

- **No Data Collection**: All data stays on your device
- **No Analytics**: No tracking or external services
- **Local Only**: No internet connection required after initial load
- **Open Source**: Transparent code for security review

## 🎯 Future Enhancements

- [ ] Exercise library with descriptions and form tips
- [ ] Rest timer functionality
- [ ] Workout templates and routines
- [ ] Data export/import functionality
- [ ] Social sharing of achievements
- [ ] Integration with fitness trackers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 💪 Motivation

Remember: "The only bad workout is the one that didn't happen." 

Track your progress, stay consistent, and watch yourself grow stronger every day!

---

**Built with ❤️ for fitness enthusiasts who want to track their progress on the go.**
