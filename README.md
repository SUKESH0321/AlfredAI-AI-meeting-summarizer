# AlfredAI

## Overview

AlfredAI is an intelligent meeting assistant packaged as a desktop application. It processes audio and video meeting data into structured, actionable insights. Media files are sent through FFmpeg for audio normalization, transcribed using Groq Whisper, and analyzed by a Groq LLM (Large Language Model) to extract comprehensive meeting intelligence. The data is persisted locally in PostgreSQL and delivered via a desktop-integrated React UI wrapped in Electron.

## Features

### Authentication
* User Registration and Login
* Profile modification (Name, Email)
* Secure session persistence via HttpOnly Cookies
* Account Logout

### Meeting Capture
* Live microphone recording straight from the interface (saved as WebM or MP4)
* Direct media file upload (MP3, WAV, M4A, MP4, WebM)
* In-app media playback linked to timestamps

### AI Processing
* Automated Audio Normalization using FFmpeg 
* Speech-to-Text Transcription via Groq (Whisper models)
* Meeting Intelligence Extraction using Groq (Open Source Chat Models)
* Extracted Summaries, Key Points, Decisions, and Upcoming Meeting mentions
* Interactive Task / Action Item extraction with toggleable completion status

### Persistence
* PostgreSQL-backed storage governed by Prisma ORM
* Application data (temp audio and processed media) flows through Electron application `userData` paths (or `server/temp` statically in dev)
* Local archive history and timestamped timeline

### Desktop
* Fully self-contained Electron desktop experience
* Starts perfectly maximized at 1920x1080 resolution
* Electron coordinates backend initialization automatically so that manual parallel terminals are not strictly required

## Architecture

```text
┌─────────────────────────────┐
│        AlfredAI Desktop     │
│       Electron Container    │
│    (Handles Backend Spawn)  │
├─────────────────────────────┤
│        React + Vite         │
│          Frontend           │
└──────────────┬──────────────┘
               │ HTTP (localhost:5000)
               ▼
┌─────────────────────────────┐
│      Express Backend        │
├─────────────────────────────┤
│ Auth │ Meetings │ Processing│
└──────────────┬──────────────┘
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
   FFmpeg    Groq    PostgreSQL
```

## Tech Stack

* **Frontend:** React 19, Vite 7, React Router 7, TailwindCSS 4, Lucide React (Icons)
* **Backend:** Express 5, Node.js
* **Desktop:** Electron 28, Electron Builder
* **Database:** PostgreSQL mapped linearly via Prisma
* **Media Handling:** FFmpeg & FFprobe (static binaries attached to the Node process)
* **AI Tooling:** Groq SDK for transcription (`whisper-large-v3-turbo`) and intelligent chatting (`openai/gpt-oss-20b`)

## Project Structure

```text
Alfred/
├── client/                 # Vite + React Interface & Electron Shell
│   ├── electron/           # Electron main process & windows preload
│   ├── src/                # React App Source Code
│   ├── index.html
│   ├── vite.config.js      # Vite transpilation rules
│   └── package.json
│
├── server/                 # Express backend application
│   ├── prisma/             # PostgreSQL database schemas
│   ├── src/                # API Routing, AI Services, Database Integrations
│   ├── index.js            # Express Entrypoint
│   └── package.json
│
├── package.json            # Root dependency tracking
└── README.md
```

## How It Works

### AI Pipeline

1. **Upload/Record:** The user records live browser audio or drags and drops an audio/video file.
2. **Storage:** The Express backend receives the multiformat payload and saves as an original uploaded file.
3. **FFmpeg Normalization:** The `mediaService` spawns FFmpeg processing, stripping any video tracks and strictly downgrading audio into single-channel 16 kHz PCM WAV.
4. **Transcription:** `transcriptionService` connects the WAV payload out to Groq utilizing `whisper-large-v3-turbo`.
5. **Meeting Intelligence:** The `intelligenceService` forces strict JSON responses out of a Groq summarizer model (`openai/gpt-oss-20b`) identifying the title, summary, key points, tasks, and follow-ups based precisely on the transcribed context.
6. **Persistence:** The parsed transcript and AI-generated insight tree are flushed entirely out into PostgreSQL via Prisma.
7. **Delivery:** The React UI live-polls for changes and reveals the structured output once processing signals completion.

