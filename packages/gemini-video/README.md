# Gemini video browser pipeline

Immutable browser source snapshot from [GargantuaX/gemini-watermark-remover](https://github.com/GargantuaX/gemini-watermark-remover/tree/13195610a5b534d69adfa169b1011981c9b6f499), revision `13195610a5b534d69adfa169b1011981c9b6f499` (1.0.45). The 17 files under `vendor/` are copied verbatim, including embedded generated alpha maps. Do not hand-edit them. Update by copying the dependency closure of videoExport, videoPresetPolicy, videoDenoiseRuntimePolicy and allenkFdncnnOnnxRuntime from a reviewed upstream revision. New application code is TypeScript; declarations here document the browser boundary missing from the published Node video SDK.

The upstream MIT license is retained in LICENSE. FDnCNN weights in `apps/web/public/models/gemini-video/` are copied from upstream's `public/models/allenk-fdncnn/`. They originate from allenk/GeminiWatermarkTool (MIT); see the accompanying license.

Dependencies are pinned separately from Ono Toolkit's image ONNX runtime. Models are fetched only when needed; ONNX WASM runs with one thread inside a dedicated worker, without cross-origin isolation requirements.
