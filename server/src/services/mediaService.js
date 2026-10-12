import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStaticRaw from 'ffprobe-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = process.env.TEMP_DIR || path.join(__dirname, '../../../server/temp');

// Ensure temp directory exists 
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configurable via ENV, statically bundled if missing, or fallback to natively installed PATH commands
const existing = (p) => (p && fs.existsSync(p) ? p : null);
const getFfmpegPath = () => existing(process.env.FFMPEG_PATH) || ffmpegStatic || 'ffmpeg';
const getFfprobePath = () => existing(process.env.FFPROBE_PATH) || ffprobeStaticRaw.path || 'ffprobe';

/**
 * Extracts and normalizes audio for the Transcription layer
 * Expects input original raw media file path. 
 * Targets 16kHz Mono PCM 16-bit WAV parameters.
 * Retains original uploaded data natively.
 */
export const processMedia = (inputPath, meetingId) => {
  return new Promise((resolve, reject) => {
    if (!inputPath || !fs.existsSync(inputPath)) {
      return reject(new Error('INPUT_FILE_NOT_FOUND: The specified input file does not exist.'));
    }

    const outputPath = path.join(tempDir, `${meetingId}.wav`);
    const ffmpegPath = getFfmpegPath();

    // Setup FFmpeg arguments to strictly output the exact WAV format required for transcription modules
    const args = [
      '-y',             // Overwrite if exists
      '-i', inputPath,  // Input media 
      '-vn',            // Drop video track universally
      '-acodec', 'pcm_s16le', // Standard PCM 16-bit format
      '-ar', '16000',   // 16 kHz sample rate
      '-ac', '1',       // Mono 
      outputPath        // Target isolated file
    ];

    const ffmpegProcess = spawn(ffmpegPath, args);

    ffmpegProcess.on('error', (err) => {
      reject(new Error(`FFMPEG_EXECUTION_FAILURE: ${err.message}`));
    });

    ffmpegProcess.on('close', async (code) => {
      if (code !== 0) {
        return reject(new Error(`FFMPEG_FAILURE: Non-zero exit code ${code} during media processing`));
      }

      try {
        const metadata = await getMediaMetadata(outputPath);
        
        resolve({
          audioPath: outputPath,
          ...metadata
        });
      } catch (err) {
        // Fallback baseline metadata if ffprobe wasn't installed or structurally errored
        resolve({
          audioPath: outputPath,
          format: 'wav',
          sampleRate: 16000,
          channels: 1
        });
      }
    });
  });
};

/**
 * Probes the normalized WAV to extract fundamental layout sizes and length 
 * Utilizes ffprobe standard structure
 */
const getMediaMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    const ffprobePath = getFfprobePath();
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ];

    const ffprobeProcess = spawn(ffprobePath, args);
    let output = '';

    ffprobeProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobeProcess.on('error', (err) => {
      reject(new Error(`FFPROBE_EXECUTION_FAILURE: ${err.message}`));
    });

    ffprobeProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`FFPROBE_FAILURE: Failed to extract metadata, exit code ${code}`));
      }
      
      try {
        const data = JSON.parse(output);
        const format = data.format || {};
        const streams = data.streams || [];
        const audioStream = streams.find(s => s.codec_type === 'audio');
        
        if (!audioStream) {
          return reject(new Error('NO_AUDIO_STREAM: Output generated did not contain valid audio signatures.'));
        }

        resolve({
          duration: parseFloat(format.duration || 0),
          format: format.format_name,
          audioCodec: audioStream.codec_name,
          sampleRate: parseInt(audioStream.sample_rate || 16000, 10),
          channels: parseInt(audioStream.channels || 1, 10)
        });
      } catch (err) {
        reject(new Error('METADATA_PARSE_ERROR: Parsing ffprobe JSON failed'));
      }
    });
  });
};
