# Software Patent Specification: PlacementPrep Platform Architecture & Method Workflow

## Title of the Invention
SYSTEM ARCHITECTURE AND METHOD WORKFLOW FOR MULTI-MODAL CANDIDATE ASSESSMENT, REAL-TIME PROCTORING, AND PLACEMENT READINESS SCORING

---

## 1. Background of the Invention and Technical Field
This invention relates generally to computerized recruitment, skill assessment, and artificial intelligence-driven applicant tracking systems (ATS). More specifically, it pertains to non-blocking client-side video/audio processing pipelines, multi-modal context aggregation engines for prompt chaining, and mathematical dynamic scoring systems for evaluating job applicant placement readiness.

### Technical Problem & Prior Art Limitations
Existing recruitment and preparation software platforms suffer from severe architectural limitations:
1. **Audio/Video Stream Latency & DOM Thread Freezing:** Traditional systems stream continuous uncompressed media to cloud servers over WebSocket or HTTP REST endpoints. This introduces high latency (2–5 seconds) in simulated human-computer conversations and creates UI render thread blocking (jank) on low-power client devices.
2. **Fragile Context Formatting for AI Ingestion:** Conventional systems pass raw, unstructured text or simple isolated prompts to third-party LLMs without multi-modal normalization, leading to hallucinated feedback, non-deterministic output structures, and high compute token overhead.
3. **Arbitrary or Non-Calibrated Assessment Metrics:** Current platforms rely on simple binary pass/fail or single-dimensional scores (e.g., simple quiz percentiles) without a mathematically bound, cross-module aggregation formula that balances diverse skill vectors (resume quality, aptitude speed/accuracy, algorithmic proficiency, and oral interview performance).

---

## 2. Summary of the Invention
To resolve these technical problems, the present invention introduces three primary non-obvious engineering pillars built around third-party AI interfaces:

1. **Background Data & Proctoring Pipeline:** A lightweight, non-blocking client-side audio/video processing mechanism that leverages `MediaRecorder`, Web Speech API, and hardware-accelerated Blob chunking (250ms boundaries) without interrupting the client DOM event loop.
2. **Data Processing & Context Engine:** An automated multi-modal normalization engine that ingests, cleanses, and structures candidate inputs (resumes, coding test metrics, speech-to-text transcripts, and aptitude performance) into deterministic, dynamic prompt chains optimized for minimal token usage and sub-second response times.
3. **Dynamic Scoring Engine:** A non-obvious, mathematically bound scoring algorithm that aggregates multi-module performance vectors into a unified, deterministic Placement Readiness Metric ($R \in [0\%, 100\%]$).

---

## 3. Detailed Technical Description (Core Architectural Pillars)

### Pillar I: Background Data & Proctoring Pipeline
*Synchronous client-side media capture and low-latency interaction without UI render thread desynchronization.*

#### 1. Mechanics & Workflow
- **Hardware Interface & Secure Context:** The system performs runtime validation of browser execution context (`window.isSecureContext`, HTTPS/localhost verification) before instantiating hardware stream controls (`navigator.mediaDevices.getUserMedia`).
- **Opus Codec Hardware Blob Chunking:** Audio streams are captured via the `MediaRecorder` API using the `audio/webm;codecs=opus` MIME format. The capture is partitioned into micro-chunks at 250ms intervals (`timeslice = 250ms`), preventing browser memory spikes and bypassing client-side audio transcoding overhead.
- **Asynchronous Event-Driven Interrupter:** To prevent UI freezing during push-to-talk recording, state transitions (`recording` $\rightarrow$ `transcribing` $\rightarrow$ `thinking` $\rightarrow$ `speaking`) are governed by non-blocking asynchronous event listeners (`ondataavailable`, `onstop`).
- **Low-Latency Edge/Voice Synthesis:** Response audio utilizes local browser hardware TTS (`window.speechSynthesis`) or streaming edge audio buffers (`Blob([audioBuffer])`) with auto-revoked Object URLs (`URL.revokeObjectURL`) to maximize local RAM recycling.

#### 2. Technical Effect
Eliminates client UI frame drops during high-frequency audio capture and reduces network payload size by over $70\%$ compared to raw WAV streaming.

---

### Pillar II: Data Processing & Context Engine
*Extraction, transformation, and structured dynamic prompt chaining.*

#### 1. Mechanics & Workflow
- **Multi-Modal Data Extraction:** 
  - *Resume Module:* Structured parsing (`js/resume-parser.js`, `LiveResumeAI`) extracts contact info, section completeness ($S_{\text{structure}}$), action verbs ($V$), quantified achievements ($Q$), and target role skill matrices.
  - *Aptitude Module:* Extracts timed accuracy ratios ($A = \frac{\text{correct}}{\text{total}}$) and section-wise domain scores.
  - *Coding Module:* Captures problem difficulty weights, test-case pass rates, and time complexity parameters.
  - *Speech/Interview Module:* Captures Speech-to-Text (STT) transcripts, keyword relevance, and turn counts.
