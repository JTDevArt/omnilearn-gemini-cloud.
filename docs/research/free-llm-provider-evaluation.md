# Free LLM evaluation — 12 November 2026

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
| Groq `openai/gpt-oss-20b` | `https://api.groq.com/openai/v1/chat/completions`; Bearer | Published table lists 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD; exact account entitlement must be checked, table wording varies by tier | Exact selected-model context/output must be rechecked before live pilot; local pilot caps 16k serialized input characters and 2,048 completion tokens | Text pilot only; no image/file forwarding | JSON object mode with app validation; provider streaming/tools not enabled in pilot | APPROVED_FOR_TESTING (fixtures); live BLOCKED by missing approved key |
| OpenRouter `openrouter/free` | `https://openrouter.ai/api/v1/chat/completions`; Bearer | Free variants: 20 RPM and 50 RPD; higher daily cap requires purchased credits; failures count | Varies with routed model; no fixed output/context guarantee | Model-dependent; text-only would need explicit allowlist | Model-dependent JSON/stream/tools | REQUIRES_REVIEW; dynamic recipients and model identity unsuitable as silent fallback |
| Cerebras `qwen-3.8-27b` | `https://api.cerebras.ai/v1/chat/completions`; Bearer | Current pricing advertises $5 promotional credit with payment method, 30-day expiry; older free-tier docs conflict. Exact RPM/RPD/TPM/TPD unknown | Account/model-dependent; older 8,192 free-context claim not accepted as current | Text candidate; vision/document handling not approved | Chat API supports structured requests; exact schema/stream/tools need model verification | REQUIRES_REVIEW; no perpetual free-access claim |
| Mistral (no model approved) | `https://api.mistral.ai/v1/chat/completions`; Bearer | Current usage docs say API requires billing; older help mentions free mode. No reliable free quota established | Not approved / unknown | Model-dependent text/vision; document OCR separate | Model-dependent; not tested | BLOCKED pending account-specific free entitlement and privacy review |
| NVIDIA NIM (no model approved) | `https://integrate.api.nvidia.com/v1/chat/completions`; Bearer | Developer access is prototyping/evaluation. Exact RPM/RPD/token allowances unknown for account | Model-specific / unknown | Model-specific; no modality approved | Model-specific; not tested | REJECTED as free production backend; REQUIRES_REVIEW for private evaluation |

## Privacy, commercial use, costs and region

| Provider | Student-data and commercial review | Reliability / latency / region / cost |
|---|---|---|
| Gemini | Free-tier pricing says content may improve products, subject to terms and regional exceptions. Confirm applicable account terms before sensitive student data. | No live latency measured; project/model access and deployment region unverified. Paid-tier calls can cost money; no billing changes made. |
| Groq | Inference content not retained by default, with reliability/abuse exceptions up to 30 days; ZDR controls available. Stored customer data is US-based. Confirm agreement and student-data transfers. | No live latency or SLA established. Promotional/free entitlement and region access unverified. Paid account settings may charge; pilot not activated. |
| OpenRouter | Both router and downstream policies apply; review logging, training and region controls per selected provider. | Free capacity varies. Directory limits differ from official docs; official limits win. Avoid automatic paid fallback. |
| Cerebras | Current pricing labels self-serve evaluation rather than production capacity; privacy/retention and regional processing unresolved. | One-time credit is not sustainable free capacity. No live latency/region test. |
| Mistral | Training defaults/opt-out differ by service and plan; Labs models cannot opt out and are not production-ready. | Conflicting official guidance blocks approval. Costs and region require console checks. |
| NVIDIA | Trial terms limit use to internal testing/evaluation without a production subscription. | No uptime/latency/region verified; paid production subscription separately required. |

## Official evidence consulted

- [Gemini model](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Groq models](https://console.groq.com/docs/models), [deprecations](https://console.groq.com/docs/deprecations), [rate limits](https://console.groq.com/docs/rate-limits), [OpenAI compatibility](https://console.groq.com/docs/openai), [structured output](https://console.groq.com/docs/structured-outputs), [data handling](https://console.groq.com/docs/your-data)
- [OpenRouter free models and limits](https://openrouter.ai/collections/free-models)
- [Cerebras current pricing](https://www.cerebras.ai/pricing), [older pricing](https://inference-docs.cerebras.ai/support/pricing), [chat API](https://inference-docs.cerebras.ai/api-reference/chat-completions)
- [Mistral current usage](https://docs.mistral.ai/admin/billing-usage/usage-limits), [older help](https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them), [data training](https://help.mistral.ai/en/articles/347617-do-you-use-my-user-data-to-train-your-artificial-intelligence-models), [Labs lifecycle](https://docs.mistral.ai/inference/model-lifecycle)
- [NVIDIA FAQ](https://docs.api.nvidia.com/nim/docs/product), [trial terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf)

## Pilot and production boundary

`lib/text-provider-pilot.js` accepts chat/summary/quiz text only, a server-held credential, explicit enablement, optional task validation, one fixed HTTPS host and bounded input/output. It reuses `runProviderRequest` for cancellation and a shared deadline. No streaming, file payloads, browser keys, gateway admin key, auto-discovery or new dependency. Explicit Gemini callback fallback is allowed only for errors already eligible under the existing request policy; auth, quota, validation and cancellation do not trigger replay. Fixtures validate routing, metadata, truncation rejection and disabled behavior. This is not a live provider benchmark.

Before wiring it into `generateText`: verify exact model entitlement, quotas, data policy and region; run synthetic Indonesian/English summaries and schema-valid quizzes; benchmark latency and quality; retain source-reference validation; add safe actual-provider UI attribution; set shared abuse/spending controls. Keep OCR, source blueprints, vision, audio and assessment on the existing Gemini path. No gateway deployment is required or approved.
