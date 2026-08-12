import type { RecorderSession, RecorderSessionOptions } from "~/types/screenRecorder";
import { computeOverlayRect, pickRecorderMimeType, recorderBitrate } from "~/utils/screenRecorder";

/**
 * The recording engine: composites the display + webcam onto a canvas,
 * mixes microphone/tab audio through the Web Audio graph, and encodes the
 * result with MediaRecorder. Everything stays on the device.
 */
export function useScreenRecorder() {
  function createSession(options: RecorderSessionOptions): RecorderSession {
    const { canvas, displayStream, resolution, frameRate } = options;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) throw new Error("Could not create the recording canvas.");
    const ctx = canvasContext;

    const displayVideo = document.createElement("video");
    displayVideo.muted = true;
    displayVideo.playsInline = true;
    displayVideo.srcObject = displayStream;

    let cameraVideo: HTMLVideoElement | null = null;
    let cameraAspect = 16 / 9;
    let overlayEnabled = options.overlay.enabled;

    let frameHandle: number | null = null;
    let paused = false;
    let stopped = false;
    let disposed = false;
    let recorder: MediaRecorder | null = null;
    let audioContext: AudioContext | null = null;
    const chunks: Blob[] = [];
    let stopResolve: ((blob: Blob) => void) | null = null;
    let stopReject: ((error: Error) => void) | null = null;

    const displayTrack = displayStream.getVideoTracks()[0] ?? null;

    async function awaitPlayable(video: HTMLVideoElement): Promise<void> {
      if (video.readyState >= 2) return;
      await new Promise<void>((resolve) => {
        const onReady = (): void => {
          video.removeEventListener("loadeddata", onReady);
          resolve();
        };
        video.addEventListener("loadeddata", onReady);
      });
    }

    function bindCamera(stream: MediaStream | null): void {
      if (cameraVideo) {
        cameraVideo.srcObject = null;
        cameraVideo = null;
      }
      if (!stream) return;
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      void awaitPlayable(video).then(() => {
        if (cameraVideo === video && video.videoWidth > 0 && video.videoHeight > 0) {
          cameraAspect = video.videoWidth / video.videoHeight;
        }
      });
      cameraVideo = video;
    }

    function sizeCanvas(displayHeight: number): { width: number; height: number } {
      const targetHeight =
        resolution === "1080p" ? 1080 : resolution === "720p" ? 720 : displayHeight;
      const scale = targetHeight / displayHeight;
      return { width: Math.round(displayVideo.videoWidth * scale), height: targetHeight };
    }

    async function setupCanvasSize(): Promise<void> {
      await awaitPlayable(displayVideo);
      const { width, height } = sizeCanvas(displayVideo.videoHeight);
      canvas.width = width;
      canvas.height = height;
    }

    async function setupAudio(): Promise<MediaStreamTrack | null> {
      const { micStream, tabStream } = options;
      const sources = [micStream, tabStream].filter(
        (stream): stream is MediaStream => stream !== null
      );
      if (sources.length === 0) return null;
      audioContext = new AudioContext();
      if (audioContext.state === "suspended") await audioContext.resume();
      const destination = audioContext.createMediaStreamDestination();
      for (const source of sources) {
        audioContext.createMediaStreamSource(source).connect(destination);
      }
      return destination.stream.getAudioTracks()[0] ?? null;
    }

    function draw(): void {
      if (paused || disposed) return;
      frameHandle = requestAnimationFrame(draw);

      if (displayVideo.readyState >= 2) {
        ctx.drawImage(displayVideo, 0, 0, canvas.width, canvas.height);
      }

      if (overlayEnabled && cameraVideo && cameraVideo.readyState >= 2) {
        const rect = computeOverlayRect(
          canvas.width,
          canvas.height,
          cameraAspect,
          options.overlay.corner,
          options.overlay.size
        );
        const radius = Math.min(12, Math.floor(rect.height / 4));
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
          ctx.clip();
          ctx.drawImage(cameraVideo, rect.x, rect.y, rect.width, rect.height);
          ctx.restore();
        } else {
          ctx.drawImage(cameraVideo, rect.x, rect.y, rect.width, rect.height);
        }
      }
    }

    async function start(): Promise<void> {
      const mime = pickRecorderMimeType((candidate) => {
        try {
          return MediaRecorder.isTypeSupported(candidate);
        } catch {
          return false;
        }
      });
      if (!mime) {
        throw new Error("This browser cannot record video (no supported codec).");
      }

      await setupCanvasSize();
      if (options.cameraStream) bindCamera(options.cameraStream);
      const audioTrack = await setupAudio();

      const canvasStream = canvas.captureStream(frameRate);
      const videoTrack = canvasStream.getVideoTracks()[0];
      const recordingStream = new MediaStream(
        videoTrack ? [videoTrack, ...(audioTrack ? [audioTrack] : [])] : []
      );

      recorder = new MediaRecorder(recordingStream, {
        mimeType: mime.mimeType,
        videoBitsPerSecond: recorderBitrate(resolution)
      });
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        if (stopResolve) stopResolve(new Blob(chunks, { type: mime.mimeType }));
      });
      recorder.addEventListener("error", () => {
        if (stopReject) {
          stopReject(new Error("The recorder failed while encoding the video."));
          stopReject = null;
        }
      });

      if (displayTrack) {
        displayTrack.addEventListener("ended", onScreenEnded);
      }

      recorder.start(1000);
      draw();
    }

    function onScreenEnded(): void {
      if (!stopped && !disposed) options.onScreenEnded();
    }

    const ready = start().catch((error) => {
      dispose();
      throw error instanceof Error ? error : new Error("Could not start the recorder.");
    });

    function stopInternal(): Promise<Blob> {
      if (stopped) {
        return Promise.reject(new Error("The session was already stopped."));
      }
      stopped = true;
      if (frameHandle !== null) cancelAnimationFrame(frameHandle);
      return new Promise<Blob>((resolve, reject) => {
        if (!recorder || recorder.state === "inactive") {
          dispose();
          resolve(new Blob(chunks));
          return;
        }
        stopResolve = resolve;
        stopReject = reject;
        try {
          recorder.stop();
        } catch (error) {
          dispose();
          reject(error instanceof Error ? error : new Error("Could not stop the recorder."));
        }
      }).finally(() => dispose());
    }

    function dispose(): void {
      if (disposed) return;
      disposed = true;
      if (frameHandle !== null) cancelAnimationFrame(frameHandle);
      if (displayTrack) displayTrack.removeEventListener("ended", onScreenEnded);
      if (displayTrack && displayTrack.readyState === "live") displayTrack.stop();
      const { cameraStream, micStream, tabStream } = options;
      for (const stream of [cameraStream, micStream, tabStream]) {
        if (!stream) continue;
        for (const track of stream.getTracks()) track.stop();
      }
      if (cameraVideo) cameraVideo.srcObject = null;
      displayVideo.srcObject = null;
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
        audioContext = null;
      }
    }

    return {
      ready,
      stop: stopInternal,
      pause(): void {
        if (paused || stopped || disposed) return;
        paused = true;
        if (frameHandle !== null) cancelAnimationFrame(frameHandle);
        frameHandle = null;
        if (recorder && recorder.state === "recording") recorder.pause();
      },
      resume(): void {
        if (!paused || stopped || disposed) return;
        paused = false;
        if (recorder && recorder.state === "paused") recorder.resume();
        draw();
      },
      setOverlayEnabled(enabled: boolean): void {
        overlayEnabled = enabled;
      },
      setCameraStream(stream: MediaStream | null): void {
        bindCamera(stream);
      },
      dispose
    };
  }

  return { createSession };
}
