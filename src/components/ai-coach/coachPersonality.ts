/**
 * Coach Personality & Response Library
 *
 * Contains all pre-defined responses, motivational quotes, form tips,
 * recovery suggestions, and context-aware message generation.
 */

// Time-based greeting selection
export function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'late';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

export function getGreetingMessage(userName = 'Athlete', timeOfDay = getTimeGreeting()) {
  const greetings = {
    morning: [
      `Good morning, ${userName}! Ready to crush it today?`,
      `Rise and grind, ${userName}! Early bird gets the gains.`,
      `Morning, ${userName}! Your muscles missed you. Let's wake them up.`,
    ],
    afternoon: [
      `Good afternoon, ${userName}! Perfect time for a workout.`,
      `Hey ${userName}! Taking a break? Let's make it productive.`,
      `Afternoon, ${userName}! The gym is calling your name.`,
    ],
    evening: [
      `Good evening, ${userName}! Time to destress with some lifts?`,
      `Hey ${userName}! Evening workouts hit different.`,
      `Evening, ${userName}! Let's end the day strong.`,
    ],
    night: [
      `Late night session, ${userName}? I respect the dedication.`,
      `Burning the midnight oil, ${userName}? Let's plan tomorrow's gains.`,
      `Night owl workout? I'm here for it, ${userName}.`,
    ],
    late: [
      `${userName}! Burning the late-night oil? Remember, rest is part of the gains.`,
      `Still up, ${userName}? Let's plan an epic workout for when you're rested.`,
    ],
  };

  const options = greetings[timeOfDay] || greetings.afternoon;
  return options[Math.floor(Math.random() * options.length)];
}

// Motivational quotes
export const MOTIVATIONAL_QUOTES = [
  "The pain you feel today will be the strength you feel tomorrow.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Success starts with self-discipline.",
  "Don't count the days, make the days count.",
  "The only bad workout is the one that didn't happen.",
  "You don't have to be great to start, but you have to start to be great.",
  "Every champion was once a contender who refused to give up.",
  "Strive for progress, not perfection.",
  "The harder you work, the luckier you get.",
  "Discipline is choosing between what you want now and what you want most.",
  "Your only limit is you.",
  "Winners train, losers complain.",
  "If it doesn't challenge you, it won't change you.",
  "The difference between try and triumph is a little umph.",
  "Fall seven times, stand up eight.",
  "Success isn't owned. It's rented, and rent is due every day.",
  "Train insane or remain the same.",
  "What seems impossible today will become your warm-up tomorrow.",
  "Sweat is just fat crying.",
  "No excuses. Just results.",
];

// Form tips by exercise category
export const FORM_TIPS = {
  push: [
    "Bench press: Keep your shoulder blades pinched together and drive through your heels.",
    "Push-ups: Engage your core and keep a straight line from head to heels.",
    "Overhead press: Brace your core tight - think of it as a standing plank.",
    "Dips: Lean slightly forward for chest focus, stay upright for triceps.",
  ],
  pull: [
    "Deadlift: Keep the bar close to your body - it should scrape your shins.",
    "Pull-ups: Initiate with your lats, not your arms. Imagine pulling your elbows down.",
    "Rows: Squeeze your shoulder blades together at the top of each rep.",
    "Lat pulldown: Pull to your chest, not behind your neck.",
  ],
  legs: [
    "Squats: Push your knees out over your toes and keep your chest up.",
    "Lunges: Take big steps - your front knee should track over your ankle.",
    "Romanian deadlifts: Feel the stretch in your hamstrings by pushing your hips back.",
    "Leg press: Don't lock out your knees at the top.",
  ],
  core: [
    "Planks: Don't let your hips sag or pike up. Neutral spine always.",
    "Crunches: Think about bringing your ribs to your hips, not just lifting your head.",
    "Dead bugs: Press your lower back into the floor throughout the movement.",
    "Russian twists: Keep your chest lifted and rotate from your core, not arms.",
  ],
  general: [
    "Breathe out during the effort (concentric), breathe in during the return (eccentric).",
    "Control the weight - if you're bouncing or swinging, it's too heavy.",
    "Full range of motion > heavy weight with partial reps.",
    "Mind-muscle connection: visualize the target muscle working.",
    "Rest 60-90 seconds between sets for hypertrophy, 3-5 minutes for strength.",
  ],
};