## Authentication

Authentication is completely session-based handled over the API via JSON Web Tokens (`jsonwebtoken`). The server securely manages authentication state through strict `HttpOnly` Cookies. The Frontend Context provider validates this state passively and maps unprotected traffic straight to `/alfred/login`. User passwords rest hashed iteratively inside PostgreSQL (`bcryptjs`). 

## Database Schema

| Model          | Purpose |
| -------------- | ------- |
| User           | Core application users. Retains authentication and links user-centric data. |
| Meeting        | Uploaded/recorded metadata connecting all AI generated layers together. |
| Transcript     | Linear raw transcription of the meeting logic alongside duration tracking. |
| MeetingInsight | Aggregated JSON payloads of AI-derived Decisions, Summaries, Key Points. |
| ActionItem     | Individual toggelable task deliverables parsed dynamically per insight generation. |

## API Reference

The backend typically listens statically on `http://localhost:5000`. 

| Method | Endpoint                     | Purpose            |
| ------ | ---------------------------- | ------------------ |
| GET    | `/api/health`                | Server health check and initialization marker |
| POST   | `/api/auth/register`         | Register a brand new valid User account |
| POST   | `/api/auth/login`            | Autheticate session token via user credentials |
| POST   | `/api/auth/logout`           | Clears local cookies ending user sessions |
| GET    | `/api/auth/me`               | Retrieve current session profile data |
| PATCH  | `/api/auth/profile`          | Update active profile Name & Email |
| POST   | `/api/meetings`              | Upload form file stream directly to server |
| GET    | `/api/meetings`              | Fetch chronological array of User's entire Meeting History |
| GET    | `/api/meetings/:id`          | Retrieve the full compound dataset backing an individual Meeting ID |
| GET    | `/api/meetings/:id/media`    | Stream original persisted media directly for audio playback |
| POST   | `/api/meetings/:id/process`  | Tell the Backend Engine to trigger normalizer/LLM generation on Meeting ID |
| GET    | `/api/meetings/:id/transcript`| Retrieve explicit Transcript block attached to Meeting ID |
| GET    | `/api/meetings/:id/insights` | Retrieve explicit AI Extracted JSON insights attached to Meeting ID |
| PATCH  | `/api/action-items/:id`      | Update progress state dynamically bounding an action task |
| DELETE | `/api/meetings/:id`          | Delete meeting permanently |

*All private meeting/insight requests enforce strict Authorization Headers guaranteeing authenticated users can only request or modify their specific database ownership layers.*

## Environment Variables

You need a `.env` hook configured exclusively strictly in `server/.env`.
There is intentionally NO root `.env` requirement. 
There is intentionally NO target Client UI (.env) variables expected.

Navigate to `server/` and create `.env` dynamically mapping:

```env
# Module 3 - Transcription
GROQ_API_KEY=your_groq_api_key_here
TRANSCRIPTION_MODEL=whisper-large-v3-turbo

# Module 4 - Intelligence
SUMMARIZER_MODEL=openai/gpt-oss-20b

# Module 5 - Persistence
DATABASE_URL=postgresql://user:password@localhost:5432/alfredai
```

## Prerequisites

1. **Node.js** (v18+ recommended)
2. **PostgreSQL** server runtime actively available locally on Port 5432.
3. **FFmpeg** bindings mapped to local environment `$PATH` configuration *or* successfully resolving against `ffmpeg-static` / `ffprobe-static` node wrappers automatically provisioned down in modules.

## Development Setup

1. Check out project root locally.
2. Initialize root-scale dependencies directly:
```powershell
npm install
```
3. Initialize the database namespace structure based entirely off of locally constructed `schema.prisma`. Execute internally inside project root bridging down to server:
```powershell
cd server
npx prisma db push
cd ..
```

