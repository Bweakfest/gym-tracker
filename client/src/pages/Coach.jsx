import { useState, useRef, useEffect } from 'react';

/* ─── 100+ fitness knowledge templates ─── */
const TEMPLATES = [
  // ─── CHEST EXERCISES ───
  { keys: ['bench press', 'chest press', 'barbell bench'], cat: 'exercise',
    a: `**Barbell Bench Press — The King of Chest Exercises**\n\n**How to perform:**\n1. Lie flat, feet planted, slight arch in lower back\n2. Grip bar ~1.5x shoulder width\n3. Unrack, lower to mid-chest with elbows at ~75 degrees\n4. Press up explosively, lock out\n\n**Programming:**\n- Strength: 4x5 @ 80-85% 1RM\n- Hypertrophy: 4x8-12 @ 65-75% 1RM\n\n**Common mistakes:** Flaring elbows to 90 degrees, bouncing off chest, lifting hips off bench.\n\n**Pro tip:** Use leg drive — press your feet into the floor to generate full-body tension.` },

  { keys: ['incline press', 'upper chest', 'incline bench', 'incline dumbbell'], cat: 'exercise',
    a: `**Incline Press — Upper Chest Builder**\n\nSet bench to 30-45 degrees. Steeper = more front delt, flatter = more mid-chest. 30 degrees is the sweet spot for most people.\n\n**Dumbbell version (recommended):**\n- Greater ROM and stretch at the bottom\n- 3-4 sets of 8-12 reps\n- Lower slowly (3 sec), press with control\n\n**Barbell version:**\n- Better for progressive overload\n- 4 sets of 6-8 reps\n\n**Superset idea:** Pair with cable flyes for a massive pump.` },

  { keys: ['chest fly', 'cable fly', 'pec fly', 'cable crossover', 'flyes'], cat: 'exercise',
    a: `**Chest Flyes — Maximum Stretch & Isolation**\n\n**Cable Flyes (best option):**\n- Constant tension throughout ROM\n- Set pulleys to shoulder height for mid-chest\n- High pulleys = lower chest emphasis\n- Low pulleys = upper chest emphasis\n- 3-4 sets of 12-15 reps\n\n**Dumbbell Flyes:**\n- Great stretch at bottom but tension drops at top\n- Use slight bend in elbows, never go too deep\n- 3 sets of 10-12 reps\n\n**Pro tip:** Squeeze at the peak contraction for 1-2 seconds. Think about pushing your elbows together, not your hands.` },

  { keys: ['dip', 'dips', 'chest dip', 'weighted dip'], cat: 'exercise',
    a: `**Dips — Compound Chest & Tricep Builder**\n\n**For chest emphasis:**\n- Lean forward ~30 degrees\n- Wider grip\n- Lower until you feel a stretch in the chest\n- Don't lock out fully at top\n\n**For tricep emphasis:**\n- Stay more upright\n- Narrower grip\n- Full lockout at top\n\n**Programming:**\n- Bodyweight: 3-4 sets to near failure\n- Weighted: 4x6-10, add weight via belt\n\n**Caution:** If you feel shoulder pain, reduce depth or switch to a machine version. Not everyone's shoulders tolerate deep dips.` },

  { keys: ['push up', 'pushup', 'push-up'], cat: 'exercise',
    a: `**Push-Ups — Bodyweight Chest Essential**\n\n**Variations ranked by difficulty:**\n1. Knee push-ups (beginner)\n2. Standard push-ups\n3. Diamond push-ups (tricep focus)\n4. Decline push-ups (upper chest)\n5. Archer push-ups (unilateral)\n6. Weighted push-ups\n7. Plyo/clapping push-ups\n\n**Perfect form:**\n- Hands slightly wider than shoulders\n- Body straight like a plank\n- Lower until chest nearly touches floor\n- Full extension at top\n\n**Challenge:** Try 100 push-ups in as few sets as possible. Track your time and beat it weekly.` },

  // ─── BACK EXERCISES ───
  { keys: ['pull up', 'pullup', 'pull-up', 'chin up', 'chinup'], cat: 'exercise',
    a: `**Pull-Ups & Chin-Ups — Back Width Builders**\n\n**Pull-ups (overhand):**\n- Wider grip = more lat focus\n- Shoulder-width = balanced lat + bicep\n- 3-4 sets to near failure\n\n**Chin-ups (underhand):**\n- More bicep involvement\n- Usually stronger by 10-15%\n- Great for beginners\n\n**Can't do pull-ups yet?**\n1. Assisted pull-up machine\n2. Band-assisted pull-ups\n3. Negative-only (jump up, lower slowly for 5 sec)\n4. Lat pulldowns to build base strength\n\n**Pro tip:** Dead hang for 2 seconds at the bottom, squeeze shoulder blades at the top. No kipping.` },

  { keys: ['barbell row', 'bent over row', 'pendlay row'], cat: 'exercise',
    a: `**Barbell Row — Back Thickness King**\n\n**Standard Bent-Over Row:**\n- Hinge at hips ~45 degrees\n- Pull bar to lower chest/upper abs\n- Squeeze shoulder blades at top\n- 4x6-8 heavy\n\n**Pendlay Row (from floor):**\n- More explosive, stricter form\n- Great for strength\n- 5x5 works well\n\n**Grip options:**\n- Overhand: more upper back & rear delts\n- Underhand: more lat & bicep\n\n**Key cue:** Drive your elbows behind you, not just pulling with arms. Think "elbow to hip pocket."` },

  { keys: ['deadlift', 'dead lift', 'conventional deadlift', 'sumo deadlift'], cat: 'exercise',
    a: `**Deadlift — The Ultimate Full-Body Lift**\n\n**Conventional:**\n- Feet hip-width, hands just outside knees\n- Hinge at hips, keep bar close to shins\n- Drive through floor, lock hips at top\n- Best for: posterior chain, overall strength\n\n**Sumo:**\n- Wide stance, hands inside knees\n- More upright torso, less lower back stress\n- Best for: people with long torsos, hip mobility\n\n**Programming:**\n- Strength: 5x3-5 @ 80-90% 1RM\n- Hypertrophy: 3x8-10 @ 65-70% 1RM\n\n**Safety:** If your lower back rounds, the weight is too heavy. Film yourself from the side to check form.` },

  { keys: ['lat pulldown', 'lat pull', 'pulldown'], cat: 'exercise',
    a: `**Lat Pulldown — Building Width**\n\n**Standard (wide grip):**\n- Grip 1.5x shoulder width\n- Pull to upper chest, lean back slightly\n- 3-4 sets of 10-12\n\n**Close-grip:**\n- Neutral grip attachment\n- More lower lat emphasis\n- Slightly more ROM\n\n**Behind the neck:** Skip it — shoulder injury risk with minimal extra benefit.\n\n**Pro tip:** Initiate the pull by depressing your shoulder blades, then pull with your elbows. Imagine putting your elbows in your back pockets.` },

  { keys: ['cable row', 'seated row', 'seated cable'], cat: 'exercise',
    a: `**Seated Cable Row — Back Thickness & Posture**\n\n**Close-grip (V-bar):**\n- Pull to navel\n- Squeeze shoulder blades 1 second\n- 3-4 sets of 10-12\n\n**Wide grip:**\n- Pull to lower chest\n- More upper back/rear delt\n\n**Single arm:**\n- Excellent for fixing imbalances\n- Extra rotation = more lat stretch\n\n**Pro tip:** Don't lean too far forward or back. Keep torso mostly upright — a slight lean forward to stretch the lats is fine, but excessive momentum kills the movement.` },

  // ─── LEG EXERCISES ───
  { keys: ['squat', 'barbell squat', 'back squat', 'front squat'], cat: 'exercise',
    a: `**Squat — King of Leg Exercises**\n\n**Back Squat:**\n- Bar on upper traps (high bar) or rear delts (low bar)\n- Feet shoulder width, toes slightly out\n- Break at hips AND knees simultaneously\n- Descend until hip crease is at or below knee\n- Drive up through midfoot\n\n**Front Squat:**\n- More quad dominant\n- More upright torso\n- Easier on lower back\n- Requires wrist/thoracic mobility\n\n**Programming:**\n- Strength: 5x5 @ 75-85%\n- Hypertrophy: 4x8-12 @ 65-75%\n\n**Depth matters:** Partial squats leave gains on the table. Aim for parallel or below.` },

  { keys: ['leg press', 'leg press machine'], cat: 'exercise',
    a: `**Leg Press — Heavy Quad Volume**\n\n**Foot placement matters:**\n- High & wide: glute/hamstring emphasis\n- Low & narrow: quad emphasis\n- Shoulder width, middle: balanced\n\n**Programming:**\n- 3-4 sets of 10-15 reps\n- Great for going heavy after squats\n- Can safely push closer to failure\n\n**Safety:**\n- Never lock out knees fully under heavy load\n- Don't let lower back round off the pad\n- Control the weight on the way down\n\n**Pro tip:** Use leg press to accumulate volume after compounds. It's lower-fatigue than squats so you can push harder.` },

  { keys: ['romanian deadlift', 'rdl', 'stiff leg', 'hamstring', 'ham curl', 'leg curl'], cat: 'exercise',
    a: `**Hamstring Exercises — Complete Guide**\n\n**Romanian Deadlift (RDL):**\n- Hip hinge with slight knee bend\n- Feel the stretch in hamstrings\n- Stop when you feel a full stretch (not touching floor)\n- 3-4 sets of 8-10\n\n**Lying Leg Curl:**\n- Great isolation exercise\n- Curl with control, squeeze at top\n- 3-4 sets of 10-15\n\n**Nordic Curls (advanced):**\n- Bodyweight eccentric beast\n- Builds incredible hamstring strength\n- Start with negatives only\n\n**Why train hamstrings:** Injury prevention (ACL, hamstring pulls), balanced physique, and better squat/deadlift performance.` },

  { keys: ['calf raise', 'calves', 'calf', 'calf exercise'], cat: 'exercise',
    a: `**Calf Training — The Stubborn Muscle**\n\n**Standing Calf Raise:**\n- Targets gastrocnemius (outer calf)\n- Full stretch at bottom, hold 2 sec\n- Squeeze at top, hold 1 sec\n- 4 sets of 12-20 reps\n\n**Seated Calf Raise:**\n- Targets soleus (under the gastroc)\n- Equally important for overall size\n- 4 sets of 15-25 reps\n\n**Why calves are stubborn:**\n- They get walked on all day — high endurance\n- Need high volume (15+ sets/week)\n- Need full ROM (stretch + squeeze)\n- Need progressive overload like any other muscle\n\n**Secret:** Train them 4-5x per week with moderate volume per session.` },

  { keys: ['lunge', 'lunges', 'bulgarian split squat', 'split squat'], cat: 'exercise',
    a: `**Lunges & Split Squats — Unilateral Leg Power**\n\n**Bulgarian Split Squat (BSS):**\n- Rear foot elevated on bench\n- Torso slightly forward for more glute\n- Upright for more quad\n- 3x8-12 per leg\n- The best single-leg exercise\n\n**Walking Lunges:**\n- Great for conditioning + hypertrophy\n- Use dumbbells or barbell\n- 3 sets of 12-16 steps\n\n**Reverse Lunges:**\n- Easier on knees than forward lunges\n- Better for beginners\n\n**Benefits of unilateral work:**\n- Fixes left/right imbalances\n- Core stability\n- Sport-specific transfer\n- Reduces injury risk` },

  // ─── SHOULDER EXERCISES ───
  { keys: ['overhead press', 'ohp', 'shoulder press', 'military press'], cat: 'exercise',
    a: `**Overhead Press — Shoulder Strength Foundation**\n\n**Barbell OHP (standing):**\n- Start at collarbone, press straight up\n- Move head forward once bar passes\n- Lockout directly over midfoot\n- 4x5-8 for strength\n\n**Dumbbell Shoulder Press (seated):**\n- Greater ROM than barbell\n- More stabiliser activation\n- 3-4 sets of 8-12\n\n**Common mistakes:**\n- Excessive lean back (turns it into incline press)\n- Not bracing core\n- Pressing in front instead of overhead\n\n**Pro tip:** Squeeze your glutes during standing OHP — it stabilizes your whole body.` },

  { keys: ['lateral raise', 'side raise', 'lateral', 'side delt'], cat: 'exercise',
    a: `**Lateral Raises — Building Wider Shoulders**\n\n**Dumbbell Lateral Raise:**\n- Slight forward lean\n- Lead with elbows, not hands\n- Raise to shoulder height (parallel to floor)\n- Control the negative\n- 4 sets of 12-20 reps\n\n**Cable Lateral Raise:**\n- Constant tension (superior to dumbbells)\n- Behind-the-back or cross-body\n- 3-4 sets of 15-20\n\n**Cheats that work:**\n- Controlled cheat reps at the end of a set\n- Heavy partials for overload\n\n**Volume recommendation:** Side delts recover fast — train them 4-6x per week, 2-3 sets per session. They respond to HIGH volume.` },

  { keys: ['face pull', 'rear delt', 'reverse fly', 'posterior delt'], cat: 'exercise',
    a: `**Rear Delt & Face Pulls — Shoulder Health + Aesthetics**\n\n**Face Pulls:**\n- Cable at face height, rope attachment\n- Pull to ears, externally rotate at end\n- 3-4 sets of 15-20\n- Do these EVERY session for shoulder health\n\n**Reverse Pec Deck:**\n- Great isolation for rear delts\n- 3 sets of 15-20\n\n**Rear Delt Dumbbell Fly:**\n- Bent over or on incline bench\n- Light weight, high reps\n- 3 sets of 15-20\n\n**Why rear delts matter:**\n- Balanced shoulder appearance from all angles\n- Injury prevention (rotator cuff support)\n- Better posture\n- Most people severely under-train them` },

  // ─── ARM EXERCISES ───
  { keys: ['bicep', 'biceps', 'curl', 'curls', 'bicep exercise'], cat: 'exercise',
    a: `**Bicep Exercises — Complete Arm Guide**\n\n**Top 5 ranked by muscle activation:**\n\n1. **Incline Dumbbell Curl** — Long head stretch, 3-4x10-12\n2. **Preacher Curl** — Short head peak, 3x10-12\n3. **Cable Curl** — Constant tension, 3x12-15\n4. **Hammer Curl** — Brachialis + forearms, 3x10-12\n5. **Barbell Curl** — Overall mass, 3x8-10\n\n**Programming tips:**\n- 10-20 sets per week total\n- Train 2-3x per week\n- Use FULL ROM (stretch at bottom)\n- Don't ego curl — control the weight\n\n**Best superset:** Incline curls + hammer curls. Hits both heads and the brachialis.` },

  { keys: ['tricep', 'triceps', 'tricep exercise', 'skull crusher', 'pushdown'], cat: 'exercise',
    a: `**Tricep Exercises — 2/3 of Your Arm Size**\n\n**Long head (biggest portion):**\n- Overhead cable extension — 3-4x12-15\n- Skull crushers (incline) — 3x10-12\n- Overhead DB extension — 3x12\n\n**Lateral head:**\n- Tricep pushdown (rope) — 3x12-15\n- Close-grip bench press — 4x8-10\n\n**Medial head:**\n- Reverse grip pushdown — 3x12-15\n- Diamond push-ups — 3x failure\n\n**Key insight:** The long head crosses the shoulder joint, so OVERHEAD movements stretch it best. Most people only do pushdowns — add overhead work for complete development.\n\n**Volume:** 12-18 sets per week, split across 2-3 sessions.` },

  { keys: ['forearm', 'forearms', 'grip strength', 'wrist curl', 'grip'], cat: 'exercise',
    a: `**Forearm & Grip Training**\n\n**Exercises:**\n- Wrist curls: 3x15-20\n- Reverse wrist curls: 3x15-20\n- Farmer walks: 3x30-40 seconds\n- Dead hangs: 3x max hold\n- Plate pinches: 3x max hold\n\n**Indirect forearm training:**\n- Pull-ups, deadlifts, rows, and curls all train forearms\n- Avoid straps on pulling exercises to build grip naturally\n\n**Training frequency:** 2-3x per week, can do at end of any session\n\n**Quick grip protocol:** After your last set of any pulling exercise, hold the weight for as long as possible. Free forearm training.` },

  // ─── CORE EXERCISES ───
  { keys: ['abs', 'core', 'abdominal', 'six pack', 'ab exercise'], cat: 'exercise',
    a: `**Core Training — Beyond Crunches**\n\n**Best exercises by function:**\n\n**Flexion (six-pack look):**\n- Cable crunches: 3x12-15\n- Hanging leg raises: 3x10-15\n- Ab wheel rollout: 3x8-12\n\n**Anti-extension (stability):**\n- Plank: 3x30-60 sec\n- Dead bug: 3x10 per side\n\n**Anti-rotation:**\n- Pallof press: 3x10 per side\n\n**Rotation:**\n- Cable woodchop: 3x12 per side\n\n**Abs visibility truth:** Abs are made in the kitchen. You need ~12-15% body fat (men) or ~18-22% (women) to see them. Training makes them bigger; diet makes them visible.\n\n**Frequency:** 2-4x per week, 6-10 sets total.` },

  // ─── TRAINING PROGRAMS ───
  { keys: ['ppl', 'push pull leg', 'push pull legs'], cat: 'program',
    a: `**Push/Pull/Legs — Most Popular Split**\n\n**Push (Mon/Thu):**\n- Bench Press 4x6-8\n- OHP 3x8-10\n- Incline DB Press 3x10-12\n- Lateral Raises 4x12-15\n- Tricep Pushdown 3x12-15\n- Overhead Tricep Ext 3x12-15\n\n**Pull (Tue/Fri):**\n- Barbell Row 4x6-8\n- Pull-ups 3x8-12\n- Cable Row 3x10-12\n- Face Pulls 3x15-20\n- Barbell Curl 3x10-12\n- Hammer Curl 3x10-12\n\n**Legs (Wed/Sat):**\n- Squat 4x6-8\n- RDL 3x8-10\n- Leg Press 3x10-12\n- Leg Curl 3x10-12\n- Calf Raise 4x12-15\n\n**Rest Sunday.** Run this for 8-12 weeks, then deload.` },

  { keys: ['upper lower', 'upper/lower', '4 day split', 'four day split'], cat: 'program',
    a: `**Upper/Lower Split — Great for Intermediates**\n\n**Upper A (Mon):**\n- Bench Press 4x6-8\n- Barbell Row 4x6-8\n- OHP 3x8-10\n- Cable Row 3x10-12\n- Lateral Raises 3x12-15\n- Tricep/Bicep superset 3x12\n\n**Lower A (Tue):**\n- Squat 4x6-8\n- RDL 3x8-10\n- Leg Press 3x10-12\n- Leg Curl 3x10-12\n- Calf Raise 4x15\n\n**Upper B (Thu):**\n- DB Bench 4x8-10\n- Pull-ups 4x8-12\n- Cable Fly 3x12-15\n- Face Pulls 3x15-20\n- Lateral Raises 3x12-15\n- Arms superset 3x12\n\n**Lower B (Fri):**\n- Deadlift 3x5\n- Bulgarian Split Squat 3x10/leg\n- Leg Extension 3x12\n- Nordic Curl 3x6-8\n- Calf Raise 4x15\n\nWed/Sat/Sun off.` },

  { keys: ['full body', 'fullbody', '3 day', 'three day', 'beginner program', 'starting strength'], cat: 'program',
    a: `**Full Body Program — Best for Beginners**\n\n**Day A (Mon/Fri):**\n- Squat 3x5\n- Bench Press 3x5\n- Barbell Row 3x5\n- Face Pulls 3x15\n- Calf Raise 3x15\n\n**Day B (Wed):**\n- Deadlift 3x5\n- OHP 3x5\n- Pull-ups 3x max\n- Lateral Raises 3x15\n- Leg Curl 3x10\n\n**Progression:** Add 2.5 kg every session on upper lifts, 5 kg on lower lifts.\n\n**Why full body for beginners:**\n- Higher frequency = faster motor learning\n- More practice with each lift\n- 3 days/week is sustainable\n- Can add 50-100 kg to lifts in first year\n\n**Run this for 3-6 months**, then switch to upper/lower or PPL.` },

  { keys: ['bro split', '5 day split', 'body part split', 'bodybuilding split'], cat: 'program',
    a: `**Bro Split — Classic Bodybuilding**\n\n**Mon: Chest**\n- Bench 4x8, Incline DB 3x10, Cable Fly 3x12, Dips 3x failure\n\n**Tue: Back**\n- Deadlift 3x5, Pull-ups 4x8, Cable Row 3x10, Lat Pulldown 3x12\n\n**Wed: Shoulders**\n- OHP 4x8, Lateral Raise 4x15, Face Pull 4x15, Shrugs 3x12\n\n**Thu: Legs**\n- Squat 4x8, Leg Press 3x12, RDL 3x10, Leg Curl 3x12, Calves 4x15\n\n**Fri: Arms**\n- Barbell Curl 4x10, Skull Crushers 4x10, Hammer Curl 3x12, Pushdown 3x12, Preacher Curl 3x12\n\n**Honest take:** PPL or upper/lower is more efficient (2x frequency per muscle), but bro splits still work if you train hard. Consistency > optimal program.` },

  { keys: ['home workout', 'no gym', 'no equipment', 'bodyweight', 'home exercise'], cat: 'program',
    a: `**Home Bodyweight Program — No Equipment Needed**\n\n**Day A (Upper Push):**\n- Push-ups 4x max\n- Diamond push-ups 3x max\n- Pike push-ups (shoulders) 3x10\n- Tricep dips on chair 3x12\n\n**Day B (Lower):**\n- Bodyweight squats 4x20\n- Bulgarian split squats 3x12/leg\n- Glute bridges 3x15\n- Wall sit 3x45 sec\n- Single-leg calf raise 3x15\n\n**Day C (Upper Pull):**\n- Doorframe rows 4x12\n- Backpack rows (loaded) 3x12\n- Superman hold 3x30 sec\n- Bicep curls (water jugs) 3x15\n\n**Schedule:** A-B-C-rest-repeat\n\n**Progression:** Add reps, slow tempo (3 sec down), add weight (backpack), harder variations.` },

  { keys: ['workout routine', 'workout plan', 'routine', 'which program', 'what program', 'which split'], cat: 'program',
    a: `**Choosing the Right Program**\n\n**Beginner (0-1 year):**\n- Full body 3x/week\n- Focus on learning compounds\n- Linear progression (add weight each session)\n\n**Intermediate (1-3 years):**\n- Upper/Lower 4x/week or PPL 6x/week\n- Weekly progression\n- More exercise variety\n\n**Advanced (3+ years):**\n- PPL, bro split, or specialized blocks\n- Periodization becomes important\n- Focus on weak points\n\n**Key principles for ANY program:**\n1. Progressive overload (more weight/reps over time)\n2. Train each muscle 2x per week minimum\n3. 10-20 hard sets per muscle per week\n4. Compound lifts first, isolation after\n5. Be consistent for at least 8-12 weeks before switching` },

  // ─── NUTRITION ───
  { keys: ['calorie', 'calories', 'tdee', 'how many calories', 'calorie calculator'], cat: 'nutrition',
    a: `**Calorie Guide — Finding Your Numbers**\n\n**Quick estimate:**\n- Fat loss: bodyweight (kg) x 24-26\n- Maintenance: bodyweight (kg) x 28-32\n- Muscle gain: bodyweight (kg) x 33-37\n\n**More accurate method:**\n1. Track everything you eat for 1 week\n2. Weigh yourself daily, take weekly average\n3. If weight is stable, that's your maintenance\n4. Adjust from there\n\n**Adjustments:**\n- Losing too fast? Add 200 kcal\n- Not losing? Subtract 200 kcal\n- Gaining too fast? Subtract 100 kcal\n\n**Use the calculator on the Meals page** for a personalized estimate based on Harris-Benedict formula.` },

  { keys: ['protein', 'how much protein', 'protein intake', 'protein source'], cat: 'nutrition',
    a: `**Protein — The Muscle-Building Macro**\n\n**How much?**\n- Building muscle: 1.6-2.2g per kg bodyweight\n- Cutting: 2.0-2.4g per kg (higher to preserve muscle)\n- General health: 1.2-1.6g per kg\n\n**Best sources (per 100g):**\n- Chicken breast: 31g protein, 165 kcal\n- Greek yogurt: 10g protein, 59 kcal\n- Eggs: 13g protein, 155 kcal\n- Tuna: 26g protein, 130 kcal\n- Cottage cheese: 11g protein, 98 kcal\n- Whey protein scoop: ~25g protein, ~120 kcal\n\n**Timing:** Spread across 3-5 meals. 20-40g per meal is optimal for muscle protein synthesis.\n\n**Myth:** You CAN absorb more than 30g per meal. Your body uses all the protein, just slower with larger amounts.` },

  { keys: ['macro', 'macros', 'macronutrient', 'carbs fat protein ratio', 'iifym', 'flexible dieting'], cat: 'nutrition',
    a: `**Macros — Complete Guide**\n\n**Protein:** 1.6-2.2g/kg bodyweight (4 kcal per gram)\n**Fat:** 0.8-1.2g/kg bodyweight minimum (9 kcal per gram)\n**Carbs:** Fill remaining calories (4 kcal per gram)\n\n**Example for 80 kg person bulking (3000 kcal):**\n- Protein: 160g (640 kcal)\n- Fat: 80g (720 kcal)\n- Carbs: 410g (1640 kcal)\n\n**Flexible dieting (IIFYM):**\nHit your macro targets and you'll get results regardless of food choices. However, 80% whole foods and 20% treats is a sustainable approach.\n\n**Priority order:**\n1. Total calories (most important)\n2. Protein intake\n3. Carb/fat split (least important — personal preference)` },

  { keys: ['bulk', 'bulking', 'mass gain', 'weight gain', 'lean bulk', 'dirty bulk', 'muscle gain'], cat: 'nutrition',
    a: `**Bulking Guide — Building Muscle Mass**\n\n**Lean bulk (recommended):**\n- Surplus: +200-350 kcal above maintenance\n- Expected gain: 0.5-1 kg/month\n- Minimal fat gain\n- Run for 4-6 months\n\n**Aggressive bulk:**\n- Surplus: +500+ kcal\n- Faster strength gains\n- More fat gain\n- Only for true beginners or hardgainers\n\n**Easy high-calorie foods:**\n- Oats + peanut butter + banana shake (600+ kcal)\n- Rice + olive oil\n- Nuts and trail mix\n- Whole milk\n- Granola\n\n**When to stop bulking:**\n- When body fat gets uncomfortable (15-18% for men)\n- After 4-6 months\n- When progress stalls consistently\n\nThen do a mini-cut (4-6 weeks) and bulk again.` },

  { keys: ['cut', 'cutting', 'fat loss', 'lose fat', 'weight loss', 'diet', 'lean', 'shred', 'shredded'], cat: 'nutrition',
    a: `**Cutting Guide — Losing Fat While Keeping Muscle**\n\n**The formula:**\n- Deficit: 300-500 kcal below maintenance\n- Protein HIGH: 2.0-2.4g/kg bodyweight\n- Keep lifting heavy (don't switch to "light weights high reps")\n- Lose 0.5-1% bodyweight per week\n\n**Fat loss priorities:**\n1. Calorie deficit (non-negotiable)\n2. High protein (muscle preservation)\n3. Strength training (stimulus to keep muscle)\n4. Sleep 7-9 hours\n5. Steps/cardio (bonus calorie burn)\n\n**Hunger management:**\n- Eat high-volume, low-calorie foods (veggies, fruit, lean meat)\n- Drink lots of water\n- Black coffee suppresses appetite\n- Don't cut too aggressively\n\n**Duration:** 8-12 weeks max, then diet break or reverse diet.` },

  { keys: ['meal prep', 'meal planning', 'food prep', 'weekly prep'], cat: 'nutrition',
    a: `**Meal Prep — Save Time, Stay Consistent**\n\n**Sunday prep routine (2 hours):**\n1. Cook 1.5 kg chicken breast (grill or oven)\n2. Cook 1 kg rice in rice cooker\n3. Roast 2 trays of mixed vegetables\n4. Boil 12 eggs\n5. Portion into containers for 5 days\n\n**Example day:**\n- Breakfast: Overnight oats + protein powder + berries\n- Lunch: Chicken + rice + veggies\n- Snack: Greek yogurt + nuts\n- Dinner: Lean mince + pasta + sauce\n- Before bed: Cottage cheese\n\n**Storage tips:**\n- Rice: up to 4 days in fridge\n- Cooked chicken: 3-4 days in fridge\n- Freeze extra portions for backup meals\n\n**Invest in:** 10-15 glass meal prep containers. They last years and microwave safely.` },

  { keys: ['supplement', 'supplements', 'whey', 'creatine', 'pre workout', 'pre-workout', 'bcaa'], cat: 'nutrition',
    a: `**Supplements — What Actually Works**\n\n**Tier 1 (proven, worth it):**\n- Creatine monohydrate: 5g/day, every day. +5-10% strength, better recovery\n- Whey protein: Convenient protein source, not magic\n- Caffeine: 200-400mg pre-workout for performance\n\n**Tier 2 (some benefit):**\n- Vitamin D: If you don't get much sun\n- Omega-3 (fish oil): Anti-inflammatory\n- Magnesium: Sleep quality\n\n**Tier 3 (skip it):**\n- BCAAs: Waste of money if you eat enough protein\n- Fat burners: Just caffeine in a fancy package\n- Testosterone boosters: Don't work\n- Mass gainers: Overpriced sugar + protein\n\n**Bottom line:** Supplements are 1-2% of results. Dial in training, nutrition, and sleep first.` },

  { keys: ['creatine'], cat: 'nutrition',
    a: `**Creatine — The #1 Supplement**\n\n**What it does:**\n- Increases phosphocreatine stores in muscles\n- More ATP = more reps before failure\n- 5-10% strength increase\n- Better recovery between sets\n- Increases muscle water content (looks fuller)\n\n**How to take:**\n- 5g creatine monohydrate per day\n- Take it any time (timing doesn't matter)\n- Mix in water, shake, or anything\n- Take it EVERY day, including rest days\n\n**Loading phase?** Not necessary. 5g/day will saturate muscles in 3-4 weeks. Loading (20g/day for 5 days) just gets you there faster but may cause bloating.\n\n**Side effects:** You may gain 1-2 kg of water weight initially. This is normal and not fat.\n\n**Safety:** Most studied supplement ever. Safe for long-term use.` },

  // ─── RECIPES ───
  { keys: ['vegetarian recipe', 'veg recipe', 'veggie recipe', 'vegetarian meal', 'veggie meal', 'vegi', 'vegetarian'], cat: 'recipe',
    a: `**High-Protein Vegetarian Recipes**\n\n**1. Protein Lentil Bowl (520 kcal, 35g protein)**\n- 200g cooked lentils\n- 100g quinoa\n- Roasted sweet potato\n- Spinach, cherry tomatoes\n- Tahini dressing\n\n**2. Greek Yogurt Power Bowl (400 kcal, 38g protein)**\n- 250g Greek yogurt\n- 30g granola\n- 1 scoop protein powder mixed in\n- Berries, honey, walnuts\n\n**3. Chickpea Curry (480 kcal, 22g protein)**\n- 200g chickpeas\n- Coconut milk, tomato paste\n- Spinach, onion, garlic\n- Curry powder, cumin, turmeric\n- Serve with rice\n\n**4. Tofu Stir-Fry (450 kcal, 30g protein)**\n- 200g firm tofu, pressed & cubed\n- Broccoli, peppers, mushrooms\n- Soy sauce, garlic, ginger\n- Serve over rice noodles\n\n**Tip:** Combine legumes + grains for complete amino acid profiles.` },

  { keys: ['vegan recipe', 'vegan meal', 'plant based', 'plant-based'], cat: 'recipe',
    a: `**High-Protein Vegan Recipes**\n\n**1. Tempeh Buddha Bowl (550 kcal, 32g protein)**\n- 150g marinated tempeh, pan-fried\n- Brown rice, edamame, avocado\n- Shredded carrots, red cabbage\n- Peanut sauce dressing\n\n**2. Black Bean Tacos (480 kcal, 24g protein)**\n- Black beans seasoned with cumin & chili\n- Corn tortillas\n- Guacamole, salsa, shredded lettuce\n\n**3. Protein Smoothie Bowl (420 kcal, 30g protein)**\n- Frozen banana, frozen berries\n- Vegan protein powder, soy milk\n- Top: granola, chia seeds, coconut flakes\n\n**4. Peanut Butter Overnight Oats (480 kcal, 25g protein)**\n- 80g oats, soy milk, 2 tbsp PB\n- Chia seeds, maple syrup\n- Refrigerate overnight\n\n**Vegan protein sources:** Tofu, tempeh, seitan, lentils, chickpeas, edamame, hemp seeds, nutritional yeast.` },

  { keys: ['high protein recipe', 'protein recipe', 'high protein meal', 'protein meal'], cat: 'recipe',
    a: `**High-Protein Recipes (40g+ protein each)**\n\n**1. Chicken Rice Bowl (550 kcal, 48g protein)**\n- 200g chicken breast, grilled\n- 150g rice, steamed broccoli\n- Soy sauce + sriracha\n\n**2. Salmon & Quinoa (520 kcal, 42g protein)**\n- 180g salmon fillet, baked with lemon\n- 150g quinoa, asparagus\n- Olive oil drizzle\n\n**3. Turkey Mince Bolognese (500 kcal, 45g protein)**\n- 200g lean turkey mince\n- Whole wheat pasta, tomato sauce\n- Garlic, onion, Italian herbs\n\n**4. Egg & Oat Pancakes (400 kcal, 40g protein)**\n- 3 eggs + 3 egg whites\n- 60g oats, 1 banana\n- Blend, cook like pancakes\n- Top with Greek yogurt + berries\n\n**5. Cottage Cheese Bowl (350 kcal, 42g protein)**\n- 300g cottage cheese\n- Pineapple, walnuts, honey\n- Simple, zero cooking required` },

  { keys: ['breakfast recipe', 'breakfast idea', 'breakfast', 'morning meal'], cat: 'recipe',
    a: `**High-Protein Breakfast Ideas**\n\n**Quick (under 5 min):**\n- Greek yogurt + granola + berries (30g protein)\n- 3 eggs scrambled + toast (25g protein)\n- Protein shake + banana (30g protein)\n- Overnight oats with protein powder (35g protein)\n\n**Medium (10-15 min):**\n- Omelette: 3 eggs, spinach, feta, tomato (28g protein)\n- Protein pancakes: 2 eggs, 1 banana, 1 scoop whey, oats (35g protein)\n- Avocado toast + smoked salmon + poached eggs (30g protein)\n\n**Meal prep breakfast:**\n- Egg muffins: Whisk 12 eggs, pour into muffin tin with veggies & cheese, bake 20 min. 5 days of grab-and-go breakfasts.\n\n**If you skip breakfast:** That's fine. There's no metabolic advantage to eating breakfast. Eat when it suits your schedule.` },

  { keys: ['snack', 'snacks', 'healthy snack', 'protein snack'], cat: 'recipe',
    a: `**High-Protein Snacks (Quick & Easy)**\n\n**No prep needed:**\n- Greek yogurt (10g protein per 100g)\n- Cottage cheese (11g protein per 100g)\n- String cheese (7g per stick)\n- Beef jerky (30g protein per 100g)\n- Protein bar (20-30g protein)\n- Hard-boiled eggs (6g each)\n\n**Quick prep:**\n- Apple slices + peanut butter (8g protein)\n- Trail mix: nuts + dark chocolate + seeds\n- Rice cake + cottage cheese + cucumber\n- Protein shake (25g protein)\n- Edamame (11g protein per 100g)\n\n**Sweet cravings:**\n- Protein mug cake: 1 scoop whey + 1 egg + 1 tbsp cocoa, microwave 90 sec\n- Frozen Greek yogurt bark: Spread yogurt on tray, add berries, freeze\n- Protein ice cream: frozen banana + protein powder + splash of milk, blend\n\n**Aim for 20-30g protein per snack.**` },

  { keys: ['shake', 'smoothie', 'protein shake', 'protein smoothie', 'mass gainer shake'], cat: 'recipe',
    a: `**Protein Shake Recipes**\n\n**The Classic (350 kcal, 35g protein):**\n- 1 scoop whey, 300ml milk, 1 banana, ice\n\n**Mass Builder (700 kcal, 50g protein):**\n- 2 scoops whey, 300ml whole milk\n- 2 tbsp peanut butter, 1 banana\n- 60g oats, honey\n\n**Green Machine (300 kcal, 30g protein):**\n- 1 scoop whey, spinach, frozen mango\n- 200ml almond milk, 1 tbsp flax seeds\n\n**Dessert Shake (400 kcal, 35g protein):**\n- 1 scoop chocolate whey, 200ml milk\n- 1 tbsp cocoa powder, 2 tbsp PB\n- Frozen banana, ice\n\n**Pre-bed Shake (250 kcal, 35g protein):**\n- 1 scoop casein protein\n- 200ml milk\n- Slow-digesting for overnight recovery\n\n**Tip:** Blend oats into shakes for easy calories without feeling overly full.` },

  { keys: ['low calorie', 'low cal', 'diet recipe', 'deficit recipe', 'cutting recipe', 'light meal'], cat: 'recipe',
    a: `**Low-Calorie High-Protein Meals (Under 400 kcal)**\n\n**1. Turkey Lettuce Wraps (280 kcal, 35g protein)**\n- 200g turkey mince, seasoned\n- Butter lettuce cups\n- Diced tomato, onion, hot sauce\n\n**2. Tuna Salad (300 kcal, 40g protein)**\n- 1 can tuna, drained\n- Mixed greens, cucumber, cherry tomatoes\n- Light vinaigrette\n\n**3. Egg White Omelette (250 kcal, 30g protein)**\n- 6 egg whites + 1 whole egg\n- Spinach, mushrooms, feta\n\n**4. Zucchini Noodle Stir-Fry (320 kcal, 35g protein)**\n- Spiralized zucchini (saves 200+ kcal vs pasta)\n- 200g chicken or shrimp\n- Garlic, soy sauce, ginger\n\n**Volume eating tip:** Fill half your plate with vegetables. They're low calorie but physically filling.` },

  { keys: ['swiss recipe', 'swiss food', 'coop recipe', 'migros recipe', 'swiss meal'], cat: 'recipe',
    a: `**High-Protein Meals with Swiss Supermarket Ingredients**\n\n**Coop Pouletbrust Bowl (480 kcal, 48g protein)**\n- Coop Pouletbrust (200g)\n- Uncle Ben's Reis, steamed broccoli\n- Coop Hummus on the side\n\n**Migros Fitness Bowl (520 kcal, 42g protein)**\n- M-Classic Truthahn Geschnetzeltes (200g)\n- Migros Bio Quinoa\n- Cherry tomatoes, avocado\n- Balsamico dressing\n\n**Quick Lidl Meal (450 kcal, 38g protein)**\n- Lidl Hähnchenbrust (200g)\n- Lidl Bio Vollkorn Pasta\n- Passata sauce with garlic\n\n**Protein Znüni (Snack):**\n- Emmi Protein Yogurt (20g protein)\n- Apple + handful of nuts\n\n**Tip:** Migros and Coop both carry high-protein yogurts, Quark, and ready-made chicken that make hitting protein targets easy.` },

  // ─── PROGRESSIVE OVERLOAD ───
  { keys: ['progressive overload', 'overload', 'how to progress', 'increase weight', 'plateau'], cat: 'training',
    a: `**Progressive Overload — The #1 Growth Driver**\n\n**Methods (in order of priority):**\n\n1. **Add weight** — 1-2.5 kg for upper, 2.5-5 kg for lower lifts\n2. **Add reps** — Same weight, do more reps (8 reps → 10 reps)\n3. **Add sets** — More volume over time\n4. **Better form** — More controlled = more effective\n5. **Shorter rest** — Same work, less time\n\n**Double progression method:**\n- Pick a rep range (e.g., 8-12)\n- Use same weight until you hit 12 on all sets\n- Then increase weight, reps drop back to 8\n- Build back up to 12, repeat\n\n**Stuck on a plateau?**\n- Deload for 1 week (50% volume)\n- Check sleep and nutrition\n- Try a different rep range\n- Switch exercise variation\n- Be patient — progress slows over time` },

  { keys: ['deload', 'rest week', 'recovery week', 'overtraining', 'overtrained'], cat: 'training',
    a: `**Deload & Recovery — When to Back Off**\n\n**Signs you need a deload:**\n- Strength has stalled or decreased for 2+ weeks\n- Persistent joint aches\n- Poor sleep despite good habits\n- No motivation to train\n- Getting sick more often\n\n**How to deload:**\n- Option 1: Same exercises, 50% weight, same reps\n- Option 2: Same weight, cut volume in half (fewer sets)\n- Option 3: Full week off (every 3-4 months)\n\n**Frequency:** Every 4-8 weeks depending on intensity.\n\n**You're NOT losing gains.** Muscle is maintained for weeks without training. Deloads let your joints, CNS, and connective tissue catch up to your muscles.\n\n**Pro tip:** Plan deloads proactively. Don't wait until you're broken.` },

  { keys: ['volume', 'training volume', 'how many sets', 'sets per week'], cat: 'training',
    a: `**Training Volume — How Much Is Enough?**\n\n**Sets per muscle group per week:**\n\n| Level | Sets/week |\n|---|---|\n| Beginner | 10-12 |\n| Intermediate | 12-18 |\n| Advanced | 16-24 |\n\n**Minimum effective volume:** ~6 sets/week per muscle to maintain.\n**Maximum recoverable volume:** 20-25 sets/week (beyond this, recovery suffers).\n\n**Quality over quantity:**\n- Each set should be within 0-3 reps of failure\n- Junk volume (easy sets far from failure) doesn't count\n- 12 hard sets > 20 easy sets\n\n**How to add volume over time:**\n- Start at the low end\n- Add 1-2 sets per muscle per week every 2-3 weeks\n- When recovery suffers, deload and restart at a slightly higher baseline` },

  { keys: ['rep range', 'reps', 'how many reps', 'hypertrophy reps', 'strength reps'], cat: 'training',
    a: `**Rep Ranges — What's Best for Your Goals?**\n\n**Strength:** 1-5 reps (85-100% 1RM)\n- Long rest: 3-5 minutes\n- Compound lifts only\n- Neural adaptations\n\n**Hypertrophy:** 6-12 reps (65-80% 1RM)\n- Rest: 1.5-3 minutes\n- Best for muscle growth\n- Compounds + isolation\n\n**Endurance:** 12-20+ reps (50-65% 1RM)\n- Rest: 30-90 seconds\n- Metabolic stress, pump\n- Great for isolation exercises\n\n**The truth:** Muscle grows across ALL rep ranges as long as you're close to failure. The "hypertrophy range" isn't magic — it's just the most practical balance of stimulus and fatigue.\n\n**Best approach:** Use a mix. Heavy compounds (5-8), moderate accessories (8-12), light isolation (12-20).` },

  { keys: ['warm up', 'warmup', 'warm-up', 'stretching before'], cat: 'training',
    a: `**Warm-Up Protocol — Quick & Effective**\n\n**General warm-up (5 min):**\n- Light cardio: bike, rowing, or jumping jacks\n- Dynamic stretches: arm circles, leg swings, hip circles\n\n**Movement-specific warm-up:**\n\nFor a 100 kg bench press working set:\n- Bar x 10 (just the bar)\n- 40 kg x 8\n- 60 kg x 5\n- 80 kg x 3\n- 90 kg x 1\n- 100 kg — working sets\n\n**Rules:**\n- More warm-up sets for heavy compounds\n- Fewer reps as weight increases\n- First exercise needs the most warm-up\n- Subsequent exercises need less (muscles are already warm)\n\n**Skip static stretching before lifting.** Save it for after. Dynamic stretches and warm-up sets are better for performance and injury prevention.` },

  { keys: ['mind muscle', 'mind-muscle', 'muscle connection', 'feel the muscle'], cat: 'training',
    a: `**Mind-Muscle Connection — Does It Matter?**\n\n**For isolation exercises: YES**\n- Focusing on the target muscle increases its activation by 20-30%\n- Especially important for: lateral raises, curls, flyes, leg curls\n- Use lighter weight if needed to feel the muscle\n\n**For compound exercises: LESS**\n- Just focus on moving the weight with good form\n- Thinking too hard about one muscle can hurt performance\n- Let the movement pattern do its job\n\n**How to improve it:**\n1. Touch the muscle between sets (sounds silly, works)\n2. Slow down the movement (3-4 second negatives)\n3. Flex the muscle at the top of each rep\n4. Use machines before free weights (easier to isolate)\n5. Watch yourself in the mirror — visual feedback helps\n\n**Practice:** It develops over time. New lifters often struggle to feel certain muscles — it gets better.` },

  // ─── RECOVERY & SLEEP ───
  { keys: ['sleep', 'rest', 'recovery', 'how much sleep'], cat: 'recovery',
    a: `**Sleep & Recovery — Where Gains Actually Happen**\n\n**Why sleep matters for fitness:**\n- Growth hormone released during deep sleep\n- Muscle protein synthesis peaks while sleeping\n- Poor sleep = 60% less muscle growth (studied)\n- Sleep-deprived lifters lose more muscle during a cut\n\n**Optimal:** 7-9 hours per night\n\n**Sleep hygiene checklist:**\n- Same bedtime/wake time daily (+/- 30 min)\n- Room: dark, cool (18-20 C), quiet\n- No screens 30-60 min before bed\n- No caffeine after 2 PM\n- Magnesium supplement before bed (helps some people)\n\n**Active recovery options:**\n- Light walking (5000-8000 steps on rest days)\n- Foam rolling / stretching\n- Light swimming or yoga\n- Sauna (improves blood flow)\n\n**Rest days:** Minimum 1-2 per week. Muscles grow during rest, not during training.` },

  { keys: ['soreness', 'sore', 'doms', 'muscle soreness', 'delayed onset'], cat: 'recovery',
    a: `**DOMS (Muscle Soreness) — Is It Good or Bad?**\n\n**What is DOMS?**\nDelayed Onset Muscle Soreness — peaks 24-72 hours after training.\n\n**Caused by:**\n- New exercises or movements\n- Eccentric (lowering) emphasis\n- Increased volume or intensity\n- Training after a break\n\n**Is soreness = good workout?**\nNO. Soreness is NOT a reliable indicator of muscle growth. You can have a great workout with zero soreness.\n\n**How to manage:**\n- Light movement (walking, cycling) helps more than sitting still\n- Hot shower or sauna\n- Adequate protein and water\n- Sleep\n- You CAN train a sore muscle (use lighter weight, higher reps)\n\n**When to worry:** Sharp pain during exercise, pain that gets WORSE over days, or pain in joints (not muscles) = see a doctor.` },

  { keys: ['stretching', 'flexibility', 'mobility', 'foam roll', 'foam rolling'], cat: 'recovery',
    a: `**Stretching & Mobility Guide**\n\n**Before training — Dynamic stretches:**\n- Arm circles, leg swings, hip circles\n- World's greatest stretch (Google it — it's amazing)\n- Cat-cow for spine mobility\n- 5 minutes is enough\n\n**After training — Static stretches (hold 30-60 sec):**\n- Chest: doorframe stretch\n- Lats: hang from bar\n- Hip flexors: kneeling lunge stretch\n- Hamstrings: standing toe touch\n- Quads: standing quad pull\n\n**Foam rolling:**\n- Roll slowly over tight areas\n- Spend 30-60 seconds per muscle group\n- Best on: quads, IT band, upper back, glutes\n- Don't roll directly on joints or lower back\n\n**Mobility work pays off:** Better mobility = better exercise form = better muscle activation = better gains. Spend 10 minutes daily.` },

  // ─── INJURY PREVENTION ───
  { keys: ['shoulder pain', 'shoulder injury', 'rotator cuff', 'shoulder hurt'], cat: 'injury',
    a: `**Shoulder Pain — Prevention & Management**\n\n**Common causes in lifters:**\n- Too much pressing, not enough pulling\n- Poor bench press form (elbows flared to 90 degrees)\n- Skipping warm-ups\n- No rotator cuff work\n\n**Prevention protocol (do 2-3x/week):**\n- Face pulls: 3x15-20\n- Band pull-aparts: 3x15-20\n- External rotation: 3x15 per arm\n- Band dislocates: 2x15\n\n**If your shoulder hurts now:**\n1. Stop exercises that cause sharp pain\n2. Find pain-free alternatives (e.g., floor press instead of bench)\n3. Ice after training\n4. High-rep rotator cuff work daily\n5. See a physio if pain persists beyond 2 weeks\n\n**Golden rule:** Your pressing volume should NEVER exceed your pulling volume. Aim for a 2:1 pull-to-push ratio.` },

  { keys: ['knee pain', 'knee injury', 'knee hurt', 'knees'], cat: 'injury',
    a: `**Knee Pain — Lifter's Guide**\n\n**Common causes:**\n- Squatting with knees caving inward\n- Too much volume too fast\n- Weak VMO (inner quad) or glutes\n- Tight hip flexors and quads\n\n**Fixes:**\n1. **Strengthen VMO:** Leg extensions (focus on last 30 degrees of extension), split squats\n2. **Strengthen glutes:** Hip thrusts, glute bridges, clamshells\n3. **Improve mobility:** Foam roll quads and IT band, stretch hip flexors\n4. **Fix form:** Push knees OUT over toes during squats, don't let them cave\n\n**Exercise modifications:**\n- Squat hurts? Try box squats or goblet squats (more control)\n- Lunges hurt? Try reverse lunges (easier on knees)\n- Leg press hurts? Adjust foot position higher on platform\n\n**Knees going past toes is FINE.** This is a myth. It's actually unavoidable in deep squats and is perfectly safe.` },

  { keys: ['lower back', 'back pain', 'lower back pain', 'back hurt'], cat: 'injury',
    a: `**Lower Back Pain — Prevention & Recovery**\n\n**Common training causes:**\n- Rounding lower back during deadlifts\n- Excessive arching during overhead press\n- Weak core\n- Sitting all day + heavy training\n\n**Prevention:**\n- Brace your core on EVERY compound lift (breathe into belly, push out against belt)\n- Film your deadlifts from the side — if your back rounds, reduce weight\n- Strengthen core: planks, dead bugs, bird dogs\n- Stretch hip flexors daily (tight hip flexors pull on lower back)\n\n**If you're currently in pain:**\n1. Avoid pain-triggering exercises (usually deadlifts, good mornings)\n2. Walk daily — movement helps more than rest\n3. Cat-cow stretches, child's pose\n4. McGill Big 3: curl-ups, bird dog, side plank\n5. See a physio if pain lasts 2+ weeks or radiates down your leg\n\n**Most back pain is NOT serious** and resolves with movement and time.` },

  // ─── BODY COMPOSITION ───
  { keys: ['body fat', 'body fat percentage', 'bf%', 'body composition', 'recomp', 'recomposition'], cat: 'body',
    a: `**Body Composition & Recomp**\n\n**Body fat ranges (men):**\n- 6-9%: Stage lean, not sustainable\n- 10-14%: Visible abs, athletic\n- 15-18%: Fit, slight ab outline\n- 20-25%: Average, some softness\n- 25%+: Overweight\n\n**Body fat ranges (women):**\n- 14-18%: Very lean, athletic\n- 19-24%: Fit, toned\n- 25-30%: Average, healthy\n- 30%+: Overweight\n\n**Body recomposition (lose fat + build muscle simultaneously):**\n- Works best for: beginners, overweight individuals, returning after a break\n- Eat at maintenance or slight deficit\n- HIGH protein (2g/kg)\n- Train hard with progressive overload\n- Be patient — scale may not move but body changes\n\n**Measuring progress during recomp:**\n- Progress photos (every 2 weeks, same lighting)\n- Waist measurement\n- Strength in the gym\n- Don't rely on the scale` },

  // ─── WEIGHT MANAGEMENT ───
  { keys: ['water', 'hydration', 'how much water', 'water intake'], cat: 'nutrition',
    a: `**Hydration for Performance**\n\n**How much?**\n- Baseline: 35-40ml per kg bodyweight\n- 80 kg person = 2.8-3.2 litres per day\n- Add 500-1000ml per hour of exercise\n\n**Signs of dehydration:**\n- Dark yellow urine\n- Headache, fatigue\n- Decreased performance (even 2% dehydration hurts strength)\n- Muscle cramps\n\n**Tips:**\n- Carry a water bottle everywhere\n- Drink 500ml immediately upon waking\n- Drink 500ml before training\n- Sip throughout workout\n- Flavour with lemon or electrolytes if plain water is boring\n\n**Electrolytes matter:**\n- Sodium, potassium, magnesium\n- Especially important if you sweat a lot\n- Pinch of salt in water works fine\n\n**Coffee and tea count** toward daily intake. Caffeine is only mildly diuretic.` },

  { keys: ['intermittent fasting', 'fasting', 'if', '16:8', 'eating window'], cat: 'nutrition',
    a: `**Intermittent Fasting — Does It Work for Fitness?**\n\n**Common protocols:**\n- 16:8 — Fast 16 hours, eat in 8-hour window\n- 20:4 — Fast 20 hours, eat in 4-hour window\n- 5:2 — Normal 5 days, 500-600 kcal 2 days\n\n**Pros:**\n- Easier calorie control (fewer meals = harder to overeat)\n- Some people feel more focused fasted\n- Simplifies meal planning\n\n**Cons:**\n- Harder to hit high protein targets in fewer meals\n- May hurt training performance if you train fasted\n- No metabolic advantage over regular eating\n\n**For muscle building:** Not ideal. Spreading protein across 4-5 meals is slightly better for muscle protein synthesis.\n\n**For fat loss:** Works great IF it helps you eat fewer calories. The magic is the calorie deficit, not the fasting itself.\n\n**My recommendation:** Eat in whatever pattern lets you hit your calorie and protein targets consistently.` },

  // ─── CARDIO ───
  { keys: ['cardio', 'running', 'hiit', 'conditioning', 'endurance', 'aerobic'], cat: 'training',
    a: `**Cardio — The Complete Guide for Lifters**\n\n**Does cardio kill gains?** No, unless you're doing marathons. Moderate cardio actually HELPS recovery.\n\n**Types ranked for lifters:**\n\n1. **Walking** (best): 8000-10000 steps/day. Zero recovery impact, great for fat loss.\n\n2. **Incline treadmill:** 3-4x/week, 20-30 min. Higher calorie burn, still low impact.\n\n3. **Cycling/rowing:** 2-3x/week, 20-30 min. Easy on joints.\n\n4. **HIIT:** 1-2x/week max. Effective but fatiguing. Don't do HIIT on leg days.\n\n**Cardio for fat loss:**\n- Create most of your deficit through diet\n- Use cardio as a BONUS (200-300 kcal extra burn)\n- Walking is king — sustainable, no recovery cost\n\n**Minimum for heart health:** 150 min moderate or 75 min vigorous per week (WHO recommendation).\n\n**Pro tip:** Do cardio AFTER weights, not before. Or on separate days entirely.` },

  { keys: ['steps', 'walking', '10000 steps', 'daily steps', 'neat'], cat: 'training',
    a: `**Daily Steps & NEAT — The Hidden Fat Loss Tool**\n\n**What is NEAT?**\nNon-Exercise Activity Thermogenesis — calories burned from all movement that isn't formal exercise. Walking, fidgeting, standing, doing chores.\n\n**Why it matters:**\n- NEAT can account for 200-800+ kcal/day\n- When you diet, your body unconsciously REDUCES NEAT\n- This is why fat loss stalls — you move less without realizing\n\n**Step targets:**\n- Sedentary: under 5,000\n- Lightly active: 5,000-7,500\n- Active: 7,500-10,000\n- Very active: 10,000+\n\n**How to increase steps:**\n- Walk 15 min after each meal (also helps digestion and blood sugar)\n- Take phone calls while walking\n- Park farther away\n- Take stairs instead of elevator\n\n**For fat loss:** Commit to a daily step target (e.g., 8000) and track it. This is more impactful than 3 gym cardio sessions per week.` },

  // ─── MENTAL & MOTIVATION ───
  { keys: ['motivation', 'no motivation', 'give up', 'quit', 'consistency', 'discipline'], cat: 'mindset',
    a: `**Motivation & Discipline — Staying Consistent**\n\n**The truth:** Motivation is temporary. Discipline is what gets results.\n\n**Strategies that work:**\n\n1. **Lower the bar:** On bad days, just show up and do 50% of your workout. Something > nothing.\n\n2. **Track everything:** Log workouts, meals, weight. Seeing progress (even slow progress) is motivating.\n\n3. **Never miss twice:** Missed Monday? Fine. But don't miss Tuesday too.\n\n4. **Environment design:** Pack your gym bag the night before. Same time every day. Remove friction.\n\n5. **Find your reason:** "I want to be strong enough to play with my kids at 60" beats "I want abs."\n\n6. **Progress photos:** Take them monthly. The mirror lies, photos don't.\n\n**Timeline reality:**\n- 4 weeks: You feel different\n- 8 weeks: You notice changes\n- 12 weeks: Others notice\n- 1 year: Transformed\n\n**Be patient. Be consistent. Results come.**` },

  { keys: ['beginner', 'new to gym', 'starting out', 'first time', 'gym newbie', 'just started'], cat: 'mindset',
    a: `**Beginner's Guide — Everything You Need to Know**\n\n**Week 1-4 priorities:**\n1. Learn the big 5: squat, bench, deadlift, overhead press, row\n2. Go 3x per week (full body)\n3. Start LIGHT — learn form before adding weight\n4. Don't worry about supplements\n5. Eat enough protein (1.6g/kg)\n\n**Common beginner mistakes:**\n- Too much volume (more isn't always better)\n- Skipping legs\n- Ego lifting (too heavy, bad form)\n- Program hopping (stick to one program for 12 weeks)\n- Comparing to experienced lifters\n\n**What to expect:**\n- Month 1: Soreness, learning curve, awkwardness\n- Month 2-3: Strength goes up fast (beginner gains)\n- Month 4-6: Visible body changes\n- Year 1: Serious transformation possible\n\n**Beginner gains are REAL.** You'll never progress as fast as your first year. Take advantage of it.` },

  // ─── MISC FITNESS TOPICS ───
  { keys: ['gym etiquette', 'gym rules', 'gym manners'], cat: 'misc',
    a: `**Gym Etiquette — Unwritten Rules**\n\n1. **Re-rack your weights.** Always.\n2. **Wipe down equipment** after use.\n3. **Don't hog equipment** — let people work in during long rest periods.\n4. **Don't curl in the squat rack** (unless the gym is empty).\n5. **Don't give unsolicited advice** — unless someone is about to hurt themselves.\n6. **Don't stand in front of the dumbbell rack** — step back.\n7. **Keep phone calls outside** the training floor.\n8. **Ask before using equipment** someone left a towel/bottle on.\n9. **Don't slam weights** unnecessarily.\n10. **Be cool.** Everyone started somewhere. Respect all fitness levels.\n\n**It's OK to:** Ask for a spot, ask how many sets someone has left, use headphones, and take selfies (quickly).` },

  { keys: ['how long', 'how long does it take', 'how fast', 'build muscle fast', 'quick results'], cat: 'misc',
    a: `**Realistic Muscle Building Timelines**\n\n**Natural muscle gain potential (per year):**\n- Year 1: 8-12 kg (beginner gains)\n- Year 2: 4-6 kg\n- Year 3: 2-3 kg\n- Year 4+: 1-2 kg\n\n**Total natural potential:** Most men can add 18-25 kg of muscle over a lifting career.\n\n**Fat loss timeline:**\n- Safe rate: 0.5-1% bodyweight per week\n- 10 kg fat loss: ~10-20 weeks\n- Visible abs: depends on starting point, usually 3-6 months of consistent cutting\n\n**What affects speed:**\n- Genetics (muscle fiber type, hormone levels)\n- Training quality and consistency\n- Nutrition adherence\n- Sleep and recovery\n- Age (younger = faster, but older lifters still make great progress)\n\n**Don't chase speed.** Chase consistency. 1 year of consistent effort beats 3 years of on-and-off training.` },

  { keys: ['natural', 'natty', 'steroid', 'steroids', 'peds', 'testosterone', 'trt', 'enhanced'], cat: 'misc',
    a: `**Natural vs Enhanced — Setting Realistic Expectations**\n\n**Natural potential indicators (men):**\n- FFMI of 24-26 is near the natural ceiling\n- Most people won't reach their genetic max\n- Look great naturally — just don't compare to enhanced athletes\n\n**Red flags of unrealistic expectations (from social media):**\n- "Gained 15 kg of lean muscle in 6 months"\n- Extremely shredded AND very big simultaneously\n- Full, round muscle bellies with paper-thin skin at 100+ kg\n\n**My advice:**\n- Compare yourself to YOUR past self, not others\n- Optimize training, nutrition, sleep — get 100% of your natural potential\n- Natural lifting builds a physique that's maintainable and healthy long-term\n\n**This app won't give advice on PEDs.** For health questions about hormones or TRT, consult an endocrinologist.` },

  { keys: ['1rm', 'one rep max', 'max', 'testing max', 'pr', 'personal record'], cat: 'training',
    a: `**Testing Your 1 Rep Max (1RM)**\n\n**When to test:**\n- After a training block (every 8-12 weeks)\n- When you feel strong and well-recovered\n- Never when fatigued, sick, or sleep-deprived\n\n**Warm-up protocol for a 1RM attempt:**\n- Bar x 10\n- 50% x 5\n- 70% x 3\n- 80% x 2\n- 90% x 1\n- 95% x 1\n- New max attempt\n- Rest 3-5 min between heavy singles\n\n**Estimated 1RM formula:**\nWeight x Reps x 0.0333 + Weight = estimated 1RM\n\nExample: 100 kg x 5 reps = 100 x 5 x 0.0333 + 100 = ~117 kg estimated 1RM\n\n**Always use a spotter** for bench press max attempts. Use safeties in the squat rack. Never max deadlift alone without bumper plates.\n\n**PR tip:** You don't need to test maxes often. If your 5-rep max goes up, your 1RM went up too.` },

  { keys: ['muscle group', 'which muscles', 'muscle anatomy', 'anatomy'], cat: 'misc',
    a: `**Muscle Groups — Training Guide**\n\n**Chest:** Bench press, incline press, flyes, dips\n**Back:** Rows, pull-ups, lat pulldown, deadlift\n**Shoulders:** OHP, lateral raises, face pulls\n**Quads:** Squat, leg press, lunges, leg extension\n**Hamstrings:** RDL, leg curl, Nordic curl\n**Glutes:** Hip thrust, squat, Bulgarian split squat\n**Biceps:** Curls (incline, preacher, cable, hammer)\n**Triceps:** Pushdown, overhead extension, close-grip bench, dips\n**Calves:** Standing calf raise, seated calf raise\n**Core:** Cable crunch, hanging leg raise, plank, ab wheel\n\n**Training frequency per muscle:**\n- Minimum: 1x per week\n- Optimal: 2-3x per week\n- Lagging muscle: Up to 4x per week\n\n**Priority order for most people:** Legs > Back > Chest > Shoulders > Arms. Build the foundation first.` },

  { keys: ['gym equipment', 'home gym', 'what equipment', 'equipment to buy'], cat: 'misc',
    a: `**Home Gym Essentials (Priority Order)**\n\n**Must-have (tier 1):**\n- Adjustable dumbbells (up to 40 kg): covers 80% of exercises\n- Pull-up bar (doorframe): back, biceps, core\n- Resistance bands: warm-ups, face pulls, assistance\n\n**Great additions (tier 2):**\n- Adjustable bench (flat/incline): opens up all pressing variations\n- Barbell + weight plates: for serious strength training\n- Squat rack/stands: for squats and bench press\n\n**Nice to have (tier 3):**\n- Cable machine or pulley system\n- Dip bars\n- Leg press/hack squat (if space allows)\n\n**Budget option (under 200 CHF):**\n- Adjustable dumbbells (Decathlon)\n- Pull-up bar\n- Resistance bands\n- Yoga mat\n\nThis covers full-body training effectively.` },

  { keys: ['rest time', 'rest between sets', 'how long to rest', 'rest period'], cat: 'training',
    a: `**Rest Periods Between Sets**\n\n**By goal:**\n- Strength (1-5 reps): 3-5 minutes\n- Hypertrophy (6-12 reps): 1.5-3 minutes\n- Endurance (12+ reps): 30-90 seconds\n\n**By exercise type:**\n- Heavy compounds (squat, bench, deadlift): 3-5 min\n- Moderate compounds (rows, OHP): 2-3 min\n- Isolation (curls, raises): 1-2 min\n- Supersets: 0 rest between exercises, 1-2 min between sets\n\n**Recent research says:** Longer rest = more muscle growth, because you can lift heavier and do more total volume.\n\n**Practical tip:** Rest until your breathing normalizes and you feel ready for another quality set. Don't rush heavy compounds. Do time your rest for isolation to keep workout length manageable.\n\n**Workout too long?** Use supersets for opposing muscle groups: bicep curl + tricep pushdown, chest press + row.` },

  { keys: ['supersets', 'superset', 'drop set', 'dropset', 'giant set', 'intensity technique'], cat: 'training',
    a: `**Intensity Techniques — Advanced Methods**\n\n**Supersets:**\n- Two exercises back-to-back, no rest\n- Antagonist (best): bicep curl + tricep pushdown\n- Same muscle (brutal): bench press + push-ups\n- Saves time, increases metabolic stress\n\n**Drop sets:**\n- Perform set to failure, reduce weight 20-30%, continue\n- Can drop 2-3 times\n- Great for last set of isolation exercises\n- Example: Lateral raise 15 kg x failure → 10 kg x failure → 5 kg x failure\n\n**Rest-pause:**\n- Set to failure, rest 10-15 seconds, continue for 3-5 more reps\n- Excellent for gaining extra volume\n\n**Myo-reps:**\n- Activation set of 12-15 reps, then 5-rep mini-sets with 5 second rests\n\n**Use these sparingly:** 1-2 intensity techniques per workout on the LAST set. Don't overdo it — they're extremely fatiguing.` },

  { keys: ['time', 'how long workout', 'workout duration', 'gym time', 'how long should'], cat: 'training',
    a: `**Optimal Workout Duration**\n\n**Sweet spot:** 45-75 minutes (excluding warm-up)\n\n**Why not longer?**\n- Cortisol rises significantly after 60-75 minutes\n- Focus and intensity drop\n- Diminishing returns on additional volume\n- Life has other demands\n\n**How to fit it in 60 minutes:**\n- Warm up: 5-10 min\n- Compounds: 3-4 exercises, 3-4 sets (25-30 min)\n- Isolation: 2-3 exercises, 3 sets (15-20 min)\n- Cool down: 5 min\n\n**Time-saving tips:**\n- Superset opposing muscles\n- Keep rest periods timed (don't scroll phone for 5 min)\n- Prepare your playlist and program before arriving\n- Go during off-peak hours\n\n**Train consistently for 45 minutes > Train 2 hours inconsistently.** Shorter, focused sessions you can sustain are always better.` },

  { keys: ['alcohol', 'drinking', 'beer', 'wine', 'does alcohol affect'], cat: 'nutrition',
    a: `**Alcohol & Fitness — The Honest Truth**\n\n**How alcohol affects gains:**\n- Reduces muscle protein synthesis by 20-30% after heavy drinking\n- Disrupts sleep quality (even if you fall asleep faster)\n- Contains 7 kcal per gram (almost as much as fat)\n- Increases cortisol, reduces testosterone temporarily\n- Lowers inhibitions → late-night junk food\n\n**Calorie content:**\n- Beer (500ml): ~200 kcal\n- Wine (glass): ~120 kcal\n- Vodka + soda: ~100 kcal\n- Cocktail: 200-500 kcal\n\n**If you're going to drink:**\n- Limit to 1-2 drinks\n- Choose lower-calorie options (spirits + zero-cal mixer)\n- Eat protein before drinking\n- Don't train the next day hung over\n- Don't drink on training days\n\n**Bottom line:** Occasional moderate drinking won't destroy your progress. Regular heavy drinking absolutely will.` },

  { keys: ['aging', 'older', 'over 40', 'over 50', 'senior', 'age'], cat: 'misc',
    a: `**Training Over 40+ — What Changes**\n\n**What stays the same:**\n- Progressive overload still works\n- Protein needs are the same (actually slightly higher)\n- Consistency is still king\n- You can still build muscle at ANY age\n\n**What to adjust:**\n- Longer warm-ups (10-15 min vs 5 min)\n- More joint-friendly exercises (machines, cables)\n- Slightly more recovery time (train 3-4x vs 5-6x)\n- Higher reps on compounds (8-12 vs 3-5)\n- Extra mobility work\n\n**Priorities:**\n1. Joint health — don't ego lift, use full ROM\n2. Recovery — sleep becomes even more important\n3. Injury prevention — warm up thoroughly\n4. Protein — 2g/kg to fight age-related muscle loss\n5. Resistance training — the #1 anti-aging activity\n\n**Research shows:** People who start strength training in their 60s still gain significant muscle. It's never too late.` },

  { keys: ['woman', 'women', 'female', 'girl', 'ladies', 'women lifting'], cat: 'misc',
    a: `**Training for Women — Facts vs Myths**\n\n**Myth: Lifting heavy makes women bulky.**\nFact: Women produce ~15x less testosterone than men. You'll get toned and strong, not bulky.\n\n**Myth: Women should only do high reps.**\nFact: Women benefit from the SAME rep ranges and programs as men.\n\n**What IS different:**\n- Women recover faster between sets (shorter rest OK)\n- Women can handle more volume per session\n- Women typically have less upper body strength relative to lower\n- Menstrual cycle can affect energy levels (plan heavier training in follicular phase)\n\n**Best exercises for common goals:**\n- Glutes: Hip thrust, Bulgarian split squat, RDL\n- Toned arms: Overhead tricep extension, bicep curls\n- Flat stomach: Calorie deficit + core work\n- Overall shape: Squat, deadlift, overhead press\n\n**Do the same compounds as men.** Squat, bench, deadlift, row, press. You'll love the results.` },

  { keys: ['track', 'tracking', 'log workout', 'fitness app', 'tracking progress'], cat: 'misc',
    a: `**How to Track Progress Effectively**\n\n**What to track:**\n1. **Workouts:** Exercise, sets, reps, weight (use this app!)\n2. **Nutrition:** Calories & protein (use the Meals page)\n3. **Body weight:** Daily weigh-in, weekly average\n4. **Progress photos:** Every 2-4 weeks, same lighting/angle\n5. **Measurements:** Waist, chest, arms, legs (monthly)\n\n**Why the scale lies:**\n- Water fluctuations: +/- 1-2 kg daily\n- Carb intake affects water retention\n- Menstrual cycle (women): 1-3 kg fluctuation\n- Sodium intake: high salt = temporary water weight\n\n**Use weekly averages, not daily numbers.**\n\n**Best progress indicator:** Are your lifts going up while your waist stays the same or gets smaller? You're building muscle and losing fat.\n\n**Take photos.** You see yourself every day and won't notice changes. Photos taken weeks apart will shock you.` },

  { keys: ['skinny fat', 'skinnyfat', 'bulk or cut', 'should i bulk', 'should i cut'], cat: 'body',
    a: `**Skinny Fat — Bulk or Cut First?**\n\n**What is skinny fat?**\nLow muscle mass + moderate body fat. Look thin in clothes but soft without them.\n\n**Decision framework:**\n\n**Cut first if:**\n- Body fat is above 20% (men) or 30% (women)\n- You feel uncomfortable with current fat level\n- You want to see definition before building\n\n**Lean bulk first if:**\n- Body fat is under 18% (men) or 25% (women)\n- You have very little muscle\n- You're a complete beginner (you'll recomp naturally)\n\n**Best approach for most skinny-fat beginners:**\n1. Eat at maintenance calories\n2. HIGH protein (2g/kg)\n3. Lift heavy 3-4x per week\n4. Be patient for 3-6 months\n5. Beginners can build muscle and lose fat simultaneously (recomp)\n\nAfter 3-6 months of recomp, you'll have more muscle and less fat. Then decide to bulk or cut based on your goal.` },

  { keys: ['cheat meal', 'cheat day', 'refeed', 'diet break', 'treat meal'], cat: 'nutrition',
    a: `**Cheat Meals, Refeeds & Diet Breaks**\n\n**Cheat meal vs refeed:**\n- Cheat meal: Eat whatever, no tracking. Can easily undo a week's deficit.\n- Refeed: Planned increase in calories (mostly carbs), tracked. Smarter approach.\n\n**Refeed protocol:**\n- Increase calories to maintenance\n- Extra calories come from carbs (not fat)\n- 1-2 days per week during a cut\n- Benefits: leptin boost, gym performance, mental break\n\n**Diet break:**\n- 1-2 weeks at maintenance calories\n- Every 6-12 weeks during extended cuts\n- Psychological AND physiological benefits\n- Metabolism adjusts upward\n\n**Rules for treat meals:**\n- Enjoy it without guilt\n- Get right back to your plan next meal\n- Don't turn a cheat meal into a cheat week\n- Budget it into your weekly calories if possible\n\n**Sustainability > Perfection.** An 80% consistent diet beats a 100% diet you quit after 3 weeks.` },

  { keys: ['post workout', 'after workout', 'post-workout', 'anabolic window'], cat: 'nutrition',
    a: `**Post-Workout Nutrition — What Matters**\n\n**The "anabolic window" myth:**\n- You do NOT need to chug a protein shake within 30 minutes\n- Muscle protein synthesis is elevated for 24-48 hours after training\n- Just eat a protein-rich meal within 2-3 hours\n\n**What to eat post-workout:**\n- 25-40g protein (any source)\n- Carbs (replenish glycogen): rice, potatoes, fruit, bread\n- Example: chicken + rice, or protein shake + banana\n\n**Timing only matters if:**\n- You train fasted (eat soon after)\n- You won't eat for 4+ hours after training\n- You're an elite athlete optimizing every detail\n\n**For 99% of people:** Just hit your daily protein and calorie targets. Meal timing is the last 1% of optimization.\n\n**Pre-workout meal is actually more important:** Eat 1-3 hours before training for better performance.` },

  { keys: ['form', 'technique', 'form check', 'proper form', 'bad form'], cat: 'training',
    a: `**Exercise Form — The Essentials**\n\n**Universal cues that apply to all lifts:**\n\n1. **Brace your core** — Deep breath into belly, tighten abs as if expecting a punch\n2. **Control the weight** — Own the eccentric (lowering phase)\n3. **Full ROM** — Partial reps = partial gains\n4. **Stable base** — Feet planted, back tight on bench\n5. **Neutral spine** — No rounding or excessive arching\n\n**When form matters most:**\n- Heavy compounds (squat, deadlift, bench, OHP)\n- These can cause injury with bad form\n- Film yourself from the side and front\n\n**When form matters less:**\n- Light isolation exercises near failure\n- Some "cheating" on last reps is acceptable\n- Example: body English on last 2 reps of curls = fine\n\n**How to learn good form:**\n- Watch tutorials from reputable coaches\n- Film yourself and compare\n- Start with light weight\n- Hire a coach for 2-3 sessions if possible` },
];