// Recovery suggestions
export const RECOVERY_SUGGESTIONS = [
  "Consider adding 5-10 minutes of stretching after your workout for better recovery.",
  "Sleep is when the magic happens - aim for 7-9 hours for optimal muscle recovery.",
  "Foam rolling can help reduce muscle soreness and improve mobility.",
  "Active recovery like walking or light swimming can speed up recovery between sessions.",
  "Stay hydrated! Aim for at least half your body weight (lbs) in ounces of water.",
  "Consider contrast showers (alternating hot/cold) to boost recovery.",
  "Protein within 30-60 minutes post-workout helps maximize muscle protein synthesis.",
  "Taking a rest day isn't weakness - it's when your muscles actually grow.",
  "Stressed out? Cortisol can hurt your gains. Try meditation or deep breathing.",
  "Massage or self-myofascial release can help break up muscle adhesions.",
];

// Workout suggestions based on time of day
export const WORKOUT_SUGGESTIONS = {
  morning: [
    "Morning workouts boost metabolism all day. How about some compound movements?",
    "High-energy morning? Perfect for leg day - burn those calories early!",
    "Start your day with some dynamic stretching and a push workout.",
  ],
  afternoon: [
    "Afternoon is peak strength time for most people. Hit those heavy lifts!",
    "Perfect time for a full-body workout to break up your day.",
    "Consider a HIIT session - you've got the energy mid-day.",
  ],
  evening: [
    "Evening workouts help destress. How about a challenging pull session?",
    "Wind down with some moderate intensity training and stretching.",
    "Great time for upper body work - your mobility is at its best.",
  ],
  night: [
    "For late sessions, keep it moderate to not disrupt sleep.",
    "Consider yoga or mobility work to prepare for quality rest.",
    "Light resistance work can help tire you out for better sleep.",
  ],
};

// Quick responses for common queries
export const QUICK_RESPONSES = {
  greeting: [
    "Hey there! How can I help you crush your fitness goals today?",
    "What's up, champ? Ready to make some gains?",
    "Hey! I'm here to help. What's on your mind?",
  ],
  thanks: [
    "You're welcome! Now go crush it!",
    "Anytime! That's what I'm here for.",
    "No problem! Remember, consistency is key.",
  ],
  goodbye: [
    "Keep pushing! See you next session.",
    "Rest up and come back stronger!",
    "Later! Remember, every workout counts.",
  ],
  confusion: [
    "I'm not sure I understand. Try asking about workouts, form tips, or motivation!",
    "Hmm, could you rephrase that? I'm best at workout advice and motivation.",
    "I didn't quite catch that. Want a workout suggestion or some motivation?",
  ],
};

// Exercise card data for rich responses
export const SUGGESTED_EXERCISES = {
  push: [
    { name: 'Bench Press', muscles: ['Chest', 'Triceps', 'Shoulders'], sets: '4x8-10' },
    { name: 'Overhead Press', muscles: ['Shoulders', 'Triceps'], sets: '3x8-12' },
    { name: 'Incline Dumbbell Press', muscles: ['Upper Chest', 'Shoulders'], sets: '3x10-12' },
    { name: 'Tricep Dips', muscles: ['Triceps', 'Chest'], sets: '3x12-15' },
  ],
  pull: [
    { name: 'Deadlift', muscles: ['Back', 'Hamstrings', 'Glutes'], sets: '4x5' },
    { name: 'Pull-ups', muscles: ['Lats', 'Biceps', 'Core'], sets: '4x8-12' },
    { name: 'Barbell Rows', muscles: ['Back', 'Biceps'], sets: '4x8-10' },
    { name: 'Face Pulls', muscles: ['Rear Delts', 'Traps'], sets: '3x15-20' },
  ],
  legs: [
    { name: 'Squats', muscles: ['Quads', 'Glutes', 'Core'], sets: '4x6-8' },
    { name: 'Romanian Deadlifts', muscles: ['Hamstrings', 'Glutes'], sets: '3x10-12' },
    { name: 'Leg Press', muscles: ['Quads', 'Glutes'], sets: '4x10-12' },
    { name: 'Walking Lunges', muscles: ['Quads', 'Glutes', 'Core'], sets: '3x12 each' },
  ],
};

