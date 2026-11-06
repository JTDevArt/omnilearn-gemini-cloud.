# Product V2: implemented scope and evidence

## Routes and design

Home lives at `/`; the learning application lives at `/dashboard`. Existing API routes, learning-engine DOM IDs and learning tools remain. The original subject explorer is reachable through “Jelajahi bidang ilmu”. Direct navigation/refresh works. The landing uses warm surfaces, orange accents, paper cards/tape, sticky notes, an original SVG mascot and self-hosted Nunito/Caveat fonts with licenses. No third-party brand assets or endorsements were copied. Reference sites returned network-policy 403; supplied screenshots were the visual reference.

Dashboard adds vertical navigation/mobile drawer, source search, session-scoped library, source switching, editable per-source notes/export, settings and device text-to-speech. No account/cloud-sync claim is made. Storage failures are reported; old sources are not silently evicted.

## Actual video and media

`public/assets/omnilearn-demo.mp4` is an original 33-second recording of the running product: PDF upload, Gemini summary, tutor, flashcards, quiz and mindmap. All five recorded study/chat responses were HTTP 200. This is not CSS animation or simulated model output. H.264 MP4 is 526,763 bytes, with poster, muted/loop/playsinline controls, viewport playback and reduced-motion handling. It demonstrates the workflow, not every feature or quiz completion.

MP3/WAV transcription and MP4/MOV speech/visual analysis use Gemini through the existing upload job pipeline. Inputs retain the 15 MB cap, signature/extension validation and total provider deadlines. Gemini operations are limited to four concurrent generations per process. Each advertised extension passed a live request with original short synthetic fixtures, in approximately 1.6–2.2 seconds. These measurements do not predict long-file behavior. Audio-only prompts prohibit visual invention. Long/adversarial media and full visual-accuracy benchmarking remain unverified.

YouTube URLs can be stored with user-provided transcripts. Automatic caption acquisition is not implemented or advertised; no access protections are bypassed.

## Learning improvements

Six teaching modes reach server-validated task guidance. Responses remain adaptive, without a universal word-count cap. Flashcards have growing review intervals, due dates per source and a due-card filter, persisted within the browser tab. Mindmaps support zoom, viewport pan and JSON export alongside expand/collapse. Separate cause-and-effect sections stay removed.

## Verification executed

- Learning-engine: 8 passing tests; provider/UI regressions: 9; AI policy: 3; archive validation: 2; product/media/scheduling: 3; API readiness: 5.
- Chromium at 1920, 1366, 768, 390 and 360 px: no horizontal document overflow or captured page errors. Home-to-dashboard navigation, manual source creation, notes persistence on reload and dark mode passed.
- Five real study/chat requests in the original recording passed, plus MP3/WAV/MP4/MOV live media tests.
- Syntax/build and whitespace checks passed. Screenshots and request evidence remain in `/workspace/qa-output` outside the checkout.

## Not complete

The entire two-directive scope is not finished. Missing items include automatic YouTube captions, essay/short-answer/true-false quizzes, persistent text highlighting, account-backed review scheduling, streaming tutor output, downloadable server-generated podcast audio, individual graph-node dragging and the complete OCR/security/performance matrix. Browser TTS is labeled as device speech, not generated downloadable audio. No comprehensive security certification is claimed.

GitHub synchronization is distinct from publishing an environment or deploying AI Studio. No callable publish/production deployment tool is available in this session; local checks and main-branch pushes are not evidence of live deployment.
