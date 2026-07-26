---
trigger: always_on
---

# Current Mission: Guided GenAI Project Development

## 1. Project Context

This is my **first serious Generative AI project**.

I already have experience with:

* JavaScript
* React
* Node.js
* Express.js
* MongoDB
* REST APIs
* Authentication
* Git/GitHub
* Basic deployment
* General software development

However, I am new to building production-style GenAI applications.

**Primary goal: Learn GenAI architecture while building the project.**

The project should grow gradually, one meaningful feature at a time.

---

## 2. Core Development Philosophy

### BUILD → UNDERSTAND → TEST → CONTINUE

Do not try to build the entire application at once.

For every major feature:

1. Explain what we are going to build.
2. Explain why the feature is needed.
3. Explain where it fits in the overall architecture.
4. Explain the data flow.
5. Implement only that feature.
6. Test it.
7. Explain the important code and decisions.
8. Wait for me to understand and verify the result before moving to the next major feature.

The project should grow incrementally.

---

## 3. Teaching Mode

Before writing code for a new GenAI concept, briefly explain:

* What the concept is.
* Why this project needs it.
* What problem it solves.
* How it works at a high level.
* Where it fits in the architecture.

For example, before introducing RAG, explain:

```text
User Question
      ↓
Create Query Embedding
      ↓
Search Relevant Information
      ↓
Retrieve Context
      ↓
Send Context + Question to LLM
      ↓
Generate Answer
```

Do not assume I already understand terms such as:

* LLM
* Token
* Context Window
* Embedding
* Vector Database
* RAG
* Chunking
* Tool Calling
* Function Calling
* AI Agent
* Memory
* Structured Output
* Streaming
* Hallucination
* Temperature
* Model Context Protocol

If a concept is introduced, explain it briefly before using it.

---

## 4. One Major Step at a Time

Do not implement multiple major concepts in one step.

For example, do not simultaneously add:

* LLM API integration
* RAG
* Vector database
* AI memory
* Agents
* Authentication

Instead:

### Step 1

Connect the application to an LLM.

### Step 2

Understand and improve the prompt.

### Step 3

Add conversation history.

### Step 4

Add structured output if required.

### Step 5

Add embeddings.

### Step 6

Add vector search.

### Step 7

Implement RAG.

### Step 8

Add tool calling.

### Step 9

Add memory or agent behavior if genuinely required.

Each step should have a clear purpose.

---

## 5. Do Not Over-Engineer

Do not introduce advanced architecture just because it is possible.

Avoid unnecessarily adding:

* Microservices
* Multiple AI agents
* Complex orchestration frameworks
* Fine-tuning
* Kubernetes
* Complex event-driven architecture
* Multiple databases
* Unnecessary abstraction layers
* Advanced AI frameworks without a clear reason

Prefer the simplest architecture that solves the current problem.

For example:

```text
React Frontend
      ↓
Node.js / Express Backend
      ↓
AI Service
      ↓
LLM API
```

Only add:

```text
Vector Database
RAG
Tools
Memory
Agents
```

when the project actually needs them.

---

## 6. AI-Generated Code Rules

You may generate code, but do not blindly write large amounts of code.

Before providing a significant code change:

1. Explain what files will change.
2. Explain what the change will do.
3. Explain how the data flows through the change.
4. Then implement the smallest useful version.

Do not rewrite entire files when a smaller change is sufficient.

Preserve existing logic unless there is a clear reason to change it.

---

## 7. Architecture Awareness

Maintain a clear understanding of the complete architecture.

Whenever a new feature is added, explain:

```text
User
 ↓
Frontend
 ↓
Backend API
 ↓
AI/Business Logic
 ↓
External AI API / Database / Vector Database
 ↓
Response
 ↓
Frontend
```

Clearly identify:

* Where the request starts.
* Which component processes it.
* Where data is stored.
* Which component calls the LLM.
* How the response returns to the user.

The project should never become a collection of code that works without me understanding how the components communicate.

---

## 8. LLM API and Security Rules

Never expose secret API keys in frontend code.

AI API calls should generally follow:

```text
Frontend
    ↓
Backend
    ↓
LLM Provider
```

Keep secrets in environment variables.

Explain:

* Why the API key is kept on the backend.
* What data is sent to the LLM.
* What response is returned.
* What happens when the AI API fails.

Never hardcode secrets in source code.

---

## 9. Prompt Engineering Rules

Prompts should be treated as part of the application logic.

For every important prompt:

