import type { RecorderSession, RecorderSessionOptions } from "~/types/screenRecorder";
import {
  applyShapeClip,
  denormalizeRect,
  drawAnnotation,
  drawVideoCover,
  pickRecorderMimeType,
  recorderBitrate
} from "~/utils/screenRecorder";

/**
 * The recording engine: composites the display, an optional movable webcam
 * picture-in-picture, and burned-in annotations onto a canvas, mixes
 * microphone/tab audio through a Web Audio graph, and encodes the result with
 * MediaRecorder. Sources (screen, camera, audio) can be swapped mid-session
 * without replacing the recorded tracks. Everything stays on the device.
 */
export function useScreenRecorder() {
  function createSession(options: RecorderSessionOptions): RecorderSession {
    const { canvas, resolution, frameRate, live } = options;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) throw new Error("Could not create the recording canvas.");
    const ctx = canvasContext;

    const displayVideo = document.createElement("video");
    displayVideo.muted = true;
    displayVideo.playsInline = true;

    let displayStream: MediaStream | null = null;
    let displayTrack: MediaStreamTrack | null = null;
    let hasDisplay = false;

    let cameraVideo: HTMLVideoElement | null = null;
    let overlayEnabled = options.overlay.enabled;

    let frameHandle: number | null = null;
    let paused = false;
    let stopped = false;
    let disposed = false;
    let recorder: MediaRecorder | null = null;
    let audioContext: AudioContext | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    const audioSourceNodes = new Map<MediaStream, MediaStreamAudioSourceNode>();
    const chunks: Blob[] = [];
    let stopResolve: ((blob: Blob) => void) | null = null;
    let stopReject: ((error: Error) => void) | null = null;

    function awaitPlayable(video: HTMLVideoElement): Promise<void> {
      if (video.readyState >= 2) return Promise.resolve();
      return new Promise<void>((resolve) => {
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
      void video.play().catch(() => undefined);
      void awaitPlayable(video).then(() => {
        if (cameraVideo === video && video.videoWidth > 0 && video.videoHeight > 0) {
          if (!hasDisplay) sizeCanvasFromCamera();
        }
      });
      cameraVideo = video;
    }

    function targetHeightFor(sourceHeight: number): number {
      return resolution === "1080p" ? 1080 : resolution === "720p" ? 720 : sourceHeight;
    }

    function sizeCanvasFromDisplay(): void {
      const height = targetHeightFor(displayVideo.videoHeight || 720);
      const scale = displayVideo.videoHeight ? height / displayVideo.videoHeight : 1;
      canvas.width = Math.max(2, Math.round((displayVideo.videoWidth || 1280) * scale));
      canvas.height = Math.max(2, height);
    }

    function sizeCanvasFromCamera(): void {
      if (hasDisplay || !cameraVideo) return;
      const camH = cameraVideo.videoHeight || 720;
      const camW = cameraVideo.videoWidth || 1280;
      const height = targetHeightFor(camH);
      const scale = camH ? height / camH : 1;
      canvas.width = Math.max(2, Math.round(camW * scale));
      canvas.height = Math.max(2, height);
    }

    async function bindDisplay(stream: MediaStream | null): Promise<void> {
      if (displayTrack) displayTrack.removeEventListener("ended", onScreenEnded);
      if (displayStream && displayStream !== stream) {
        for (const track of displayStream.getVideoTracks()) track.stop();
      }
      displayStream = stream;
      hasDisplay = stream !== null;
      if (!stream) {
        displayVideo.srcObject = null;
        displayTrack = null;
        sizeCanvasFromCamera();
        return;
      }
      displayVideo.srcObject = stream;
      void displayVideo.play().catch(() => undefined);
      displayTrack = stream.getVideoTracks()[0] ?? null;
      if (displayTrack) displayTrack.addEventListener("ended", onScreenEnded);
      await awaitPlayable(displayVideo);
      sizeCanvasFromDisplay();
    }

    function ensureAudioGraph(): MediaStreamAudioDestinationNode {
      if (!audioContext) audioContext = new AudioContext();
      if (audioContext.state === "suspended") void audioContext.resume();
      if (!audioDestination) audioDestination = audioContext.createMediaStreamDestination();
      return audioDestination;
    }

    function connectAudioSource(stream: MediaStream | null): void {
      if (!stream || audioSourceNodes.has(stream)) return;
      if (stream.getAudioTracks().length === 0) return;
      const destination = ensureAudioGraph();
      const node = audioContext!.createMediaStreamSource(stream);
      node.connect(destination);
      audioSourceNodes.set(stream, node);
    }

    function setAudioSources(sources: {
      micStream: MediaStream | null;
      tabStream: MediaStream | null;
    }): void {
      const wanted = new Set(
        [sources.micStream, sources.tabStream].filter((s): s is MediaStream => s !== null)
      );
      for (const [stream, node] of audioSourceNodes) {
        if (!wanted.has(stream)) {
          node.disconnect();
          audioSourceNodes.delete(stream);
        }
      }
      for (const stream of wanted) connectAudioSource(stream);
    }

    function draw(): void {
      if (paused || disposed) return;
      frameHandle = requestAnimationFrame(draw);

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (hasDisplay && displayVideo.readyState >= 2) {
        ctx.drawImage(displayVideo, 0, 0, canvas.width, canvas.height);
      } else if (!hasDisplay && cameraVideo && cameraVideo.readyState >= 2) {
        // Camera-only: the webcam fills the whole frame.
        drawVideoCover(ctx, cameraVideo, 0, 0, canvas.width, canvas.height);
      }

      // Webcam picture-in-picture only makes sense when a screen is the base.
      if (hasDisplay && overlayEnabled && cameraVideo && cameraVideo.readyState >= 2) {
        const rect = denormalizeRect(live.overlayRect(), canvas.width, canvas.height);
        ctx.save();
        applyShapeClip(ctx, live.overlayShape(), rect.x, rect.y, rect.width, rect.height);
        drawVideoCover(ctx, cameraVideo, rect.x, rect.y, rect.width, rect.height);
        ctx.restore();
      }

      for (const stroke of live.annotations()) {
        drawAnnotation(ctx, stroke, canvas.width, canvas.height);
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

      await bindDisplay(options.displayStream);
      if (options.cameraStream) bindCamera(options.cameraStream);
      if (!hasDisplay && cameraVideo) {
        await awaitPlayable(cameraVideo);
        sizeCanvasFromCamera();
      }
      if (canvas.width < 2 || canvas.height < 2) {
        canvas.width = 1280;
        canvas.height = 720;
      }

      setAudioSources({ micStream: options.micStream, tabStream: options.tabStream });
      const audioTrack = audioDestination?.stream.getAudioTracks()[0] ?? null;

      // Prime the first frame before capturing so the stream never starts black.
      draw();

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

      recorder.start(1000);
    }

    function onScreenEnded(): void {
      if (!stopped && !disposed) options.onScreenEnded();
    }

    const ready = start().catch((error) => {
      dispose();
      throw error instanceof Error ? error : new Error("Could not start the recorder.");
    });

    async function capturePoster(): Promise<Blob | null> {
      try {
        return await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7);
        });
      } catch {
        return null;
      }
    }

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
      // The store owns the camera/mic streams and releases them separately; the
      // engine only owns the display capture (which it may have swapped).
      if (displayStream) {
        for (const track of displayStream.getTracks()) track.stop();
      }
      if (options.tabStream && options.tabStream !== displayStream) {
        for (const track of options.tabStream.getTracks()) track.stop();
      }
      if (cameraVideo) cameraVideo.srcObject = null;
      displayVideo.srcObject = null;
      for (const node of audioSourceNodes.values()) node.disconnect();
      audioSourceNodes.clear();
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
      setDisplayStream(stream: MediaStream | null): void {
        void bindDisplay(stream);
      },
      setAudioSources,
      capturePoster,
      dispose
    };
  }

  return { createSession };
}
