export const motivationalQuotes = [
    "Push yourself, because no one else is going to do it for you!",
    "The pain you feel today will be the strength you feel tomorrow.",
    "Success starts with self-discipline.",
    "Don't limit your challenges. Challenge your limits!",
    "Strength does not come from the physical capacity. It comes from an indomitable will.",
    "The only bad workout is the one that didn't happen.",
    "Make yourself proud.",
    "Your body can stand almost anything. It's your mind you have to convince."
];

// Default ("std") exercises per program. Names match the catalog in `exercises.js`.
// Users can customise these in the workout screen; their choices are saved per program.
export const programs = {
    'chest-triceps': {
        name: 'Chest & Triceps',
        exercises: [
            'Bench Press',
            'Incline Bench Press',
            'Pec Deck',
            'Triceps Pushdown',
            'Overhead Triceps Extension'
        ]
    },
    'shoulder-biceps': {
        name: 'Shoulder & Biceps',
        exercises: [
            'Shoulder Press',
            'Lateral Raise',
            'Reverse Flies',
            'Dumbbell Curl',
            'Hammer Curl'
        ]
    },
    'shoulder': {
        name: 'Shoulder',
        exercises: [
            'Shoulder Press',
            'Lateral Raise',
            'Reverse Flies'
        ]
    },
    'back': {
        name: 'PullPass',
        exercises: [
            'Pull-ups / Chins',
            'Lat Pulldown',
            'Seated Cable Row',
            'Barbell Row'
        ]
    },
    'legs': {
        name: 'Legs',
        exercises: [
            'Squats',
            'Leg Press',
            'Lying Leg Curl',
            'Leg Extension',
            'Hip Thrusters'
        ]
    },
    'glutes': {
        name: 'Glutes',
        exercises: [
            'Hip Thrusters',
            'Bulgarian Split Squat',
            'Romanian Deadlift'
        ]
    },
    'abs': {
        name: 'Abs',
        exercises: [
            'Rope Crunch',
            'Hanging Leg Raise'
        ]
    },
    'arms': {
        name: 'Arms',
        exercises: [
            'Dumbbell Curl',
            'Hammer Curl',
            'Triceps Pushdown',
            'Overhead Triceps Extension'
        ]
    },
    'chest': {
        name: 'Chest',
        exercises: [
            'Machine Chest Press',
            'Machine Incline Press',
            'Pec Deck'
        ]
    }
};
