# OmniLearn production design, 13 November 2026

Historical checkpoint. [V9.1 synthesis and final browser proof](V9.1-design-synthesis.md) supersedes the unverified browser status below. Preserve these earlier observations as history.

Direction: continue the owner's nine-screen OmniLearn showcase, with navy surfaces, orange primary actions and blue study-progress accents. This is an iteration of the existing production app, not a new direction or an HTML prototype. Energy 2, rhythm 2, motion 2.

| Reference | Observation | Production decision |
| --- | --- | --- |
| Owner's OmniLearn showcase | Compact sidebar, four summary cards, paired level/timer and chart/activity panels | Shared 220px sidebar and two-column management grid, single column on phones |
| [Pelajarin](https://pelajarin.ai/) public page | Document input and notes appear together in the educational workflow | Keep source library and study tools accessible; Home stays centered on starting a session |
| [Linear](https://linear.app/) public page | Named workspace destinations separate collection navigation from work content | Primary navigation stays compact; existing specialized tools remain contextual |
| [Notion](https://www.notion.com/) public page | Capture and find are distinct jobs | Separate Catatan collection from its individual editor and chapter reader |
| [Geist](https://vercel.com/geist/introduction) | Shared components and accessible color foundations | Keep one canonical stylesheet with semantic tokens and compatibility aliases |
| [Motion JavaScript](https://motion.dev/docs/animate) | Animation is available independently of React | Current 180ms view transitions need only native Web Animations; no React or extra dependency |
| [Apple motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion) | Web page requires JavaScript in this retrieval | No claim that the full guideline was inspected; implement the owner's explicit reduced-motion requirements |

Only public content was retrieved from those websites. Authenticated Pelajarin screens were not accessed. No third-party code, logos, mascot or illustration was copied.

## Decisions and purpose

- Navy remains the dark-theme brand; cool light surfaces keep the same hierarchy in light mode.
- System typography matches the owner's specified stack and avoids extra font loading in the dashboard.
- Orange marks primary actions and selected navigation; blue distinguishes recorded study activity.
- Four summary links open their corresponding real pages. Their values come from the existing local store.
- Level and timer sit together because both help choose the next study session. Weekly and recent activity sit below because they explain past activity.
- Video and full library controls remain in a secondary disclosure so the management overview stays compact.
- Material continuation uses `lessonTitle`, retaining filenames inside the existing source metadata.
- One short view entrance signals content replacement; hover and press states confirm actions. All movement stops under reduced motion, including a preference change during an entrance.
- Radius and motion variables are shared; no new component library or runtime service was introduced.

## Verification boundary

Syntax, fixtures and HTTP-route checks run locally. Chromium launch fails at `process_singleton_posix.cc` with `socket() failed: Operation not permitted`. Policy rejects elevated browser execution. Consequently visual comparison, contrast measurement, pointer/keyboard click-through and responsive screenshot gates remain unverified. No screenshot, Lighthouse score, completed design acceptance or deployed revision is claimed.
