# 🏛️ Sabha.ai — Technical Interview & Cross-Examination Guide

> **Target Audience:** Job Candidate (Fresher / Campus Placement for Software Engineering, GenAI & Full-Stack Roles)  
> **Source Project:** `Sabha.ai` — Multi-Agent AI Council & Verified Consensus Engine  

---

## 🎯 1. Executive Summary & 30-Second Elevator Pitch

### 💡 The 30-Second Pitch (How to open when asked "Tell me about Sabha.ai")
> *"Sabha.ai is an enterprise Generative AI platform built to solve LLM hallucinations and single-prompt bias. Instead of relying on a single AI answer, Sabha.ai dynamically provisions a council of 3 to 5 domain-specialized AI personas who engage in a 3-round adversarial debate, retrieve verified context using a Vector RAG pipeline (saving 80% on token costs), and pass outputs through a dual-persona quality audit layer before delivering a final verified response."*

---

## 🧠 2. Deep Dive: Bullet Point 1 — Multi-Agent Consensus Engine

> **Resume Line:** *Architected an enterprise multi-agent GenAI platform running 3–5 domain personas through a 3-round adversarial debate loop with dual-auditor verifiers to eliminate LLM hallucinations.*

### ❓ Question 1: How does the multi-agent consensus engine work step-by-step?
**Answer:**  
1. **Persona Allocation:** The prompt undergoes intent analysis. A persona allocation module provisions 3 to 5 domain experts with distinct roles (e.g., *Distributed Systems Specialist*, *Security Auditor*, *Performance Lead*).
2. **Round 1 (Initial Proposal & Delta Critiques):** Persona 1 generates the initial proposal. Personas 2 through $N$ evaluate it and issue concise delta critiques focusing only on gaps and flaws.
3. **Rounds 2 & 3 (Rebuttal & Alignment):** Persona 1 updates the proposal incorporating feedback. All personas cast explicit status votes (`AGREED` vs `DISAGREED`).
4. **Dual-Persona Quality Audit:** **Kavya** (Fact & Error Auditor) checks for factual correctness/hallucinations, while **Ishaan** (Completeness Auditor) verifies all original prompt constraints are satisfied.

---

### 🔍 Cross-Examination & Counter Questions

#### ⚠️ Cross-Q1.1: "Isn't calling LLMs 3 to 5 times per round prohibitively slow and expensive?"
**Answer:**  
*"Great question. We mitigated latency and cost through three key design decisions:*
1. *Delta Critiques: Personas in critique rounds do not generate full text responses; they return concise delta critique summaries.*
2. *RAG Context Filtering: Context window payload is reduced by 80% via vector similarity retrieval prior to prompt injection.*
3. *Streaming Feedback: We stream intermediate progress via Server-Sent Events (SSE) so users see immediate real-time progress rather than waiting idle for full execution."*

#### ⚠️ Cross-Q1.2: "What happens if the 3-5 agents never reach unanimous agreement after 3 rounds?"
**Answer:**  
*"We implemented a **Fallback Majority Voting Loop**. If 100% agreement isn't reached by Round 3, a formal voting ballot is triggered where each persona submits a final vote with weighted trade-offs. The consensus engine synthesizes the majority position while explicitly documenting minority dissenting opinions."*

---

## 🧬 3. Deep Dive: Bullet Point 2 — Vector RAG Retrieval Engine

> **Resume Line:** *Engineered a Vector RAG pipeline using 3,072-dimensional embeddings and semantic chunking (~500 tokens), reducing file context LLM token consumption by 80%.*

### ❓ Question 2: Walk me through your RAG pipeline architecture.
**Answer:**  
1. **Document Ingestion & Chunking:** Uploaded files (PDFs, Markdown, TXT) are parsed and split into ~500-token semantic chunks with a 10% overlap (50 tokens) to preserve boundary context.
2. **Embedding Generation:** Each chunk is converted into a 3,072-dimensional vector embedding using Google's `gemini-embedding-001` model.
3. **Similarity Search:** When a query arrives, its query embedding is generated and compared against stored chunk embeddings using **Cosine Similarity**.
4. **Top-K Retrieval:** The top 3–5 most relevant chunks are retrieved and injected into the multi-agent prompt context window.

---

### 🔍 Cross-Examination & Counter Questions

#### ⚠️ Cross-Q2.1: "Why did you choose ~500 tokens for chunk size instead of 200 or 2,000 tokens?"
**Answer:**  
*"500 tokens represents the sweet spot for technical document retrieval:*
* *Smaller chunks (e.g., 100-200 tokens) break up coherent code blocks or complex logical paragraphs, losing context.*
* *Larger chunks (e.g., 2,000 tokens) introduce irrelevant text (context pollution) and consume unnecessarily high token counts.*
* *500 tokens with 10% overlap ensures complete functions or paragraphs stay intact while maintaining precision."*

