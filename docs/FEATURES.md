# MuscleMap Features

## User Authentication

### Registration & Login
- Email/password registration with validation
- JWT-based authentication
- Secure password hashing with bcrypt
- 7-day token expiration

### User Profile
- Username and display name
- Avatar support
- Privacy settings
- Account management

## Onboarding

### Archetype Selection
New users choose their training archetype:

| Archetype | Focus | Description |
|-----------|-------|-------------|
| Bodybuilder | Aesthetic muscle building | Hypertrophy-focused training |
| Powerlifter | Strength | Big 3 compound lifts |
| Gymnast | Bodyweight mastery | Calisthenics progression |
| CrossFit | Functional fitness | High-intensity varied workouts |
| Martial Artist | Combat conditioning | Strike power & endurance |
| Runner | Endurance | Leg strength & cardio |
| Climber | Grip & pull strength | Upper body focus |
| Strongman | Functional strength | Odd object training |
| Functional | General fitness | Balanced training |
| Swimmer | Aquatic conditioning | Full body endurance |

### Equipment Setup
Users specify available equipment:
- **Bodyweight Only** - No equipment needed
- **Kettlebells** - Single or double kettlebell training
- **Full Gym** - Barbells, dumbbells, machines
- **Pull-up Bar** - Optional for bodyweight/kettlebell users

## Dashboard

### Quick Stats
- Total Training Units (TU) earned
- Current level and archetype
- Workout streak
- Credit balance

### Quick Actions
- Start Workout
- Browse Exercise Library
- View Journey Progress
- Community Feed

### Contextual Tips
- Personalized guidance based on workout history
- Dismissible tip cards
- Progressive insights as user advances

## Workout System

### Workout Generation
The prescription engine generates personalized workouts:
- Considers user's archetype and level
- Accounts for available equipment
- Balances muscle activation across workout
- Avoids recently worked muscles

### Exercise Library
90+ exercises across categories:

**Exercise Types:**
- Bodyweight (push-ups, pull-ups, squats, etc.)
- Kettlebell (swings, cleans, Turkish get-ups)
- Freeweight (barbell, dumbbell exercises)

**Metadata per Exercise:**
- Difficulty level (1-5)
- Primary muscles targeted
- Equipment required/optional
- Valid locations (gym, home, park, hotel, office, travel)
- Estimated duration
- Rest period
- Movement pattern (push, pull, squat, hinge, core, etc.)

### Muscle Activation
Each exercise has scientifically-based muscle activations:
- Primary muscles with high activation (60-100%)
- Secondary muscles with moderate activation (20-59%)
- Stabilizer muscles with low activation (5-19%)

### Training Units (TU)
Proprietary metric for workout volume:
```
TU = sum(muscleActivation / biasWeight) × 100
```
- Normalizes across muscle sizes
- Enables fair comparison between workouts
- Tracks cumulative progress

### Workout Logging
- Set-by-set tracking
- Rep and weight logging
- RPE (Rate of Perceived Exertion) optional
- Notes per set
- Workout completion with TU calculation

## Progression System

### Archetype Levels
Each archetype has 10+ progression levels:
- Level names themed to archetype
- TU thresholds for advancement
- Muscle-specific targets per level
- Unique descriptions and philosophies

### Milestones
Achievement system with:
- Workout count milestones
- TU accumulation milestones
- Streak achievements
- Muscle balance achievements

### Journey Page
Comprehensive progress tracking:
- Current level and archetype info
- Progress toward next level
- Weekly workout chart
- Muscle balance heatmap
- Recent milestones achieved

## Exercise Library Browser

### Search & Filter
- Search by exercise name
- Search by muscle group
- Filter by type (bodyweight, kettlebell, freeweight)

### Exercise Details
- Difficulty rating
- Description and cues
- Primary muscles targeted
- Equipment requirements
- Available locations
- Duration and rest timing

## Credit Economy

### Credit System
- 100 credits on registration
- 25 credits per workout
- Credit purchase options
- Transaction history

### Entitlements
Access control based on:
- Trial period (new users)
- Active subscription
- Credit balance

### Subscriptions
Stripe integration for:
- Monthly subscription
- Unlimited workout access
- Subscription management

## Social Features

### Community Dashboard
- Activity feed
- Privacy-respecting event display
- Community statistics

### Leaderboard
- Global TU rankings
- Workout count rankings
- Weekly/monthly periods

### High Fives
- Send encouragement to other users
- Recognition system
- Notification of received high fives

### Competitions
- Challenge events
- Participant leaderboards
- Competition details and rules

### Direct Messaging
- Private conversations
- Real-time updates (WebSocket)
- Message history

## Settings

### User Settings
- Profile editing
- Display preferences
- Notification settings
- Privacy controls

### Account
- Password change
- Email update
- Account deletion

## Admin Features

### Admin Control Panel
- User management
- Content moderation
- System statistics
- Manual credit adjustments

## Technical Features

### HTTP Client
The `@musclemap/client` package provides:
- Automatic retry with exponential backoff
- Request caching (30s TTL for GET)
- Schema validation with TypeBox
- Auth token management
- Unauthorized handler callbacks

### Error Handling
- Consistent error format across API
- User-friendly error messages
- Error boundary protection in UI
- Structured logging

### Performance
- PostgreSQL connection pooling
- Request rate limiting
- Database query optimization
- Indexed queries for hot paths

### Security
- JWT authentication
- Password hashing (bcrypt)
- SQL parameterization
- Input validation (Zod/TypeBox)
- CORS configuration
