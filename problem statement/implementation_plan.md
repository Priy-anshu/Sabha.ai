# Implementation Plan: Multi-Agent Debate & Self-Verifying AI Assistant

This master plan outlines the step-by-step roadmap to build the **Multi-Agent Debate & Self-Verifying AI Assistant with Multimodal RAG**. Following the `BUILD → UNDERSTAND → TEST → CONTINUE` methodology, we will build one major feature at a time, testing and validating each step before proceeding.

---

## User Review Required

> [!IMPORTANT]
> **Incremental Execution:** To avoid overwhelming complexity and ensure deep understanding of GenAI concepts, each phase will be built and tested individually before moving to the next.
> 
> **Architecture Focus:** The application uses a standard full-stack MERN core (React + Node.js/Express + MongoDB) orchestrating LLM calls via an Express backend service layer.

---

## Open Questions

> [!IMPORTANT]
> Please review and provide your preferences on the following key decisions:

1. **LLM API Provider:** Which provider do you prefer to start with?
   - *(Recommended)* **Google Gemini API** (`@google/genai`) - Free tier available, great performance, native multimodal (vision/PDF) support.
   - **OpenAI API** (`openai`) - Requires paid API credits.

2. **MongoDB Instance:** How would you like to handle database storage?
   - **Local MongoDB** (running locally on port 27017).
   - **MongoDB Atlas** (Cloud-hosted database, required later for Vector Search in Phase 5).

3. **Multi-Agent Debate Domains:** For the Layer 1 debate step, which default 3 expert domains would you like to feature?
   - *(Proposed Default)* **Technical Architect**, **Security Auditor**, **UX/Business Analyst**.

---

## Proposed Changes & Phased Execution

---

### Phase 1: Foundation, Express Setup & Dynamic Persona Engine

Set up the project repository structure and build the first direct LLM connection with persona/strictness control.

#### Backend (`/backend`)
- [NEW] [package.json](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/package.json) - Initialize Node.js dependencies (`express`, `dotenv`, `cors`, `@google/genai`).
- [NEW] [server.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/server.js) - Express server entry point.
- [NEW] [routes/aiRoutes.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/routes/aiRoutes.js) - Router for standard AI queries.
- [NEW] [services/aiService.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/services/aiService.js) - LLM Service handling system prompt injection for modes (*Mentor*, *Strict*, *Very Strict*).

#### Frontend (`/frontend`)
- [NEW] [src/App.jsx](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/frontend/src/App.jsx) - Main React Chat UI with modern dynamic styling.
- [NEW] [src/components/ModeSelector.jsx](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/frontend/src/components/ModeSelector.jsx) - Persona selector component (*Mentor*, *Strict*, *Very Strict*).

---

### Phase 2: Conversation History & MongoDB Persistence

Persist multi-turn chat conversations and store session context.

#### Backend (`/backend`)
- [NEW] [config/db.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/config/db.js) - Mongoose database connection.
- [NEW] [models/ChatSession.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/models/ChatSession.js) - MongoDB Schema for messages and session settings.
- [MODIFY] [services/aiService.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/services/aiService.js) - Format chat history into Gemini model memory payload.

---

### Phase 3: Critic & Verification Layer (Layer 2)

Build a 2-stage generation and auditing pipeline.

#### Backend (`/backend`)
- [NEW] [services/verifierService.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/services/verifierService.js) - Verifier Agent that evaluates generated responses against strictness rules and returns a structured audit output (`{ verified: true/false, feedback: "...", finalResponse: "..." }`).
- [MODIFY] [routes/aiRoutes.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/routes/aiRoutes.js) - Pipeline execution: Prompt -> Generator Agent -> Verifier Agent -> Response.

---

### Phase 4: Multi-Agent Debate Engine (Layer 1)

Implement parallel domain reasoning and debate synthesis.

#### Backend (`/backend`)
- [NEW] [services/debateService.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/services/debateService.js) - Spawns 3 domain agents in parallel, passes their outputs into a Synthesizer Agent, and sends the consensus to the Verifier Agent.

#### Frontend (`/frontend`)
- [NEW] [src/components/DebateVisualizer.jsx](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/frontend/src/components/DebateVisualizer.jsx) - UI drawer showing the domain perspectives, debate consensus, and verifier audit score.

---

### Phase 5: Multimodal RAG & Document Attachments

Incorporate file parsing (PDF/Images), text chunking, vector embeddings, and RAG retrieval.

#### Backend (`/backend`)
- [NEW] [services/ragService.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/services/ragService.js) - Text extraction, chunking, embedding generation, and vector similarity search.
- [NEW] [models/VectorDocument.js](file:///c:/Users/USER/Desktop/GEN%20AI%20Project/backend/models/VectorDocument.js) - Vector index schema in MongoDB.

---

## Verification Plan

### Automated Verification
- **API Tests:** Test backend endpoints via `curl` / Postman / Node test script to verify exact JSON payloads.
- **LLM Pipeline Logs:** Log step-by-step pipeline timing (Generator time, Debate synthesis time, Verifier audit result).

### Manual Verification
- **Mode Switching:** Select *Mentor*, *Strict*, and *Very Strict* in React and verify response tone and depth change accordingly.
- **Debate Inspection:** Verify in the UI visualizer that 3 domain perspectives were generated and combined into a cohesive final answer.
- **Verification Audit:** Inject an intentional false statement in a prompt and confirm the Verifier Agent flags or corrects it.