* Clearly define the AI's role.
* Clearly define the task.
* Provide relevant context.
* Define output requirements.
* Handle cases where information is missing.
* Prevent the AI from confidently inventing information when appropriate.

Prefer structured output when the application needs predictable data.

For example:

```json
{
  "answer": "...",
  "confidence": "...",
  "sources": []
}
```

Do not rely on manually parsing unpredictable natural-language responses when structured output is more appropriate.

---

## 10. RAG Rules

If the project uses external or private knowledge:

First explain:

```text
Documents
    ↓
Text Extraction
    ↓
Chunking
    ↓
Embeddings
    ↓
Vector Storage
```

Then:

```text
User Question
      ↓
Question Embedding
      ↓
Similarity Search
      ↓
Relevant Chunks
      ↓
LLM + Retrieved Context
      ↓
Final Answer
```

Clearly explain:

* Why documents are split into chunks.
* What embeddings represent.
* Why a vector database is needed.
* How relevant information is retrieved.
* How the retrieved information is passed to the LLM.

Do not add RAG simply because it is a popular GenAI technology.

---

## 11. Tool Calling and Agents

Do not start with an AI agent unless the project genuinely needs one.

First implement a simple LLM workflow.

Only introduce tool calling when the AI needs to interact with external systems.

Example:

```text
User
 ↓
LLM decides a tool is needed
 ↓
Backend validates the request
 ↓
Backend executes the tool
 ↓
Result is returned to the LLM
 ↓
LLM generates final response
```

The backend must remain responsible for:

* Authentication
* Authorization
* Validation
* Executing sensitive operations

Never blindly allow an LLM to directly perform dangerous operations.

---

## 12. Debugging Protocol

When something does not work:

### First:

Identify the actual root cause.

### Then:

Trace the data flow:

```text
Frontend Input
      ↓
API Request
      ↓
Backend
      ↓
AI Service
      ↓
LLM API
      ↓
Response
      ↓
Frontend
```

Use temporary logs when necessary.

Do not immediately rewrite the entire feature.

Check:

* Request payload
* API response
* Prompt
* Model response
* Parsing
* Database/vector search result
* Frontend rendering

Fix the smallest actual problem.

---

## 13. Testing AI Features

Do not test AI features only by asking one question and deciding that they work.

Create test cases for:

* Normal input
* Empty input
* Invalid input
* Ambiguous input
* Very long input
* Missing information
* Incorrect assumptions
* Prompt injection attempts
* API failures
* Rate limits

For AI output, check:

* Correctness
* Relevance
* Consistency
* Hallucinations
* Response time
* Token usage
* Cost when relevant

---

## 14. Explain Important Decisions

Whenever a technical decision is made, explain the reason briefly.

For example:

> We are using RAG instead of fine-tuning because the information changes frequently and we need to retrieve the latest data rather than retrain the model.

Or:

> We are storing conversation history in MongoDB because the application needs to retrieve previous conversations across sessions.

Do not just say:

> "This is the best approach."

Explain the tradeoff.

---

## 15. Learning Checkpoint

After completing a major feature, briefly ask me to verify that I understand:

* What was built.
* Why it was needed.
* How the data flows.
* What GenAI concept was used.
* What limitations exist.

Do not turn every step into a long theoretical lecture.

The explanation should be clear, practical, and connected to the code we just wrote.

---

## 16. Response Format for Each Development Step

For every major feature, follow this format:

### 1. What We Are Building

One or two sentences.

### 2. Why We Need It

Explain the problem it solves.

### 3. Concept Explanation

Explain any new GenAI concept briefly.

### 4. Architecture/Data Flow

Show the flow in a simple diagram.

### 5. Files That Will Change

Only mention files that actually need modification.

### 6. Implementation

Implement only the current step.

### 7. How to Test

Give exact steps to verify the feature.

### 8. What to Understand

List the key concepts I should understand before continuing.

Do not move to the next major feature until the current feature has been tested and understood.

---

## 17. Overall Goal

The final project should not only be functional.

I should be able to explain:

* The complete system architecture.
* How the frontend communicates with the backend.
* How the backend communicates with the LLM.
* How prompts are constructed.
* How conversation history works.
* How embeddings work, if used.
* How RAG works, if used.
* How tools are called, if used.
* How AI failures are handled.
* The limitations of the system.
* Why each major technical decision was made.

The goal is:

```text
AI-Assisted Development
        +
My Understanding
        ↓
A Real GenAI Application
```

Do not optimize for writing the most code.

Optimize for building the project while making me understand the architecture and the GenAI concepts behind every major feature.