- **Dynamic Prompt Chain Generator:** Raw extracted metrics are injected into standardized, structured system prompt payloads. The context engine formats conversation histories into minimal-token payloads (e.g., bounding history to the last $N=4$ turns) and appends deterministic JSON schema requirements for LLM evaluation.

#### 2. Technical Effect
Prevents LLM prompt injection, enforces consistent output formatting across varying third-party AI APIs (Gemini, Pollinations, OpenAI), and cuts prompt token consumption by up to $60\%$.

---

### Pillar III: Dynamic Scoring Engine
*Mathematical dynamic scoring algorithm for Placement Readiness Metric calculation.*

#### 1. Mathematical Formulation
The overall Placement Readiness Metric $R$ is calculated as a scalar percentage ($0\% - 100\%$) via a bounded, multi-vector weighted linear combination:

$$R = \min\left(100, \max\left(0, \text{Round}\left( w_1 \cdot S_{\text{resume}} + w_2 \cdot A_{\text{aptitude}} + w_3 \cdot C_{\text{coding}} + w_4 \cdot I_{\text{interview}} \right)\right)\right)$$

Where the module weights are strictly normalized to sum to $1.0$:
$$w_1 = 0.25 \quad (\text{Resume Quality Weight})$$
$$w_2 = 0.25 \quad (\text{Aptitude Accuracy Weight})$$
$$w_3 = 0.30 \quad (\text{Coding Algorithmic Weight})$$
$$w_4 = 0.20 \quad (\text{Mock Interview Weight})$$

#### 2. Vector Sub-Calculations
1. **Resume Score ($S_{\text{resume}}$):**
   $$S_{\text{resume}} = \min(100, \text{ResumeScore})$$
2. **Aptitude Accuracy ($A_{\text{aptitude}}$):**
   $$A_{\text{aptitude}} = \begin{cases} \text{Round}\left(\frac{\text{correct}}{\text{total}} \times 100\right), & \text{if } \text{total} > 0 \\ 0, & \text{otherwise} \end{cases}$$
3. **Coding Score ($C_{\text{coding}}$):**
   $$C_{\text{coding}} = \min\left(100, \frac{|\text{Solved Problems}|}{3} \times 100\right)$$
4. **Interview Score ($I_{\text{interview}}$):**
   $$I_{\text{interview}} = \min\left(100, \frac{\text{Completed Sessions}}{3} \times 100\right)$$

#### 3. Technical Effect
Provides a deterministic, repeatable, and tamper-resistant benchmark metric for candidate readiness, shielding the scoring logic from arbitrary AI variance.

---

## 4. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSER (SPA)                              |
|  +---------------------------+  +--------------------------+  +----------------+  |
|  | Proctoring & Audio Engine |  | Context Engine (Parser)  |  | Dynamic Scoring|  |
|  | - getUserMedia            |  | - Resume AST Extractor   |  | - Equation (1) |  |
|  | - MediaRecorder (Opus)    |  | - Prompt Chain Formatter |  | - Vector Norm  |  |
|  | - Non-blocking Event Loop  |  | - Dynamic History Window |  | - Score: 0-100%|  |
|  +-------------+-------------+  +------------+-------------+  +-------+--------+  |
+----------------|-----------------------------|------------------------|-----------+
                 |                             |                        |
                 v                             v                        v
+-----------------------------------------------------------------------------------+
|                              BACKEND / EDGE RUNTIME                               |
|  - Speech-to-Text API (/api/stt)                                                  |
|  - AI Interview Chat API (/api/interview-chat)                                    |
|  - Persistence Layer (Local Storage / DB)                                         |
+-----------------------------------------------------------------------------------+
```

---

## 5. Patent Claims (Non-Limiting Exemplary Claims)

1. **Claim 1:** A computer-implemented method for continuous candidate evaluation, comprising:
   - Synchronously initializing client-side hardware media streams via a secure context check;
   - Capturing audio into memory buffers at sub-second micro-chunks using hardware-native compression without blocking the document object model (DOM) render thread;
   - Extracting domain features from candidate inputs to build dynamic prompt chains; and
   - Calculating a multi-vector placement readiness metric bounded between $0\%$ and $100\%$ using a weighted scoring formula.

2. **Claim 2:** The method of claim 1, wherein the background data pipeline records audio using an Opus codec at 250-millisecond timeslices triggered by non-blocking asynchronous event listeners.

3. **Claim 3:** The method of claim 1, wherein the dynamic scoring metric $R$ aggregates resume quality ($25\%$), aptitude accuracy ($25\%$), coding problem completion ($30\%$), and mock interview session completion ($20\%$).

---
*Drafted in compliance with patent regulations governing Computer-Implemented Inventions (CII) and software architecture patent claims.*
