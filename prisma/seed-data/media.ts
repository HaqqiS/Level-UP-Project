export type ExerciseMediaEntry = {
	/** Live oEmbed-verified 11-character YouTube video ID. */
	demoVideoId?: string;
	/** Public Supabase Storage keys inside bucket `exercise-media` (`<slug>/0.webp`, `<slug>/1.webp`). */
	demoImages?: string[];
};

/**
 * Curated 2-layer Exercise Form Demo media map keyed by `SEED_EXERCISES` slug:
 * - `demoImages`: audited Unlicense/public-domain 2-frame WebP illustrations uploaded from
 *   `yuhonas/free-exercise-db` to Supabase Storage bucket `exercise-media`.
 * - `demoVideoId`: live YouTube oEmbed-verified calisthenics & PT form tutorials covering
 *   all 18 zero-equipment foundations plus core Level 1–4 staples and key progressions.
 */
export const EXERCISE_MEDIA_BY_SLUG: Record<string, ExerciseMediaEntry> = {
	// ─── 18 Zero-Equipment Foundations (100% video coverage) ─────────
	"wall-scapular-pushup": {
		demoVideoId: "8G9F4OZD19U", // College Station PT — Wall Scapular Push-Up
	},
	"wall-plank-hold": {
		demoVideoId: "8BPRH34Z8Ak", // Pilates On Demand — Wall Plank Exercise Tutorial
	},
	"wall-pushup-negative": {
		demoVideoId: "zkU6Ok44_CI", // Hybrid Calisthenics — You CAN do pushups, my friend!
	},
	"wall-angel-slide": {
		demoVideoId: "4Fm0gLIeVcU", // Dr. Carl Baird — Wall Angel Exercise
	},
	"prone-t-y-raise": {
		demoVideoId: "TMnRKdNOrrA", // Cali Hoss — Calisthenics Shoulder Mobility Prone YTW
	},
	"doorframe-assisted-row": {
		demoVideoId: "7uSfUJ89wck", // Fit as a Daisy — How to do a Doorframe Row
	},
	"seated-leg-march": {
		demoVideoId: "1m72e65YZtM", // Medbridge — How to Do a Seated March
	},
	"chair-sit-to-stand": {
		demoVideoId: "0FkRr45YeEQ", // NHS Ayrshire & Arran — Sit To Stand
	},
	"wall-sit-mini": {
		demoVideoId: "sT0jUNnb9dk", // Great River Health — Wall Sit Tutorial
	},
	"supine-pelvic-tilt": {
		demoVideoId: "U0dfnyfhpwk", // Medbridge — How to Do a Supine Pelvic Tilt
		demoImages: ["supine-pelvic-tilt/0.webp", "supine-pelvic-tilt/1.webp"],
	},
	"heel-slide-brace": {
		demoVideoId: "llkFZKfwf7c", // Empowered PT — Heel Slides for Beginner Core Control
	},
	"bird-dog-hold": {
		demoVideoId: "LrhCJc7-YxM", // Dr. Carl Baird — Bird Dog Exercise
	},
	"quadruped-weight-shift": {
		demoVideoId: "RIzGxbOPkVc", // Whole Body Health PT — Wrist Mobility Quadruped Rocking
	},
	"tabletop-shoulder-tap": {
		demoVideoId: "7iAz1AYvoTs", // MGH Orthopaedics — Tabletop Plank Exercise
	},
	"bear-crawl-hover": {
		demoVideoId: "HV2ME5C4Fhs", // Dr. Chris Pieton PT — Bear Plank
	},
	"neck-shoulder-circles": {
		demoVideoId: "qYBcpajagvc", // UF Health — Warm Up Scapular Mobility (Shoulder Rolls)
		demoImages: [
			"neck-shoulder-circles/0.webp",
			"neck-shoulder-circles/1.webp",
		],
	},
	"cat-cow-spine": {
		demoVideoId: "0evc3aPUUro", // Antranik Kizirian — How to do Cat/Cow
		demoImages: ["cat-cow-spine/0.webp", "cat-cow-spine/1.webp"],
	},
	"childs-pose-reach": {
		demoVideoId: "kH12QrSGedM", // Baptist Health — Child Pose
		demoImages: ["childs-pose-reach/0.webp", "childs-pose-reach/1.webp"],
	},

	// ─── PUSH ────────────────────────────────────────────────────────
	"wall-pushup": {
		demoVideoId: "wIPJvBQs7RA", // Hinge Health — How to Do Wall Push Ups
	},
	"incline-pushup": {
		demoVideoId: "-o9mQxo4cUE", // Natural Bodies Method — Incline Push Up Tutorial
		demoImages: ["incline-pushup/0.webp", "incline-pushup/1.webp"],
	},
	"knee-pushup": {
		demoVideoId: "__71lgdtiB8", // Wellen — Modified Push-Up On Knees
	},
	pushup: {
		demoVideoId: "-WXc4E-zcao", // FitnessFAQs — Master the Push-Up (Beginner Tutorial)
		demoImages: ["pushup/0.webp", "pushup/1.webp"],
	},
	"wide-pushup": {
		demoImages: ["wide-pushup/0.webp", "wide-pushup/1.webp"],
	},
	"diamond-pushup": {
		demoVideoId: "ZR5U3sb-KeE", // Buff Dudes — How to Perform Diamond Push Ups
		demoImages: ["diamond-pushup/0.webp", "diamond-pushup/1.webp"],
	},
	"decline-pushup": {
		demoImages: ["decline-pushup/0.webp", "decline-pushup/1.webp"],
	},
	"one-arm-pushup": {
		demoImages: ["one-arm-pushup/0.webp", "one-arm-pushup/1.webp"],
	},
	"scapular-pushup": {
		demoVideoId: "HR-R4FMwROk", // The CaliFactory — Scapular Push Ups Tutorial
	},
	"bench-dip": {
		demoVideoId: "4ua3MzaU0QU", // DeltaBolic — The PERFECT Bench Dip
		demoImages: ["bench-dip/0.webp", "bench-dip/1.webp"],
	},
	"parallel-bar-dip": {
		demoVideoId: "fg8KCXpcz4s", // FitnessFAQs — How To Perform Dips Without Pain
		demoImages: ["parallel-bar-dip/0.webp", "parallel-bar-dip/1.webp"],
	},
	"ring-dip": {
		demoImages: ["ring-dip/0.webp", "ring-dip/1.webp"],
	},
	"pike-pushup": {
		demoVideoId: "eN6uwRVdNyY", // FitnessFAQs / Daniel Vadnal — Are You Doing Pike Push-Ups Correctly?
	},
	"wall-hspu": {
		demoImages: ["wall-hspu/0.webp", "wall-hspu/1.webp"],
	},

	// ─── PULL ────────────────────────────────────────────────────────
	"dead-hang": {
		demoVideoId: "dOCQjaasbGs", // FitnessFAQs — How To Dead Hang Correctly
	},
	"scapular-pull": {
		demoVideoId: "mr74_9VkeOk", // The CaliFactory — Scapular Pull ups Tutorial
		demoImages: ["scapular-pull/0.webp", "scapular-pull/1.webp"],
	},
	"incline-bodyweight-row": {
		demoImages: [
			"incline-bodyweight-row/0.webp",
			"incline-bodyweight-row/1.webp",
		],
	},
	"australian-pullup": {
		demoVideoId: "5Vy6mjhXg7s", // Danny Matranga — Inverted Row / Australian Pull-Up Tutorial
		demoImages: ["australian-pullup/0.webp", "australian-pullup/1.webp"],
	},
	"negative-pullup": {
		demoVideoId: "zEGiFGhQqQM", // Freeletics — Negative Pullup Tutorial
	},
	"band-assisted-pullup": {
		demoImages: ["band-assisted-pullup/0.webp", "band-assisted-pullup/1.webp"],
	},
	chinup: {
		demoVideoId: "e1YSApl-QcM", // Simonster Strength — PERFECT CHIN-UPS Tutorial
		demoImages: ["chinup/0.webp", "chinup/1.webp"],
	},
	pullup: {
		demoVideoId: "ax6T2L0dpdk", // FitnessFAQs — The Perfect Pull-Up Workout
		demoImages: ["pullup/0.webp", "pullup/1.webp"],
	},
	"assisted-one-arm-pullup": {
		demoImages: [
			"assisted-one-arm-pullup/0.webp",
			"assisted-one-arm-pullup/1.webp",
		],
	},
	"ring-muscle-up": {
		demoImages: ["ring-muscle-up/0.webp", "ring-muscle-up/1.webp"],
	},

	// ─── LEGS ────────────────────────────────────────────────────────
	"assisted-squat": {
		demoVideoId: "R1qle2oLXpE", // Live Lean TV — Supported Squat Exercise Guide
	},
	"bodyweight-squat": {
		demoVideoId: "z3XQ7T4-abQ", // Hybrid Calisthenics — You CAN do deep squats, my friend!
		demoImages: ["bodyweight-squat/0.webp", "bodyweight-squat/1.webp"],
	},
	"split-squat": {
		demoVideoId: "4bNQITw0VdY", // E3 Rehab — How To Perform PERFECT Split Squats
	},
	"bulgarian-split-squat": {
		demoVideoId: "rah3eJCPXHA", // MuscleWiki — Bulgarian Split Squat Form Tutorial
	},
	"pistol-squat": {
		demoVideoId: "R1mxpLzYgxM", // FitnessFAQs — The Complete Pistol Squat Checklist
	},
	"glute-bridge": {
		demoVideoId: "L9KZfxT654Y", // Runna — Glute Bridge Tutorial
		demoImages: ["glute-bridge/0.webp", "glute-bridge/1.webp"],
	},
	"single-leg-glute-bridge": {
		demoVideoId: "VUl8R0kn6v4", // Runna — Single Leg Glute Bridge Tutorial
		demoImages: [
			"single-leg-glute-bridge/0.webp",
			"single-leg-glute-bridge/1.webp",
		],
	},
	"sliding-leg-curl": {
		demoImages: ["sliding-leg-curl/0.webp", "sliding-leg-curl/1.webp"],
	},
	"nordic-hamstring-negative": {
		demoImages: [
			"nordic-hamstring-negative/0.webp",
			"nordic-hamstring-negative/1.webp",
		],
	},
	"standing-calf-raise": {
		demoVideoId: "VArtkSV3eN0", // Colossus Fitness — How to Do Standing Calf Raises Correctly
	},

	// ─── CORE ────────────────────────────────────────────────────────
	"dead-bug": {
		demoVideoId: "-gRN_JyVTLY", // Jack Hanrahan Fitness — How To Do The Dead Bug Correctly
		demoImages: ["dead-bug/0.webp", "dead-bug/1.webp"],
	},
	"knee-plank": {
		demoVideoId: "PYWLZmfc7f8", // Calixpert — How To Do Plank On Knees
	},
	plank: {
		demoVideoId: "cmJnMKl411E", // FitPulse Daily — How to Do a Forearm Plank Correctly
		demoImages: ["plank/0.webp", "plank/1.webp"],
	},
	"hollow-body-tuck": {
		demoVideoId: "uZqTUwq96iU", // FitnessFAQs — The BEST HOLLOW BODY Progressions
	},
	"hollow-body-hold": {
		demoVideoId: "uZqTUwq96iU", // FitnessFAQs — The BEST HOLLOW BODY Progressions
	},
	"hanging-knee-raise": {
		demoVideoId: "IHOFHNWn0_M", // Calixpert — How To Do Hanging Knee Raises
	},
	"hanging-leg-raise": {
		demoVideoId: "S2QVHl6DoNo", // Simonster Strength — Hanging Leg Raise Tutorial
		demoImages: ["hanging-leg-raise/0.webp", "hanging-leg-raise/1.webp"],
	},
	"toes-to-bar": {
		demoVideoId: "6GpTg3dO7Tk", // Calixpert — Unlock Your First Toes To Bar
		demoImages: ["toes-to-bar/0.webp", "toes-to-bar/1.webp"],
	},
	"side-plank": {
		demoVideoId: "XeN4pEZZJNI", // Well+Good — How To Do A Side Plank
		demoImages: ["side-plank/0.webp", "side-plank/1.webp"],
	},

	// ─── SKILL & MOBILITY ────────────────────────────────────────────
	"crow-pose": {
		demoVideoId: "Hml31hm-Zkg", // Antranik Kizirian — Crow Pose Tutorial
	},
	"wall-handstand-hold": {
		demoVideoId: "olA58oW-21A", // Andrew Alinda — Chest To Wall Handstand
	},
	"tuck-front-lever": {
		demoVideoId: "69sxB5FBR6o", // McChillin — Front Lever Comprehensive Tutorial
	},
	"l-sit": {
		demoVideoId: "IUZJoSP66HI", // Antranik Kizirian — Floor L-sit Progression Tutorial
	},
	"wrist-warm-up": {
		demoVideoId: "T9iDur3uxso", // Tom Merrick — 10 Minute Wrist Flexibility Routine
		demoImages: ["wrist-warm-up/0.webp", "wrist-warm-up/1.webp"],
	},
	"shoulder-dislocates-band": {
		demoImages: [
			"shoulder-dislocates-band/0.webp",
			"shoulder-dislocates-band/1.webp",
		],
	},
	"deep-squat-hold": {
		demoVideoId: "zWI6Xp4lWu4", // Strength Side — Deep Squat Stretches
	},
	"pancake-stretch": {
		demoImages: ["pancake-stretch/0.webp", "pancake-stretch/1.webp"],
	},
};
