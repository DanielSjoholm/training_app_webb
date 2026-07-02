const CACHE_NAME = 'training-tracker-v20';
const ASSETS = [
    '',
    'index.html',
    'styles.css',
    'manifest.json',
    'js/main.js',
    'js/app.js',
    'js/programs.js',
    'js/exercises.js',
    'js/storage.js',
    'js/config.js',
    'js/supabase.js',
    'js/auth.js',
    'js/friends.js',
    'images/gym_v2.png',
    'images/gym_light.jpg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            const base = self.registration.scope;
            return cache.addAll(ASSETS.map(p => base + p));
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
});
