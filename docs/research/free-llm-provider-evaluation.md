# Free LLM evaluation

Decision: retain Gemini production routing. No additional provider is approved for student data or production. A bounded, server-only Groq text pilot is implemented for synthetic fixture tests; it is not imported by the Express server. Credentials, account quota, region, data-processing approval and live output acceptance remain gates. Catalog availability is not an entitlement or an SLA.

## Three independent projects

| Source | Verified role | Decision |
|---|---|---|
| [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi), [site](https://freellmapi.co/) | MIT self-hosted router; own provider keys required; single-user design | REJECTED for public production gateway; REQUIRES_REVIEW for private experiments |
| [freellm.net](https://freellm.net/) | Model/provider discovery, comparisons and configuration directory | UNSUPPORTED as an inference endpoint; useful only for discovery |
| [CezaryChodun/FreeLLM](https://github.com/CezaryChodun/FreeLLM) | GPL-3.0 Go proxy over LiteLLM, PostgreSQL and Prometheus | REQUIRES_REVIEW; extra services and license review are unjustified for this pilot |

FreeLLMAPI's [architecture](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/architecture/00-high-level-index.md) documents Express, React/Vite administration, SQLite, AES-256-GCM key storage, unified bearer authentication, model-health probes, persistent RPM/RPD/TPM/TPD tracking and cooldowns. Routing scores capability, health, speed and quota headroom; its documented fallback budget can attempt up to 20 providers. That is excessive for OmniLearn's short deadlines and would expand data recipients. No multi-tenant authorization or per-user billing is supplied. Encryption at rest does not make the admin surface safe to expose publicly.

The [installation guide](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/install/01-install.md) supplies Docker/Compose and local development paths, persistent SQLite volumes and localhost binding. It requires managing the encryption key and provider keys. [API docs](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md) and architecture advertise `/v1/models`, `/v1/chat/completions`, responses/messages/completions/embeddings compatibility and streaming. Modality, structured JSON, tools and usage accounting depend on the actual upstream model. Signed catalog updates do not replace live compatibility testing. No version was installed; the inspected main documentation is not runtime verification. Monitoring/probes themselves can consume quota. Privacy remains governed by every upstream provider and local logs/backups. Production suitability is rejected by the project's own personal-use warning.

Source C requires Go 1.26+ for native build; its Docker example runs four services. Provider credentials belong to LiteLLM, not the outer router. Configured token/request utilization selects the least-used eligible model, and PostgreSQL stores counters. Its README still lists Groq Llama models that Groq's current deprecation notice excludes from free/developer access. Do not import those defaults. Its sample outer request has no bearer header; public auth, streaming behavior, retries, JSON guarantees, modality isolation and data retention were not independently validated. Never deploy that example as OmniLearn's public API.

## Provider comparison

Statuses refer to this project and this verification date. `APPROVED_FOR_TESTING` means synthetic, non-sensitive tests only. Unknown values are deliberately not guessed. All API keys must remain server-side.

| Provider / candidate model | Endpoint / auth | Free status and quota evidence | Context / max output | Text / vision / documents | JSON / streaming / tools | Status |
|---|---|---|---|---|---|---|
| Gemini `gemini-3.8-flash` (existing) | `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`; server API key | Some models have free access; exact project RPM/RPD/TPM unknown pending console | 1,048,576 input / 65,536 output per model page | Text, image, video, audio, PDF input; text output | Structured output, streaming and tools supported by model; app retains its validated paths | REQUIRES_REVIEW for free-tier student data; existing configuration preserved |
| Groq `openai/gpt-oss-20b` | `https://api.groq.com/openai/v1/chat/completions`; Bearer | Published table lists 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD; exact account entitlement must be checked, table wording varies by tier | 131,072 context / 65,536 completion; local pilot caps input at 16k serialized characters and output at 2,048 tokens | Text pilot only; no image/file forwarding | JSON object mode with app validation; provider streaming/tools not enabled in pilot | APPROVED_FOR_TESTING (fixtures); live BLOCKED by missing approved key |
| OpenRouter `openrouter/free` | `https://openrouter.ai/api/v1/chat/completions`; Bearer | Free variants: 20 RPM and 50 RPD; higher daily cap requires purchased credits; failures count | Varies with routed model; no fixed output/context guarantee | Model-dependent; text-only would need explicit allowlist | Model-dependent JSON/stream/tools | REQUIRES_REVIEW; dynamic recipients and model identity unsuitable as silent fallback |
| Cerebras `qwen-3.8-27b` | `https://api.cerebras.ai/v1/chat/completions`; Bearer | Trial only: $5 after payment-method verification, expires in 30 days. Trial table lists 300 RPM and 150k uncached TPM for Qwen; RPD not published. No recurring free tier | Account/model-dependent; older 8,192 free-context claim not accepted as current | Text candidate; vision/document handling not approved | Chat API supports structured requests; exact schema/stream/tools need model verification | REQUIRES_REVIEW; no perpetual free-access claim |
| DeepSeek `deepseek-flash` | `https://api.deepseek.com/chat/completions`; Bearer | Metered input/output, including cache-hit input. No recurring free inference tier verified; Flash concurrency ceiling 2,500, distinct from RPM/RPD; account token quota unknown | 1M context / 384K maximum output | Text and vision supported on Flash; file parsing and OCR have separate prices | JSON output, streaming and tools documented; no project-level quality measurements | BLOCKED for a free pilot pending an authorized zero-cost allocation |
| Mistral (no model approved) | `https://api.mistral.ai/v1/chat/completions`; Bearer | Current usage docs say API requires billing; older help mentions free mode. No reliable free quota established | Not approved / unknown | Model-dependent text/vision; document OCR separate | Model-dependent; not tested | BLOCKED pending account-specific free entitlement and privacy review |
| NVIDIA NIM (no model approved) | `https://integrate.api.nvidia.com/v1/chat/completions`; Bearer | Developer access is prototyping/evaluation. Exact RPM/RPD/token allowances unknown for account | Model-specific / unknown | Model-specific; no modality approved | Model-specific; not tested | REJECTED as free production backend; REQUIRES_REVIEW for private evaluation |

## Privacy, commercial use, costs and region

| Provider | Student-data and commercial review | Reliability / latency / region / cost |
|---|---|---|
| Gemini | Free-tier pricing says content may improve products, subject to terms and regional exceptions. Confirm applicable account terms before sensitive student data. | No live latency measured; project/model access and deployment region unverified. Paid-tier calls can cost money; no billing changes made. |
| Groq | Inference content not retained by default, with reliability/abuse exceptions up to 30 days; ZDR controls available. Stored customer data is US-based. Confirm agreement and student-data transfers. | No live latency or SLA established. Promotional/free entitlement and region access unverified. Paid account settings may charge; pilot not activated. |
| OpenRouter | Both router and downstream policies apply; review logging, training and region controls per selected provider. | Free capacity varies. Directory limits differ from official docs; official limits win. Avoid automatic paid fallback. |
| Cerebras | Current pricing labels self-serve evaluation rather than production capacity; privacy/retention and regional processing unresolved. | One-time credit is not sustainable free capacity. No live latency/region test. |
| DeepSeek | Open Platform terms assign downstream disclosures and applicable permissions to the app operator. Student-data processing terms, retention and region have not been approved. | No live Indonesian quality, availability or latency measurements. Billing draws on topped-up or granted balances. |
| Mistral | Training defaults/opt-out differ by service and plan; Labs models cannot opt out and are not production-ready. | Conflicting official guidance blocks approval. Costs and region require console checks. |
| NVIDIA | Trial terms limit use to internal testing/evaluation without a production subscription. | No uptime/latency/region verified; paid production subscription separately required. |

## Official evidence consulted

- [Gemini model](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Groq models](https://console.groq.com/docs/models), [deprecations](https://console.groq.com/docs/deprecations), [rate limits](https://console.groq.com/docs/rate-limits), [OpenAI compatibility](https://console.groq.com/docs/openai), [structured output](https://console.groq.com/docs/structured-outputs), [data handling](https://console.groq.com/docs/your-data)
- [OpenRouter free models and limits](https://openrouter.ai/collections/free-models)
- [DeepSeek model details and pricing](https://api-docs.deepseek.com/quick_start/pricing/), [chat endpoint](https://api-docs.deepseek.com/), [developer terms](https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html)
- [Cerebras trial terms and limits](https://inference-docs.cerebras.ai/support/rate-limits), [Cerebras current pricing](https://www.cerebras.ai/pricing), [older pricing](https://inference-docs.cerebras.ai/support/pricing), [chat API](https://inference-docs.cerebras.ai/api-reference/chat-completions)
- [Mistral current usage](https://docs.mistral.ai/admin/billing-usage/usage-limits), [older help](https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them), [data training](https://help.mistral.ai/en/articles/347617-do-you-use-my-user-data-to-train-your-artificial-intelligence-models), [Labs lifecycle](https://docs.mistral.ai/inference/model-lifecycle)
- [NVIDIA FAQ](https://docs.api.nvidia.com/nim/docs/product), [trial terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf)

## Pilot and production boundary

`lib/text-provider-pilot.js` accepts chat/summary/quiz text only, a server-held credential, explicit enablement, optional task validation, one fixed HTTPS host and bounded input/output. It reuses `runProviderRequest` for cancellation and a shared deadline. No streaming, file payloads, browser keys, gateway admin key, auto-discovery or new dependency. Explicit Gemini callback fallback is allowed only for errors already eligible under the existing request policy; auth, quota, validation and cancellation do not trigger replay. Fixtures validate routing, metadata, truncation rejection and disabled behavior. This is not a live provider benchmark.

Before wiring it into `generateText`: verify exact model entitlement, quotas, data policy and region; run synthetic Indonesian/English summaries and schema-valid quizzes; benchmark latency and quality; retain source-reference validation; add safe actual-provider UI attribution; set shared abuse/spending controls. Keep OCR, source blueprints, vision, audio and assessment on the existing Gemini path. No gateway deployment is required or approved.

## Recheck on 13 November

The official [Groq model table](https://console.groq.com/docs/models) lists `openai/gpt-oss-20b` with 131,072 context tokens and 65,536 maximum completion tokens. Those are upstream capabilities, not the local pilot's 2,048-token output cap or an account quota. The [rate-limit page](https://console.groq.com/docs/rate-limits) remains account-dependent. The [data policy](https://console.groq.com/docs/your-data) documents default non-retention of inference content with reliability/abuse exceptions up to 30 days (or legal requirements), ZDR controls and US storage for retained customer data. This does not approve forwarding student documents.

[Gemini limits](https://ai.google.dev/gemini-api/docs/rate-limits) apply per project rather than API key. Preserve cooldowns rather than attempting key rotation. No live requests were made for this recheck.

Fixed two pilot-only defects: the Gemini callback previously bypassed structured-output validation, and malformed message entries could throw uncontrolled property-access errors. Both now use controlled validation and regression fixtures. The pilot still runs Groq first with an explicit optional Gemini callback; it is not an implemented production Gemini-quota-to-Groq router.


## V15 decision, 18 November 2026

Keep Gemini in production. Groq is the first candidate for a text-only synthetic comparison because the project already has a bounded adapter and Groq publishes a free quota for its model. No alternate-provider key was present in the execution environment. No live inference, latency, quality, regional access or per-request billing was measured. A production winner cannot be selected from fixture results.

- Google lists all three configured text/multimodal model IDs. The earliest announced shutdown for `gemini-3.1-flash-lite` is 7 May 2027. `gemini-3.8-flash` and `gemini-3-flash-preview` have no shutdown date listed. Access still depends on the project. [Google model lifecycle](https://ai.google.dev/gemini-api/docs/deprecations)
- The `openrouter/free` model routes dynamically among eligible free models. A source-grounded pilot requires an identifiable model and approved data recipient. [Router behavior](https://openrouter.ai/openrouter/free) and [free model quotas](https://openrouter.ai/collections/free-models/)
- The FreeLLMAPI repository describes personal experimentation. Its unified credential fronts the user's upstream provider keys. An extra routing layer does not add inference entitlement. [Project and deployment notes](https://github.com/tashfeenahmed/freellmapi)

### Synthetic benchmark awaiting approved access

Use the same Indonesian prompts, source, schema and output cap for the Gemini control and each eligible candidate. Send one request per row, with no automatic replay. Record the actual model and provider, response time, HTTP/error class, billed tokens, price, and one pass/fail per expected result. Leave unavailable billing and region data explicitly unknown. Keep uploads, user profiles, and conversation history out of the run.

| Task | Synthetic input | What to check |
|---|---|---|
| Explain in Indonesian | “Mengapa bayangan berubah panjang saat Matahari tampak lebih rendah?” | Explains the angle of light and longer shadow in everyday Indonesian. |
| Mathematics | “Sebuah kereta mainan menempuh 120 meter dalam 30 detik. Hitung kelajuannya.” | 4 m/s, with division and correct units. |
| Source Q&A | Source P1: “Pada Senin, Dita membaca 12 halaman.” Ask how many on Monday and Tuesday. | 12 for Monday, cites P1, acknowledges missing Tuesday data. |
| Structured JSON | Extract the day and page count from P1 as JSON. | Parses as an object; day is Senin and pages is the integer 12. |
| Flashcards | Draft two distinct question/answer pairs using only P1. | Both pairs validate against the app's current flashcard contract; both answers are grounded. |
| Quiz | Draft a multiple-choice question from P1 with a rationale. | Valid choices, unambiguous correct answer, rationale supported by P1; passes the actual quiz validator. |

Six pilot fixtures and one Express origin test passed locally via `node --test tests/text-provider-pilot.test.mjs tests/origin-check.test.mjs`. They exercise request bounds, output validation, transient fallback and authorization handling. Provider-generated answers, production account access and benchmark scores remain unverified.

### Historical 403 and live baseline

GET requests to the public Vercel deployment returned 200 for the landing page, Dashboard Home, shell JS, Home CSS and JSON health. Health reported `ready: true`, Gemini Cloud, `gemini-3.8-flash`, and `algorithmic-v10.4-pages-1`. In `server.js`, readiness checks key configuration and the version string is hardcoded. The published JS and CSS bytes matched Git base `65ebe9c`. These observations cover the sampled frontend assets only. [Public health](https://omnilearnid.vercel.app/api/health)

The cause of the reported non-JSON 403 remains unresolved. The local origin regression reproduces an **application/json** 403 before the provider runs when the request has a foreign origin; that is distinct evidence from the reported non-JSON response. No original failed response, its request ID, or correlated server/provider trace was supplied. To distinguish hosting denial, Express rejection and upstream denial, correlate the failed request's route, timestamp, HTTP status, content type and request ID with the deployment logs. Omit authorization headers, cookies, prompts and student material. No production POST was replayed.
