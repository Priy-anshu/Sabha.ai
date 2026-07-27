# 🏛️ Sabha.ai — Multi-Agent AI Council & Verified Consensus Engine (v1.0)

**Sabha.ai** is an enterprise-grade Generative AI application that replaces single-prompt LLM answers with a **Multi-Agent AI Council**. When a prompt is submitted, Sabha.ai dynamically allocates domain-specialized AI personas, runs a 3-round adversarial debate, performs vector-based RAG retrieval, and passes the output through a dual-verifier quality audit before delivering a verified master consensus.

---

## 🌟 Key Features & Innovations

### 1. 🧠 Dynamic Deep-Domain Persona Allocation Protocol
- Performs deep domain intent analysis on every prompt.
- Allocates **3 to 5 specialized expert personas** with distinct Indian human names (e.g., *Kabir (Distributed Systems Specialist)*, *Ananya (Zero-Trust Security Auditor)*, *Diya (UI/UX Performance Lead)*).
- Strictly bans uninspiring generic titles like "Developer" or "Technical Lead".

### 2. 🏛️ 3-Round Adversarial Consensus Engine
- **Round 1 (Initial Proposal & Delta Critiques)**: Persona 1 proposes; Personas 2..N output concise delta critiques.
- **Rounds 2 & 3 (Rebuttal & Unanimous Alignment)**: Persona 1 incorporates feedback and updates the proposal. All personas cast explicit status votes (`STATUS: AGREED` vs `STATUS: DISAGREED`).
- **Fallback Majority Voting Loop**: If 100% agreement isn't reached after 3 rounds, a formal voting ballot resolves remaining trade-offs.

### 3. ⚡ Real-Time SSE Thinking Process Stream
- Streaming Server-Sent Events (`/api/chat/debate-stream`) show live agent progress as personas analyze, debate, critique, and vote.
- **Smart Auto-Scroll**: Follows bottom stream automatically unless the user manually scrolls up to read earlier steps.
- **Auto-Collapse**: Upon completion, the live thinking card automatically collapses into a sleek expandable badge, leaving only the clean final output.

### 4. 🧬 Vector RAG Retrieval Engine
- Uses Google's `gemini-embedding-001` / `gemini-embedding-2` model to generate 3,072-dimensional vector embeddings for uploaded PDFs, Markdown, and text files.
- Computes **Cosine Similarity** to retrieve top semantic chunks (~500 tokens), cutting file token costs by up to 80%.

### 5. 💾 In-Memory Context Cache & Dedicated `ChatSummary` Model
- Sub-millisecond ($0\text{ ms}$) context memory retrieval using an in-memory `Map` cache.
- Asynchronously distills 2-3 sentence summaries of user preferences and chat history.
- Persists summaries to a dedicated, indexed `ChatSummary` MongoDB collection.

### 6. 🎭 Agent Behaviors System (Logged-In Users)
- Multi-select dropdown featuring **18 human behaviors** (*No Sugarcoating*, *Strict & Rigorous*, *Devil's Advocate*, *Socratic*, *Pragmatic*, *Code Purist*).
- Directly injects behavior directives into persona allocation, critiques, and final synthesis prompts.

### 7. 🛡️ Dual-Persona Verification Audit Layer
- **Kavya (Fact & Error Auditor)**: Checks for hallucinations, logical fallacies, and security risks.
- **Ishaan (Completeness Auditor)**: Audits output against all user prompt requirements.

### 8. 🔒 Security, Auth & Password Reset
- Full JWT token authentication with bcrypt password hashing.
- Nodemailer OTP email verification for password recovery.

---

## 🏗️ System Architecture

```text
                                 USER PROMPT
                                      │
                                      ▼
                        [ Frontend - React 19 + Vite ]
                                      │ (SSE Stream)
                                      ▼
                        [ Backend - Express REST API ]
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
[ Session Context Cache ]    [ Vector RAG Engine ]      [ Persona Allocator ]
(Sub-ms Memory Lookup)       (Google Embeddings)        (Deep Domain Triad)
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                      ▼
                      [ 3-Round Adversarial Debate ]
                     (Proposals -> Delta Critiques -> Votes)
                                      │
                                      ▼
                    [ Dual-Persona Quality Audit ]
                    (Kavya: Fact | Ishaan: Completeness)
                                      │
                                      ▼
                      [ Final Verified Master Output ]
```

---

## 📁 Repository Directory Structure

- `/MMD_frontend/`: Storefront application components.
- `/MMD_admin_frontend/`: Admin dashboard application.
- `/MMD-Vendor-frontend/`: Vendor dashboard application.
- `/MMD_Backend/`: Backend services & APIs.
- `/order_payment_service/`: Order payment service backend.
- `/shipping_service/`: Shipping service backend.
- `/backend/`: Main Sabha.ai Node.js/Express AI API.
- `/frontend/`: Main Sabha.ai React/Vite web client.

---

## 🚀 Installation & Local Setup

### Prerequisites
- **Node.js**: v18.x or higher
- **MongoDB**: MongoDB Atlas Cloud URL or local instance
- **Google Gemini API Key**: Valid API Key from Google AI Studio

### 1. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_google_gemini_api_key
DEFAULT_PROVIDER=gemini
GROQ_API_KEY=gsk_your_groq_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

*(Refer to `backend/.env.example` for a ready-to-use configuration template.)*

Start the backend server:
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Start the frontend Vite dev server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Testing

Run the full system integration test suite (Vector RAG, Cosine Similarity, Session Cache, Title Generator):
```bash
cd backend
node test_vector_rag.js
```

---

## 📄 License
Built with ❤️ by the Sabha.ai Engineering Team.