#### ⚠️ Cross-Q2.2: "Why Cosine Similarity instead of Euclidean Distance or Dot Product?"
**Answer:**  
*"Cosine similarity measures the **angle** between vectors rather than their magnitude. In text retrieval, document length varies significantly—Cosine Similarity normalizes vector lengths, ensuring short concise paragraphs and long detailed chunks are evaluated purely on semantic direction and meaning."*

#### ⚠️ Cross-Q2.3: "How exactly did you calculate the 80% token cost reduction metric?"
**Answer:**  
*"Before RAG, passing a full 25-page document (~20,000 tokens) across 4 debate personas resulted in ~80,000 input tokens per round. With RAG, retrieving top 4 chunks (~2,000 tokens total) dropped input payload to 2,000 tokens per persona—reducing total token consumption from 80,000 to 16,000 tokens, representing an exact 80% reduction."*

---

## ⚡ 4. Deep Dive: Bullet Point 3 — SSE Streaming & Sub-ms In-Memory Cache

> **Resume Line:** *Built real-time SSE streaming for live critique visualization and implemented a sub-millisecond (<1 ms) memory cache with MongoDB persistence supporting 18 AI behaviors.*

### ❓ Question 3: Why Server-Sent Events (SSE) over WebSockets?
**Answer:**  
*"We chose SSE because our stream data flow is strictly **unidirectional**—the server streams live persona debate steps, critique logs, and votes down to the client.*
* **Overhead:** SSE runs over standard HTTP/1.1 and HTTP/2 with lightweight headers, avoiding the complex bi-directional frame handshakes of WebSockets.
* **Resilience:** SSE has native client auto-reconnection and event ID tracking out-of-the-box in the browser `EventSource` API.
* **Infrastructure:** SSE works seamlessly with existing HTTP load balancers and reverse proxies without requiring special WebSocket protocol upgrading."*

---

### 🔍 Cross-Examination & Counter Questions

#### ⚠️ Cross-Q3.1: "How does your in-memory cache achieve sub-millisecond latency?"
**Answer:**  
*"We maintained an in-memory JavaScript `Map` data structure within the Node.js application process memory space. Key lookups by session ID run in $O(1)$ constant time ($<0.1\text{ ms}$), completely eliminating network round-trips to the database during active debate loops."*

#### ⚠️ Cross-Q3.2: "What happens if the Node.js server crashes? Doesn't in-memory cache data get lost?"
**Answer:**  
*"To prevent data loss, we implement a **Write-Through / Asynchronous Persistence pattern**:*
1. *Active chat updates immediately write to the sub-ms in-memory cache for speed.*
2. *An asynchronous worker distills 2-3 sentence session summaries and persists them to an indexed MongoDB `ChatSummary` collection.*
3. *If the server restarts, a cache miss triggers a fast index lookup in MongoDB to re-hydrate the in-memory cache seamlessly."*

---

## 🎭 5. Agent Behaviors & Quality Audit System

### ❓ Question 4: How are the 18 customizable AI behaviors integrated?
**Answer:**  
*"Users can toggle behaviors such as *No Sugarcoating*, *Devil's Advocate*, *Socratic*, or *Code Purist*. These directives are dynamic prompt system constraints injected directly into the persona generator and critique prompts. For example, selecting *Devil's Advocate* forces persona 2 to explicitly challenge persona 1's architectural assumptions."*

---

## 🏗️ 6. System Design & Future Scalability (Senior Level Questions)

### ❓ Question 5: "If Sabha.ai received 100,000 requests per day, what would bottleneck first and how would you redesign it?"
**Answer:**  
1. **Single-Node In-Memory Cache:** Node process memory is bounded per instance. **Fix:** Replace local `Map` cache with a distributed **Redis Cluster** using key eviction policies (LRU).
2. **Synchronous LLM API Calls:** Calling Gemini API sequentially during persona loops would block thread pools. **Fix:** Introduce an asynchronous task queue using **BullMQ / Redis** or **Kafka** with worker processes handling agent debate loops.
3. **Vector Database Scalability:** In-memory cosine calculation on thousands of chunks will slow down. **Fix:** Migrate to a dedicated vector database like **Pinecone**, **Milvus**, or **pgvector**.

---

## 📋 Quick Reference Cheat Sheet for the Interview

| Topic | Key Metric / Tech Keyword | 1-Sentence Answer |
| :--- | :--- | :--- |
| **Problem Solved** | Single-prompt hallucination | Replaced single LLM answer with a 3-round multi-agent council debate. |
| **Token Optimization** | **80% Cost Reduction** | Vector RAG retrieves ~500 token chunks instead of entire files. |
| **Vector Tech** | **3,072-dim embeddings** | Google Gemini embeddings + Cosine Similarity search. |
| **Real-time Protocol** | **Server-Sent Events (SSE)** | Unidirectional HTTP streaming for live thinking step visualization. |
| **Caching Layer** | **Sub-ms ($<1\text{ ms}$)** | In-memory `Map` lookup backed by persistent MongoDB `ChatSummary`. |
| **Audit Layer** | Dual-persona verifiers | Kavya (fact/hallucinations) & Ishaan (prompt completeness). |