*Prisma inherently writes table creation queries immediately out mapping perfectly over your targeted DB based on definitions.*

## Running the Application

Unlike previous separated-workspace workflows, the development runner uses `concurrently` strictly to wire up Vite tooling and the native Electron process. Crucially, **the Electron Main process itself securely launches the Express backend in an isolated child process**. 

You do **not** need to manually launch dual terminals.

```powershell
cd client
npm run dev
```

1. **Vite** binds dynamically at `http://localhost:5173`.
2. **Wait-on** dynamically waits cleanly until Vite launches successfully.
3. **Electron.** boots, launching native Node executable layers (`server/index.js`) locally handling Express port `5000`.
4. The Desktop Window actively maximizes itself rendering up your fully built environment.

## Building the Desktop Application

The application identity relies structurally against `com.alfredai.app` registered explicitly bounding `AlfredAI-V1.1.020`. 

To generate a full desktop Windows Executable build locally:

```powershell
cd client
npm run build
```

This compiles React rigidly utilizing standard `vite build`. Afterwards, Electron Builder explicitly hooks the target transpiled folder `../dist/public`, embeds Electron preload frameworks, and deeply bundles `../server` cleanly via strict ExtraResources to ensure Backend availability identically out on customer platforms. Target output resolves statically locally out under `client/release`.

## Production Architecture

In true Production:
```text
User double-clicks AlfredAI shortcut
        ↓
Electron Context begins
        ↓
Server is immediately dynamically dispatched from packaged ASAR resources
        ↓
Electron Window dynamically reads bundled local HTML files directly from Vite Build output 
        ↓
AlfredAI desktop application runs offline natively binding local Express logic hooks directly against internal machine paths
```
*Note: Due to Node dependency execution out of packaging mechanisms, user data strictly binds back tracking against temporary operating `app.getPath('userData')` configurations rather than arbitrary local root structures.* 

## Troubleshooting

### Node crashes looping immediately inside Backend Initialization
The backend server requires synchronous execution bindings blocking process ejection out of the Event Loop dynamically. This utilizes `http.createServer(app).listen()`. If crashes explicitly drop `5000` instances rapidly, ensure Prisma database configuration is perfectly authenticated and responsive natively before triggering Node hooks. Connection rejections immediately crash server environments safely.

### PostgreSQL Connection Error
Ensure `DATABASE_URL` matches postgresql valid `5432` formatting mapped to the exact database name instantiated prior. Re-try testing `npx prisma db push`.

### Failed Audio Extract
The Media Services processor rigidly hooks to specific node bindings tracking `ffprobe` and `ffmpeg`. If error payloads state missing executable, ensure FFmpeg executable structures are locally downloaded and mapped tightly into local machine PATH parameters dynamically. 

### Start-Up Timeout Error
If Electron hangs mapping a `timeout` explicitly, verify server environment `process.env` structures are accurately populated permitting `/api/health` 200 HTTP codes returned from target Localhost interfaces dynamically.

## Security Notes

* Any sensitive API hooks (Groq SDK validation metrics) execute exclusively safely bounded to Backend memory parameters resolving dynamically on runtime.
* The frontend context runs functionally segregated. Context Isolation prevents unbridled frontend application injections directly out into sensitive deep OS logic. Target window bindings strictly rely on IPC wrappers when required securely mapping logic hooks bridging renderers to main.
* Raw unauthenticated access rejects explicitly against Database models, actively returning `401 Unauthorized` flags for unregistered hooks querying out `/api/meetings` data metrics.
* Secrets and API parameters are entirely excluded structurally off github environments and unreferenced implicitly in build compilations locally.

## Current Limitations

* FFmpeg logic processes raw target file handling entirely across local storage bindings via Node `child_process` hooks statically prior to API dispatches. Lengthy structural audio imports significantly compound rendering windows prior to visual loading indicators out off the API interface.
* Target Desktop Electron application builds operate successfully under local environments; explicit signing signatures required prior to widespread deployment remain unconfigured.
* Profile Preference implementations tracking user local storage states remain unhooked statically on UI (Placeholder values loaded only).
