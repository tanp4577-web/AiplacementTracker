# PlacementPrep - Comprehensive Project Documentation

## 1. Project Overview
**PlacementPrep** is a comprehensive, browser-based AI placement preparation portal. It is designed to help college students and early-career professionals prepare for placements by offering a holistic suite of tools: resume analysis, live HR interview simulation, aptitude and coding practice, skill gap identification, and targeted job hunting. 

The project focuses on seamless user experience through a Single Page Application (SPA) architecture, driven entirely by Vanilla JavaScript on the frontend, with lightweight serverless functions and a local backend for specialized features (like voice processing and video recording).

---

## 2. Architecture & Technology Stack

### Frontend (Client-side)
- **HTML5 & CSS3**: Core layout and custom styling (`css/style.css`).
- **Vanilla JavaScript**: Used extensively for routing, state management, UI interactivity, and API calls. Modularized into separate files for each feature (e.g., `dashboard.js`, `interview.js`, `resume.js`, etc.).
- **Tailwind CSS (CDN)**: Used for rapid UI prototyping, responsive design, and utility styling.
- **Icons**: FontAwesome 6 (CDN).
- **In-browser processing**: Heavy lifting such as PDF/DOCX resume text extraction is done purely in the browser (via `resume-parser.js`) to ensure cost efficiency and user privacy before interacting with AI.
- **Web APIs used**: 
  - `Web Speech API` (for speech-to-text dictation in interviews).
  - `SpeechSynthesis` (native browser TTS fallback).
  - `MediaRecorder` & `getUserMedia` (for camera integration and video recordings).
  - `Geolocation API` (for regional job matching).

### Serverless API (Vercel Functions)
The `/api` folder contains Node.js serverless edge functions that act as secure proxies to interact with LLMs (Large Language Models), keeping API keys hidden from the client browser. 
- **Google Gemini API**: Serves as the core intelligence engine (using `gemini-2.0-flash` or `gemini-2.5-flash`).
- **Endpoints**:
  - `api/chat.js`: Powers the "PrepAI Assistant" floating chatbot.
  - `api/interview-chat.js`: Powers the dynamic Interview Simulator by providing intelligent HR follow-up questions contextually.
  - `api/job-apply.js`: Acts as an AI Applicant Tracking System (ATS), cross-comparing Job Descriptions with candidate Resumes to return match scores, missing skills, and tailored interview questions.

### Local Backend Service (Flask)
A Python Flask server (`app.py`) exists to provide premium features that the browser can't handle seamlessly:
- **TTS Endpoint (`/tts`)**: Utilizes the `edge-tts` python library to generate high-quality Microsoft Edge Neural text-to-speech audio, avoiding browser limitations.
- **Proof Upload (`/upload-proof`)**: Accepts multi-part form data uploads of the candidate's live recorded video interview (WebM files) and saves them locally to a `/recordings` directory.

---

## 3. Core Modules & Features

### 1. Dashboard
- **Location**: `js/dashboard.js`, `index.html` (Dashboard view)
- **Functionality**: Serves as the central hub showing users their placement "readiness" score across different modules (Overall, Aptitude, Coding, Interview, etc.).

### 2. HR Interview Simulator
- **Location**: `js/interview.js`, `js/live-voice.js`
- **Functionality**: A live, AI-driven HR interviewer. 
- **Flow**: Connects to the user's Camera and Microphone. Recognizes user speech via Web Speech API, sends the transcript text to the Vercel API (`api/interview-chat.js`), receives the AI's contextual follow-up, and plays it back audibly either via the local Flask server (`Edge-TTS`) or native browser speech. It also records the session and saves the video to the local Python Flask server.

### 3. Hiring Hub & Resume Analyzer
- **Location**: `js/jobs.js`, `js/resume.js`, `js/resume-parser.js`, `js/data/jobs-data.js`
- **Functionality**: Acts as an AI-powered job board. Users can allow location tracking to see regional openings.
- **Deep Integration**: When applying for a job, users upload a Resume. The browser extracts the text locally, sends it with the Job Description to `api/job-apply.js`. The AI acts as an ATS, giving a "Match Score", suggesting "Missing Skills" (skill gap), and creating 3 targeted interview questions specific to the weaknesses detected. The user can then immediately launch the HR Simulator utilizing these targeted questions.

### 4. Chatbot (PrepAI Assistant)
- **Location**: `js/chatbot.js`, `api/chat.js`
- **Functionality**: A persistent Floating Action Button (FAB) chatbot using Gemini to answer quick questions regarding interview strategies, tech stack tips, or placement advice. Includes intelligent fallbacks to Pollinations.ai API if Gemini limits are hit or the backend is unavailable.

### 5. Skill Gap & Company Patterns
- **Location**: `js/skills.js`, `js/company.js`
- **Functionality**: Maps the candidate's current tech stack against industry requirements and visualizes the layout. Company Patterns reveals specific hiring tendencies, historical questions, and frameworks preferred by target organizations (e.g., TCS, Infosys, Google, etc.).

### 6. YouTube Lectures & Mentorship
- **Location**: `js/youtube.js`, `js/lecture-questions.js`
- **Functionality**: A curated video learning engine. Allows users to watch integrated YouTube content. Directly after or during a video, users can be quizzed on the content via the Lecture Questions module, tracking their progress directly against their viewing completion.

### 7. Aptitude & Coding Practice
- **Location**: `js/aptitude.js`, `js/coding.js`
- **Functionality**: Offline-capable quiz engines and code playgrounds. Relies on data predefined in the `js/data/` folder, allowing candidates to practice Logical Reasoning, Quants, Verbal, and specific Data Structures/Algorithms routines.

---

## 4. Setup and Deployment Strategy

### Online Infrastructure (Vercel)
1. Hosted automatically via Vercel (indicated by `.vercel` and `vercel.json` configurations).
2. Requires adding Environment Variables on Vercel:
   - `LLM_API_KEY`: Google Gemini API Key.
3. Automatically routes `/api/*` to the serverless JS functions in the codebase.

### Local Utilities (Python Flask)
If the user desires video recording and premium Edge-TTS voices:
1. Ensure Python is installed.
2. Setup virtual environment: `python -m venv .venv`
3. Activate environment and install dependencies: `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`
4. Run the Flask Server: `python app.py` (Starts on `http://localhost:5000`)

---

## 5. Security & Privacy Highlights

1. **Client-side Parsing**: Resumes (often containing PII like Phone Numbers and Addresses) are parsed into text directly within the browser using `resume-parser.js`. Only raw text is sent to the AI API; the actual document file never leaves the user's device.
2. **Rate Limiting**: Serverless functions (`api/chat.js`, `api/interview-chat.js`) implement IP-based rate limiting (Map-based bucketing) to prevent abuse and API quota exhaustion.
3. **Graceful Fallbacks**: If API keys are missing or Quotas are reached, the platform smartly falls back to browser-side local questions, Pollinations.ai (free tier LLM), and SpeechSynthesis to ensure the app never strictly breaks for the user.
