# AlfredAI

AlfredAI is an intelligent meeting assistant that processes raw meeting data into structured, actionable insights. An uploaded audio/video meeting passes through FFmpeg for extraction, utilizes Groq Whisper for transcription, leverages Groq LLMs to extract meeting intelligence, permanently logs out to PostgreSQL, and connects directly up to a React/Electron UI front end.

---

# 1. Requirements

Before getting started, ensure you have the following installed on your machine:
* Node.js
* npm
* PostgreSQL
* FFmpeg

You will also need a **Groq API Key** to authorize the Transcription and Intelligence modules.

---

# 2. Project Structure

```text
AlfredAI/
├── client/          # Vite + React interface
├── server/          # Express backend application
│   ├── src/         # API Routing, Services, Database Integrations
│   ├── prisma/      # Database schema and models
│   └── uploads/     # Target ingestion directory (auto-created)
├── shared/          # Shared components
├── .manus-logs/     # Auto-generated Debugging outputs
├── package.json     # Configuration file for frontend UI and backend launcher
└── README.md
```

---

# 3. Install Dependencies

The backend and frontend are located in their respective directories (`server` and `client`), but dependencies are managed at the root level workspace via pnpm or npm.

Run the following command at the root directory of the project:

```bash
npm install
```

---

# 4. PostgreSQL Setup

1. Install PostgreSQL onto your machine.
2. Initialize and create an empty database (for example, named `alfredai`).
3. Set up or establish a PostgreSQL user providing complete write access to this database.
4. Retrieve your database connection string and outline it utilizing your user credentials.

Here is an example format string:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/alfredai
```
*(You will need to replace `username`, `password`, `localhost`, `5432` and `alfredai` with your actual Postgres details).*

**Initializing the Database:**
Because the project enforces Prisma to safely map your models natively, you don't need to write manual migrations right now. Run the following command from the root directory to establish the database mappings automatically:

```bash
npx prisma db push
```

---

# 5. Groq API Key

AlfredAI connects to Groq services for handling logic and transcriptions via Open Source models avoiding OpenAI dependency. Obtain a free Developer API key at the Groq dashboard.

Place this key directly into the backend configuration file located at `server/.env`. 
**DO NOT** place your API key into any frontend React or Vite configuration files.

```env
GROQ_API_KEY=your_groq_api_key_here

TRANSCRIPTION_MODEL=whisper-large-v3-turbo
SUMMARIZER_MODEL=openai/gpt-oss-20b
```

DO NOT put `GROQ_API_KEY` inside the React/Vite frontend. 
DO NOT commit your `.env` repository securely onto GitHub.

---

# 6. FFmpeg Setup

AlfredAI relies on FFmpeg inside Module 2 to strip videos out of mp4 streams and translate general media formats neatly down into 16kHz PCM WAV formatted files that Groq Whisper expects. 

If you are on Windows, ensure FFmpeg executables are either downloaded globally and injected safely to your machine's `PATH`.

Alternatively, if you downloaded binaries locally, identify their direct path within the `FFMPEG_PATH` environment variable in your `server/.env` configuration:

```env
FFMPEG_PATH=ffmpeg
```

---

# 7. Backend `.env`

You need to create an environment template hook. Navigate to the `server/` directory and create a new `.env` file explicitly tracking your connection variables:

```env
# Module 3 & 4 - Groq AI Parameters
GROQ_API_KEY=your_groq_api_key_here
TRANSCRIPTION_MODEL=whisper-large-v3-turbo
SUMMARIZER_MODEL=openai/gpt-oss-20b

# Module 5 - Persistence
DATABASE_URL=postgresql://username:password@localhost:5432/alfredai

# Utility 
FFMPEG_PATH=ffmpeg
```

*(These variables securely attach logic exclusively on the Server's backend and are automatically pulled via Node's local `process.env` hooks)*.

---

# 8. Frontend Environment Variables

AlfredAI currently relies completely on hardcoded route mapping aimed natively at the backend `http://localhost:5000` structure. It does **not** rely on frontend parameter APIs (e.g. `VITE_API_URL`) at this time. No frontend `.env` configurations are required.

---

# 9. Start the Backend

```bash
cd server
npm run dev
```

Backend runs at:
`http://localhost:5000`

---

# 10. Start the Frontend

Open a second terminal:

```bash
cd client
npm run dev
```

Frontend runs at:
`http://localhost:5173`

*(Note: Both frontend and backend exclusively utilize `npm run dev` out of their respective folders to launch!)*

---

# 11. Running AlfredAI

The system typically follows a straight pipeline sequentially mapped below:
1. Start PostgreSQL
2. Start backend
3. Start frontend
4. Open AlfredAI in browser/Electron
5. Upload an audio/video meeting
6. AlfredAI processes the media
7. Groq Whisper generates transcript
8. Groq LLM generates meeting intelligence
9. Results are saved in PostgreSQL
10. UI displays the results

---

# 12. API Endpoints

| Method | Endpoint                     | Purpose            |
| ------ | ---------------------------- | ------------------ |
| GET    | /api/health                  | Backend health     |
| POST   | /api/meetings                | Upload meeting     |
| GET    | /api/meetings                | List meetings      |
| GET    | /api/meetings/:id            | Get meeting        |
| POST   | /api/meetings/:id/process    | Process meeting    |
| GET    | /api/meetings/:id/transcript | Get transcript     |
| GET    | /api/meetings/:id/insights   | Get insights       |
| PATCH  | /api/action-items/:id        | Update action item |
| DELETE | /api/meetings/:id            | Delete meeting     |

---

# 13. Troubleshooting

### `GROQ_API_KEY` missing
Ensure you established `.env` purely bounded locally inside `server/.env` rather than dropping the secret key inside the root or frontend boundaries. Check standard variable naming conventions natively.

### PostgreSQL Connection Error
Ensure `DATABASE_URL` matches the literal PostgreSQL credential hookings allocated onto your local system port instance (normally `5432`). Confirm the selected database namespace structurally exists before migrating.

### `ffmpeg` Not Found
If testing locally fails at the Media Processor step, confirm FFmpeg is correctly targeted in your PATH configuration or firmly explicitly bound underneath the `FFMPEG_PATH` environment parameter. 

### Frontend Cannot Connect to Backend
Make sure you are verifying:
- Internal backend is concurrently running.
- Backend defaults to exact node instance port `5000`.
- CORS structures natively reflect dev parameters correctly allowing traffic flow.

### Port Already In Use
If `:3000` or `:5000` crashes explicitly during startup, clear stale applications hooking up Node.js sessions (or alter endpoints natively alongside `.env` configs mapping to a subsequent unused port directly).

---

# 14. Environment Variable Summary

| Variable            | Used for                   |
| ------------------- | -------------------------- |
| GROQ_API_KEY        | Groq transcription + LLM   |
| TRANSCRIPTION_MODEL | Speech-to-text model       |
| SUMMARIZER_MODEL    | Meeting intelligence model |
| DATABASE_URL        | PostgreSQL                 |
| FFMPEG_PATH         | FFmpeg executable          |
