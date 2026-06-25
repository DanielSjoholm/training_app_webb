// Master exercise catalog. Each exercise has a name, the muscle groups it targets,
// and optionally a list of equipment/attachment variants. An exercise may also carry
// subVariants — a second choice asked after the variant (e.g. attachment then direction),
// producing a name like "Cable Curl (Handle, Front)".
export const exerciseCatalog = [
    // Chest
    { name: 'Bench Press', groups: ['chest'] },
    { name: 'Incline Bench Press', groups: ['chest'] },
    { name: 'Decline Bench Press', groups: ['chest'] },
    { name: 'Dumbbell Bench Press', groups: ['chest'] },
    { name: 'Incline Dumbbell Press', groups: ['chest'] },
    { name: 'Machine Chest Press', groups: ['chest'] },
    { name: 'Machine Incline Press', groups: ['chest'] },
    { name: 'Pec Deck', groups: ['chest'] },
    { name: 'Cable Fly', groups: ['chest'] },
    { name: 'Cable Crossover', groups: ['chest'] },
    { name: 'Chest Dips', groups: ['chest'] },

    // Triceps
    { name: 'Triceps Pushdown', groups: ['triceps'], variants: ['Bar', 'Rope', 'Handle'] },
    { name: 'Overhead Triceps Extension', groups: ['triceps'], variants: ['Bar', 'Rope', 'Handle'] },
    { name: 'Skull Crushers', groups: ['triceps'] },
    { name: 'Close-Grip Bench Press', groups: ['triceps'] },
    { name: 'Triceps Kickback', groups: ['triceps'], variants: ['Dumbbell', 'Cable'] },
    { name: 'Bench Dips', groups: ['triceps'] },

    // Biceps
    { name: 'Barbell Curl', groups: ['biceps'] },
    { name: 'EZ-Bar Curl', groups: ['biceps'] },
    { name: 'Dumbbell Curl', groups: ['biceps'] },
    { name: 'Hammer Curl', groups: ['biceps'], variants: ['Dumbbell', 'Cable'] },
    { name: 'Cable Curl', groups: ['biceps'], variants: ['Bar', 'Rope', 'Handle'], subVariants: ['Front', 'Back'] },
    { name: 'Preacher Curl', groups: ['biceps'] },
    { name: 'Concentration Curl', groups: ['biceps'] },
    { name: 'Incline Dumbbell Curl', groups: ['biceps'] },
    { name: 'Spider Curl', groups: ['biceps'] },

    // Shoulders
    { name: 'Shoulder Press', groups: ['shoulders'], variants: ['Barbell', 'Dumbbell', 'Machine'] },
    { name: 'Arnold Press', groups: ['shoulders'] },
    { name: 'Lateral Raise', groups: ['shoulders'], variants: ['Dumbbell', 'Cable'] },
    { name: 'Reverse Flies', groups: ['shoulders'], variants: ['Dumbbell', 'Machine', 'Cable'] },
    { name: 'Front Raise', groups: ['shoulders'], variants: ['Dumbbell', 'Cable', 'Plate'] },
    { name: 'Face Pull', groups: ['shoulders'] },
    { name: 'Upright Row', groups: ['shoulders'], variants: ['Barbell', 'Cable'] },
    { name: 'Shrugs', groups: ['shoulders'], variants: ['Barbell', 'Dumbbell'] },

    // Back
    { name: 'Pull-ups / Chins', groups: ['back'] },
    { name: 'Lat Pulldown', groups: ['back'], variants: ['Wide', 'Close', 'Single Arm'] },
    { name: 'Seated Cable Row', groups: ['back'] },
    { name: 'Wide Machine Row', groups: ['back'] },
    { name: 'Barbell Row', groups: ['back'] },
    { name: 'Dumbbell Row', groups: ['back'] },
    { name: 'T-Bar Row', groups: ['back'] },
    { name: 'Chest Supported T-Bar Row', groups: ['back'] },
    { name: 'Straight-Arm Pulldown', groups: ['back'] },
    { name: 'Deadlift', groups: ['back', 'legs'] },
    { name: 'Hyperextension', groups: ['back'] },

    // Legs
    { name: 'Squats', groups: ['legs'] },
    { name: 'Front Squat', groups: ['legs'] },
    { name: 'Hack Squat', groups: ['legs'] },
    { name: 'Leg Press', groups: ['legs'] },
    { name: 'Leg Extension', groups: ['legs'] },
    { name: 'Lying Leg Curl', groups: ['legs'] },
    { name: 'Seated Leg Curl', groups: ['legs'] },
    { name: 'Standing Calf Raise', groups: ['legs'] },
    { name: 'Seated Calf Raise', groups: ['legs'] },

    // Glutes
    { name: 'Hip Thrusters', groups: ['glutes', 'legs'] },
    { name: 'Bulgarian Split Squat', groups: ['glutes', 'legs'] },
    { name: 'Romanian Deadlift', groups: ['glutes', 'legs'] },
    { name: 'Glute Bridge', groups: ['glutes'] },
    { name: 'Cable Kickback', groups: ['glutes'] },
    { name: 'Sumo Deadlift', groups: ['glutes', 'legs'] },
    { name: 'Glute Machine', groups: ['glutes'] },
    { name: 'Hip Abduction', groups: ['glutes'] },

    // Abs
    { name: 'Rope Crunch', groups: ['abs'] },
    { name: 'Cable Crunch', groups: ['abs'] },
    { name: 'Toes To Bar', groups: ['abs'] },
    { name: 'Hanging Leg Raise', groups: ['abs'] },
    { name: 'Leg Raises', groups: ['abs'] }
];

// Which muscle groups each program draws from (used to filter the add-exercise list).
export const programGroups = {
    'chest-triceps': ['chest', 'triceps'],
    'shoulder-biceps': ['shoulders', 'biceps'],
    'shoulder': ['shoulders'],
    'back': ['back'],
    'legs': ['legs'],
    'glutes': ['glutes'],
    'abs': ['abs'],
    'arms': ['biceps', 'triceps'],
    'chest': ['chest']
};

// Catalog exercises available for a program, in catalog order.
export function exercisesForProgram(programKey) {
    const groups = programGroups[programKey] || [];
    return exerciseCatalog.filter(ex => ex.groups.some(g => groups.includes(g)));
}