/* ─── Smart keyword matching engine ─── */
function findBestResponse(input) {
  const lower = input.toLowerCase().trim();
  const words = lower.split(/\s+/);

  let best = null;
  let bestScore = 0;

  for (const t of TEMPLATES) {
    let score = 0;

    // Exact key phrase match (highest priority)
    for (const key of t.keys) {
      if (lower.includes(key)) {
        score += 10 + key.length; // longer matches score higher
      }
    }

    // Individual word matches against keys
    if (score === 0) {
      for (const word of words) {
        if (word.length < 3) continue;
        for (const key of t.keys) {
          if (key.includes(word)) score += 2;
        }
      }
    }

    // Category boost for common intent words
    if (t.cat === 'recipe' && (lower.includes('recipe') || lower.includes('cook') || lower.includes('food') || lower.includes('meal') || lower.includes('make me') || lower.includes('eat'))) score += 5;
    if (t.cat === 'exercise' && (lower.includes('exercise') || lower.includes('how to') || lower.includes('best'))) score += 3;
    if (t.cat === 'program' && (lower.includes('program') || lower.includes('routine') || lower.includes('plan') || lower.includes('split'))) score += 3;
    if (t.cat === 'nutrition' && (lower.includes('nutrition') || lower.includes('diet') || lower.includes('eat'))) score += 3;

    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  if (best && bestScore >= 3) return best.a;
  return null;
}

/* ─── Category-based fallback when no template matches ─── */
function getCategoryFallback(input) {
  const lower = input.toLowerCase();

  if (/recipe|cook|food|ingredient|dish|snack|breakfast|lunch|dinner|meal idea/.test(lower))
    return `I don't have a specific recipe for that, but here are some tips:\n\n**Quick high-protein meals:**\n- Chicken breast + rice + veggies (classic bodybuilder meal)\n- Greek yogurt bowl with nuts and berries\n- Omelette with cheese and vegetables\n- Tuna salad with whole grain bread\n\n**Try searching the Meals page** — you can search Swiss products (Coop, Migros, Lidl) and add them with auto-calculated nutrition.\n\nAsk me about specific types like "vegetarian recipe", "protein shake", "low calorie meal", or "breakfast ideas" for detailed recipes!`;

  if (/exercise|workout|train|lift|muscle/.test(lower))
    return `I'd be happy to help with exercise advice! Try asking about specific topics:\n\n**Exercises:** "bench press form", "best bicep exercises", "pull-ups", "squat technique"\n**Programs:** "PPL split", "full body program", "upper lower split", "home workout"\n**Concepts:** "progressive overload", "how many sets", "rep ranges", "warm up"\n\nThe more specific your question, the better advice I can give!`;

  if (/diet|nutrition|calorie|macro|protein|carb|fat|supplement|bulk|cut/.test(lower))
    return `Great nutrition question! Here are some topics I can help with:\n\n**Diet plans:** "bulking guide", "cutting guide", "meal prep", "flexible dieting"\n**Macros:** "how much protein", "macro guide", "calorie calculator"\n**Supplements:** "creatine", "protein powder", "supplements that work"\n**Specific:** "intermittent fasting", "post-workout meal", "cheat meals"\n\nAsk me something specific and I'll give you a detailed answer!`;

  return null;
}

/* ─── Main response function ─── */
function getResponse(input) {
  // Try template matching first
  const templateResponse = findBestResponse(input);
  if (templateResponse) return templateResponse;

  // Try category fallback
  const catFallback = getCategoryFallback(input);
  if (catFallback) return catFallback;

  // Final generic fallback
  return `Good question! I cover a wide range of fitness topics. Here are some things you can ask me about:\n\n**Exercises:** Bench press, squat, deadlift, pull-ups, curls, and 20+ more\n**Programs:** PPL, upper/lower, full body, bro split, home workouts\n**Nutrition:** Calories, macros, protein, bulking, cutting, meal prep\n**Recipes:** High-protein, vegetarian, vegan, breakfast, shakes, Swiss meals\n**Recovery:** Sleep, stretching, deloads, injury prevention\n**Other:** Motivation, beginner guide, supplements, body composition\n\nTry asking something like:\n- "Give me a vegetarian recipe"\n- "How do I do a proper deadlift?"\n- "What's a good PPL program?"\n- "How much protein do I need?"`;
}

const QUICK_PROMPTS = [
  'High protein recipe',
  'Vegetarian meal ideas',
  'Best PPL program',
  'How much protein do I need?',
  'Progressive overload tips',
  'Best biceps exercises',
];

export default function Coach() {
  const [messages, setMessages] = useState([
    { role: 'coach', text: 'Hey! I\'m your AI fitness coach. Ask me anything about training, nutrition, recipes, programs, or recovery. I have 100+ detailed answers ready for you.' }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (text) => {
    const q = text || input;
    if (!q.trim() || typing) return;
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setTyping(true);
    // Simulate brief "thinking" delay for natural chatbot feel
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'coach', text: getResponse(q) }]);
      setTyping(false);
    }, 400 + Math.random() * 600);
  };

  /* render markdown bold and line breaks */
  const renderText = (text) => {
    return text.split('\n').map((line, j) => {
      const parts = line.split(/(\*\*.*?\*\*)/g).map((seg, k) => {
        if (seg.startsWith('**') && seg.endsWith('**'))
          return <strong key={k}>{seg.slice(2, -2)}</strong>;
        return seg;
      });
      return <span key={j}>{parts}<br/></span>;
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>AI Coach</h1>
          <p>Your personal fitness advisor</p>
        </div>
      </div>

      <div className="coach-banner">Ask me anything — training, nutrition, recipes, programs, recovery, and more. 100+ topics covered.</div>

      <div className="quick-prompts">
        {QUICK_PROMPTS.map(p => (
          <button key={p} className="quick-prompt-btn" onClick={() => send(p)}>{p}</button>
        ))}
      </div>

      <div className="chat-container">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <div className="chat-role">{m.role === 'coach' ? 'AI Coach' : 'You'}</div>
            <div className="chat-text">{renderText(m.text)}</div>
          </div>
        ))}
        {typing && (
          <div className="chat-bubble coach">
            <div className="chat-role">AI Coach</div>
            <div className="chat-text typing-indicator"><span></span><span></span><span></span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input-bar">
        <input
          className="chat-input"
          placeholder="Ask your coach anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="chat-send" onClick={() => send()}>Send</button>
      </div>
    </div>
  );
}