// Generate a contextual response based on user input
export function generateResponse(input, userContext = {}) {
  const lowerInput = input.toLowerCase().trim();

  // Greeting detection
  if (lowerInput.match(/^(hi|hello|hey|sup|yo|good morning|good afternoon|good evening)/)) {
    return {
      type: 'text',
      content: getGreetingMessage(userContext.name),
    };
  }

  // Thanks detection
  if (lowerInput.match(/(thank|thanks|thx|appreciate)/)) {
    const responses = QUICK_RESPONSES.thanks;
    return {
      type: 'text',
      content: responses[Math.floor(Math.random() * responses.length)],
    };
  }

  // Goodbye detection
  if (lowerInput.match(/(bye|goodbye|later|see ya|cya|gotta go)/)) {
    const responses = QUICK_RESPONSES.goodbye;
    return {
      type: 'text',
      content: responses[Math.floor(Math.random() * responses.length)],
    };
  }

  // Motivation request
  if (lowerInput.match(/(motivat|inspire|pump|encourage|hype)/)) {
    return {
      type: 'motivation',
      content: MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)],
    };
  }

  // Form tips
  if (lowerInput.match(/(form|technique|how to|tip|advice)/)) {
    const category = detectExerciseCategory(lowerInput);
    const tips = FORM_TIPS[category] || FORM_TIPS.general;
    return {
      type: 'tip',
      content: tips[Math.floor(Math.random() * tips.length)],
      category,
    };
  }

  // Recovery
  if (lowerInput.match(/(recover|rest|sore|tired|fatigue|sleep)/)) {
    return {
      type: 'recovery',
      content: RECOVERY_SUGGESTIONS[Math.floor(Math.random() * RECOVERY_SUGGESTIONS.length)],
    };
  }

  // Workout suggestion
  if (lowerInput.match(/(workout|exercise|train|session|routine|program)/)) {
    const timeOfDay = getTimeGreeting();
    const suggestions = WORKOUT_SUGGESTIONS[timeOfDay] || WORKOUT_SUGGESTIONS.afternoon;
    const category = detectExerciseCategory(lowerInput);

    return {
      type: 'workout',
      content: suggestions[Math.floor(Math.random() * suggestions.length)],
      exercises: SUGGESTED_EXERCISES[category] || SUGGESTED_EXERCISES.push,
      category,
    };
  }

  // Progress check
  if (lowerInput.match(/(progress|stats|how am i|doing|track)/)) {
    return {
      type: 'progress',
      content: getProgressMessage(userContext),
    };
  }

  // Default - offer options
  return {
    type: 'text',
    content: QUICK_RESPONSES.confusion[Math.floor(Math.random() * QUICK_RESPONSES.confusion.length)],
    showQuickActions: true,
  };
}

// Helper: detect exercise category from text
function detectExerciseCategory(text) {
  if (text.match(/(push|chest|bench|press|tricep|shoulder|dip)/)) return 'push';
  if (text.match(/(pull|back|row|deadlift|lat|bicep|curl)/)) return 'pull';
  if (text.match(/(leg|squat|lunge|calf|hamstring|glute|quad)/)) return 'legs';
  if (text.match(/(core|ab|plank|crunch)/)) return 'core';
  return 'general';
}

// Helper: generate progress message
function getProgressMessage(context) {
  const { workoutsThisWeek = 0, streak = 0, totalWorkouts = 0 } = context;

  const messages = [
    `You've completed ${workoutsThisWeek} workouts this week. ${workoutsThisWeek >= 3 ? 'Great consistency!' : 'Let\'s hit that 3+ goal!'}`,
    streak > 0
      ? `${streak} day streak! Keep the momentum going!`
      : `No streak yet - today's a perfect day to start one!`,
    totalWorkouts > 0
      ? `${totalWorkouts} total workouts logged. Every rep counts!`
      : `Ready to log your first workout? I'll be here cheering you on!`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

// Coach personality traits
export const COACH_PERSONALITY = {
  name: 'Max',
  title: 'Your AI Training Partner',
  traits: ['Encouraging', 'Knowledgeable', 'Motivating', 'Patient'],
  catchphrases: [
    "Let's get after it!",
    "Gains incoming!",
    "One rep at a time!",
    "You've got this!",
  ],
};

export default {
  getTimeGreeting,
  getGreetingMessage,
  generateResponse,
  COACH_PERSONALITY,
  MOTIVATIONAL_QUOTES,
  FORM_TIPS,
  RECOVERY_SUGGESTIONS,
  WORKOUT_SUGGESTIONS,
  SUGGESTED_EXERCISES,
};
