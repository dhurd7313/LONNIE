// Video analyzer — extracts frames from video, sends to vision model for analysis
// Works with: local file upload, video URL, screen capture

export interface VideoSegment {
  index: number;
  timestamp: number;    // seconds
  frameDataUrl: string; // base64 PNG frame
  analysis?: string;    // model's description of this frame
}

export interface VideoAnalysis {
  filename: string;
  duration: number;
  totalFrames: number;
  segments: VideoSegment[];
  summary?: string;
}

export async function extractFrames(
  file: File,
  framesPerSegment: number = 1,
  segmentDuration: number = 5, // seconds between frames
  onProgress?: (pct: number, msg: string) => void
): Promise<VideoSegment[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.preload = "metadata";

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const segments: VideoSegment[] = [];

      // Sample frames at regular intervals
      const timestamps: number[] = [];
      for (let t = 0; t < duration; t += segmentDuration) {
        timestamps.push(Math.min(t, duration - 0.1));
      }
      // Always include last frame
      if (duration > segmentDuration) {
        timestamps.push(duration - 0.1);
      }

      // Cap at 20 frames to avoid overwhelming the model
      const cappedTimestamps = timestamps.length > 20
        ? timestamps.filter((_, i) => i % Math.ceil(timestamps.length / 20) === 0).slice(0, 20)
        : timestamps;

      for (let i = 0; i < cappedTimestamps.length; i++) {
        const t = cappedTimestamps[i];
        onProgress?.(Math.round((i / cappedTimestamps.length) * 60), `Extracting frame ${i + 1}/${cappedTimestamps.length}...`);

        await new Promise<void>((res) => {
          video.currentTime = t;
          video.onseeked = () => {
            canvas.width = Math.min(video.videoWidth, 640);
            canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            segments.push({
              index: i,
              timestamp: t,
              frameDataUrl: dataUrl,
            });
            res();
          };
        });
      }

      URL.revokeObjectURL(url);
      video.remove();
      resolve(segments);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load video file. Try MP4, WebM, or MOV."));
    };
  });
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
