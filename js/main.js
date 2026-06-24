import { TrainingApp } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    window.app = new TrainingApp();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered:', registration))
            .catch(err => console.log('SW registration failed:', err));
    });
}
