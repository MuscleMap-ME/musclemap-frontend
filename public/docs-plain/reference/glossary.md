# Glossary

> Definitions of terms used throughout MuscleMap.

---

## A

**Achievement**
A badge or reward earned by completing specific goals or milestones in MuscleMap.

**Activation (Muscle)**
The percentage of engagement a muscle experiences during an exercise. Higher activation means more work for that muscle.

**Archetype**
A training philosophy or path that defines your fitness identity. Examples: Bodybuilder, Powerlifter, Athlete.

**APQ (Automatic Persisted Queries)**
A GraphQL optimization that caches query documents on the server to reduce bandwidth.

---

## B

**Bcrypt**
The password hashing algorithm used by MuscleMap. Passwords are hashed with cost factor 12.

---

## C

**Compound Exercise**
An exercise that works multiple muscle groups simultaneously. Examples: Squat, Deadlift, Bench Press.

**Credits**
MuscleMap's virtual currency used to generate AI workouts and access premium features.

**Crew**
A team of users (3-50) who train together, share goals, and compete as a group.

**Cursor (Pagination)**
A pointer used in keyset pagination to mark the position in a list. Enables efficient "load more" functionality.

---

## D

**1RM (One Rep Max)**
The maximum weight you can lift for a single repetition of an exercise.

---

## E

**Epley Formula**
The formula used to estimate 1RM from multiple reps: `1RM = weight × (1 + reps/30)`

---

## F

**Fastify**
The Node.js web framework used for MuscleMap's API server. Chosen for performance and TypeScript support.

**Feed**
The activity stream showing workouts and achievements from users you follow.

---

## G

**GraphQL**
The query language and API protocol used by MuscleMap. All data operations go through a single GraphQL endpoint.

**GTG (Grease the Groove)**
A training method involving frequent sub-maximal sets throughout the day to increase strength/endurance.

---

## H

**High Five**
A quick encouragement gesture sent to other users after workouts or achievements.

**Hypertrophy**
Muscle growth through training. The Bodybuilder archetype focuses on hypertrophy.

---

## I

**Isolation Exercise**
An exercise that targets a single muscle group. Examples: Bicep Curl, Leg Extension.

---

## J

**JWT (JSON Web Token)**
The authentication token format used by MuscleMap. Contains encoded user information and expires after 24 hours.

---

## K

**Keyset Pagination**
The pagination method used by MuscleMap. More efficient than OFFSET pagination, especially for large datasets.

**Knex.js**
The SQL query builder used by MuscleMap's backend for database operations.

---

## L

**Leaderboard**
Ranked lists comparing users by TU, streaks, or other metrics.

**Level**
Your progression rank in MuscleMap, determined by total TU earned. Levels range from 1 to 50+.

---

## M

**Mercurius**
The GraphQL adapter used with Fastify for MuscleMap's API.

**Mind-Muscle Connection**
The conscious focus on engaging a specific muscle during exercise. Can increase activation.

**Minimalist Mode**
A privacy setting that hides your activity from leaderboards and public features.

**Mutation**
A GraphQL operation that modifies data (create, update, delete).

---

## N

**N+1 Query**
A performance anti-pattern where a query is executed inside a loop, causing excessive database calls.

---

## O

**OAuth**
An authentication protocol that allows login via third parties (Google, Apple, etc.).

---

## P

**PM2**
The Node.js process manager used to run MuscleMap's API server in production.

**PostgreSQL**
The relational database used by MuscleMap for all data storage.

**PR (Personal Record)**
Your best performance for a specific exercise. MuscleMap tracks PRs for all exercises.

**Prescription Engine**
The AI system that generates personalized workout recommendations.

---

## Q

**Query**
A GraphQL operation that reads data without modifying it.

---

## R

**Redis**
The in-memory cache used by MuscleMap for session data, rate limiting, and query caching.

**Rep (Repetition)**
A single complete movement of an exercise. Multiple reps make a set.

**Rivalry**
A head-to-head competition between two users over a set period.

**ROM (Range of Motion)**
The full path of movement for an exercise. Full ROM generally provides better muscle activation.

**RPE (Rate of Perceived Exertion)**
A 1-10 scale measuring how hard a set felt. RPE 10 = maximum effort.

**RIR (Reps in Reserve)**
How many more reps you could have done after finishing a set. RIR 0 = complete failure.

---

## S

**Set**
A group of consecutive repetitions of an exercise, followed by rest.

**Streak**
Consecutive days with logged workouts. Breaking a streak resets the count.

**Superset**
Two exercises performed back-to-back with no rest between them.

---

## T

**TU (Training Units)**
MuscleMap's proprietary metric for measuring workout volume. Accounts for muscle size, activation, and volume.

**Template (Workout)**
A saved workout that can be repeated without using credits.

**Three.js**
The JavaScript library used for 3D muscle visualization in MuscleMap.

**Time Under Tension**
The total time a muscle is under load during a set. Important for hypertrophy.

**Token**
See JWT.

---

## U

**UUID**
Universally Unique Identifier. MuscleMap uses UUIDs for all database IDs.

---

## V

**Vite**
The frontend build tool used for MuscleMap's React web application.

---

## W

**Wealth Tier**
A visual indicator on profiles showing accumulated credit balance (Bronze through Obsidian).

**WOD (Workout of the Day)**
A daily workout, often used in CrossFit-style training.

---

## Z

**Zod**
The TypeScript-first validation library used for input validation throughout MuscleMap.

**Zustand**
The state management library used for UI state in MuscleMap's frontend.

---

*Last updated: 2026-01-15*
