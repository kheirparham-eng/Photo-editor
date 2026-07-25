/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhotoAdjustments,
  HistoryItem,
  Preset,
  HistogramData,
  ImageInfo,
  ViewMode,
  LiquidGlassTheme,
} from './types/editor';
import {
  createDefaultAdjustments,
  BUILT_IN_PRESETS,
  blendPresetAdjustments,
} from './lib/presets';
import { SAMPLE_PHOTOS, SamplePhoto } from './lib/sampleImages';
import { WebGLPhotoRenderer } from './lib/webgl/renderer';
import { createDownsampledImage } from './lib/utils/downsample';
import { generatePresetThumbnails } from './lib/webgl/thumbnailGenerator';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { CenterViewport } from './components/CenterViewport';
import { ExportModal } from './components/ExportModal';

const CUSTOM_PRESETS_STORAGE_KEY = 'lightroom_studio_custom_presets';

export default function App() {
  // Theme State: 3 Liquid Glass Themes (Cosmic Dark, Polar Light, Sunset Aurora)
  const [theme, setTheme] = useState<LiquidGlassTheme>('cosmic-dark');

  // Image Source State (Full-Res vs Downsampled Preview)
  const [fullResImageSource, setFullResImageSource] = useState<HTMLImageElement | null>(null);
  const [previewImageSource, setPreviewImageSource] = useState<HTMLCanvasElement | HTMLImageElement | null>(null);

  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(SAMPLE_PHOTOS[0].id);

  // Photo Adjustments State
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>(createDefaultAdjustments());
  const [baseAdjustments, setBaseAdjustments] = useState<PhotoAdjustments>(createDefaultAdjustments());

  // History Timeline Stack
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 'init',
      timestamp: Date.now(),
      label: 'Initial State',
      adjustments: createDefaultAdjustments(),
    },
  ]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

  // Presets State (Built-In + LocalStorage User Presets)
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      if (saved) {
        const custom: Preset[] = JSON.parse(saved);
        return [...BUILT_IN_PRESETS, ...custom];
      }
    } catch (e) {
      console.warn('Failed to parse custom presets:', e);
    }
    return BUILT_IN_PRESETS;
  });

  const [activePresetId, setActivePresetId] = useState<string | null>('preset-original');
  const [activePresetObj, setActivePresetObj] = useState<Preset | null>(null);
  const [presetIntensity, setPresetIntensity] = useState<number>(100);
  const [presetThumbnails, setPresetThumbnails] = useState<Record<string, string>>({});

  // Histogram Data
  const [histogramData, setHistogramData] = useState<HistogramData>({
    r: new Array(256).fill(0),
    g: new Array(256).fill(0),
    b: new Array(256).fill(0),
    l: new Array(256).fill(0),
    maxVal: 1,
    hasHighlightClipping: false,
    hasShadowClipping: false,
  });

  const [showHighlightClipping, setShowHighlightClipping] = useState(false);
  const [showShadowClipping, setShowShadowClipping] = useState(false);

  // Viewport & Zoom
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [zoom, setZoom] = useState(1.0);
  const [isComparing, setIsComparing] = useState(false);

  // Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // WebGL Renderer Reference
  const rendererRef = useRef<WebGLPhotoRenderer | null>(null);

  // Generate Preset Thumbnails whenever previewImageSource or presets change
  useEffect(() => {
    if (previewImageSource) {
      generatePresetThumbnails(previewImageSource, presets).then((thumbs) => {
        setPresetThumbnails(thumbs);
      });
    }
  }, [previewImageSource, presets]);

  // Load Initial Default Sample Photo
  useEffect(() => {
    loadPhotoFromUrl(SAMPLE_PHOTOS[0].url, SAMPLE_PHOTOS[0].title);
  }, []);

  // Reference to current active Blob URL for cleanup
  const currentBlobUrlRef = useRef<string | null>(null);
  const historyDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to load image from URL
  const loadPhotoFromUrl = (url: string, name: string) => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    const img = new Image();
    if (url.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      setFullResImageSource(img);
      const downsampled = createDownsampledImage(img, 2048);
      setPreviewImageSource(downsampled);

      setImageInfo({
        name,
        width: img.naturalWidth || img.width || 1920,
        height: img.naturalHeight || img.height || 1080,
        type: 'image/jpeg',
      });

      const defaultAdj = createDefaultAdjustments();
      setBaseAdjustments(defaultAdj);
      setAdjustments(defaultAdj);
      setHistory([
        {
          id: `init-${Date.now()}`,
          timestamp: Date.now(),
          label: 'Imported Photo',
          adjustments: defaultAdj,
        },
      ]);
      setCurrentHistoryIndex(0);
      setActivePresetId('preset-original');
      setActivePresetObj(null);
      setPresetIntensity(100);
      setZoom(1.0);
    };
    img.onerror = (err) => {
      console.error('Failed to load image URL:', err);
    };
    img.src = url;
  };

  // Helper to load image from local File object
  const handleLoadFile = (file: File) => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
    }
    const blobUrl = URL.createObjectURL(file);
    currentBlobUrlRef.current = blobUrl;

    const img = new Image();
    img.onload = () => {
      setFullResImageSource(img);
      const downsampled = createDownsampledImage(img, 2048);
      setPreviewImageSource(downsampled);

      setImageInfo({
        name: file.name,
        width: img.naturalWidth || img.width || 1920,
        height: img.naturalHeight || img.height || 1080,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type,
      });
      setActiveSampleId(null);

      const defaultAdj = createDefaultAdjustments();
      setBaseAdjustments(defaultAdj);
      setAdjustments(defaultAdj);
      setHistory([
        {
          id: `init-${Date.now()}`,
          timestamp: Date.now(),
          label: 'Opened Local File',
          adjustments: defaultAdj,
        },
      ]);
      setCurrentHistoryIndex(0);
      setActivePresetId('preset-original');
      setActivePresetObj(null);
      setPresetIntensity(100);
      setZoom(1.0);
    };
    img.onerror = (err) => {
      console.error('Failed to load local file image:', err);
    };
    img.src = blobUrl;
  };

  // Adjustments Update Handler with History Stack Logging (Debounced history logging)
  const handleAdjustmentsChange = useCallback(
    (newAdj: PhotoAdjustments, actionLabel = 'Adjustment') => {
      // Immediate 60fps canvas render update
      setBaseAdjustments(newAdj);
      if (activePresetObj) {
        const blended = blendPresetAdjustments(newAdj, activePresetObj.adjustments, presetIntensity);
        setAdjustments(blended);
      } else {
        setAdjustments(newAdj);
      }

      // Debounce history timeline entries so slider dragging doesn't flood history
      if (historyDebounceRef.current) {
        clearTimeout(historyDebounceRef.current);
      }

      historyDebounceRef.current = setTimeout(() => {
        const newHistoryItem: HistoryItem = {
          id: `hist-${Date.now()}`,
          timestamp: Date.now(),
          label: actionLabel,
          adjustments: newAdj,
        };

        setHistory((prev) => {
          const sliced = prev.slice(0, currentHistoryIndex + 1);
          return [...sliced, newHistoryItem];
        });
        setCurrentHistoryIndex((prev) => prev + 1);
      }, 300);
    },
    [currentHistoryIndex, activePresetObj, presetIntensity]
  );

  // Preset Selection & Blending Handlers
  const handleSelectPreset = (preset: Preset) => {
    setActivePresetId(preset.id);
    setActivePresetObj(preset.id === 'preset-original' ? null : preset);
    setPresetIntensity(100);

    const merged = blendPresetAdjustments(baseAdjustments, preset.adjustments, 100);
    setAdjustments(merged);

    const newHistoryItem: HistoryItem = {
      id: `preset-${Date.now()}`,
      timestamp: Date.now(),
      label: `Preset: ${preset.name}`,
      adjustments: merged,
    };

    setHistory((prev) => [...prev.slice(0, currentHistoryIndex + 1), newHistoryItem]);
    setCurrentHistoryIndex((prev) => prev + 1);
  };

  const handlePresetIntensityChange = (intensity: number) => {
    setPresetIntensity(intensity);
    if (activePresetObj) {
      const blended = blendPresetAdjustments(baseAdjustments, activePresetObj.adjustments, intensity);
      setAdjustments(blended);
    }
  };

  // Undo / Redo Handlers
  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      const nextIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(nextIndex);
      setAdjustments(history[nextIndex].adjustments);
      setBaseAdjustments(history[nextIndex].adjustments);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < history.length - 1) {
      const nextIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(nextIndex);
      setAdjustments(history[nextIndex].adjustments);
      setBaseAdjustments(history[nextIndex].adjustments);
    }
  };

  const handleRevertToOriginal = () => {
    const defaultAdj = createDefaultAdjustments();
    handleAdjustmentsChange(defaultAdj, 'Revert to Original');
    setActivePresetId('preset-original');
    setActivePresetObj(null);
  };

  const handleSaveCustomPreset = (name: string) => {
    const newPreset: Preset = {
      id: `user-preset-${Date.now()}`,
      name,
      category: 'User',
      description: 'Custom user preset',
      adjustments: { ...adjustments },
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    setActivePresetId(newPreset.id);
    setActivePresetObj(newPreset);

    const userOnly = updatedPresets.filter((p) => p.category === 'User');
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(userOnly));
  };

  const handleDeleteCustomPreset = (id: string) => {
    const updatedPresets = presets.filter((p) => p.id !== id);
    setPresets(updatedPresets);
    const userOnly = updatedPresets.filter((p) => p.category === 'User');
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(userOnly));
  };

  const handleExportPresetJSON = () => {
    const jsonStr = JSON.stringify(adjustments, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lightroom_preset_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPresetJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        const merged: PhotoAdjustments = {
          ...createDefaultAdjustments(),
          ...imported,
        };
        setAdjustments(merged);
        setBaseAdjustments(merged);
        handleAdjustmentsChange(merged, `Imported JSON: ${file.name}`);
      } catch (err) {
        alert('Invalid preset JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      } else if (e.key === '\\') {
        setIsComparing(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === '\\') {
        setIsComparing(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentHistoryIndex, history]);

  // Render Frame Callback -> Set Histogram Data
  const handleRenderFrame = useCallback((data?: HistogramData) => {
    if (data) {
      setHistogramData(data);
    }
  }, []);

  return (
    <div
      className={`flex h-screen w-screen flex-col overflow-hidden font-sans antialiased select-none ios-spring relative theme-${theme}`}
    >
      {/* Ambient Liquid Mesh Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute inset-0 animate-liquid-mesh opacity-90 transition-all duration-700"
          style={{ background: 'var(--mesh-base)' }}
        />
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-40 animate-pulse pointer-events-none"
          style={{ background: 'var(--mesh-bg-1)' }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] rounded-full blur-[140px] opacity-35 animate-pulse pointer-events-none"
          style={{ background: 'var(--mesh-bg-2)' }}
        />
      </div>

      {/* Top Header Navigation Bar */}
      <Header
        canUndo={currentHistoryIndex > 0}
        canRedo={currentHistoryIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRevert={handleRevertToOriginal}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        zoom={zoom}
        onChangeZoom={setZoom}
        onFitZoom={() => setZoom(1.0)}
        isComparing={isComparing}
        onStartCompare={() => setIsComparing(true)}
        onEndCompare={() => setIsComparing(false)}
        onFileUpload={(e) => {
          if (e.target.files?.[0]) handleLoadFile(e.target.files[0]);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        theme={theme}
        onChangeTheme={setTheme}
      />

      {/* Main Studio Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <LeftSidebar
          histogramData={histogramData}
          showHighlightClipping={showHighlightClipping}
          showShadowClipping={showShadowClipping}
          onToggleHighlightClipping={() => setShowHighlightClipping(!showHighlightClipping)}
          onToggleShadowClipping={() => setShowShadowClipping(!showShadowClipping)}
          presets={presets}
          activePresetId={activePresetId}
          presetIntensity={presetIntensity}
          onPresetIntensityChange={handlePresetIntensityChange}
          presetThumbnails={presetThumbnails}
          onSelectPreset={handleSelectPreset}
          onImportPresetJSON={handleImportPresetJSON}
          onExportCurrentPresetJSON={handleExportPresetJSON}
          onSaveCustomPreset={handleSaveCustomPreset}
          onDeleteCustomPreset={handleDeleteCustomPreset}
          history={history}
          currentHistoryIndex={currentHistoryIndex}
          onSelectHistoryItem={(idx) => {
            setCurrentHistoryIndex(idx);
            setAdjustments(history[idx].adjustments);
            setBaseAdjustments(history[idx].adjustments);
          }}
          imageInfo={imageInfo}
          onSelectSamplePhoto={(sample: SamplePhoto) => {
            setActiveSampleId(sample.id);
            loadPhotoFromUrl(sample.url, sample.title);
          }}
          activeSampleId={activeSampleId}
        />

        {/* Center Viewport Canvas Workstation */}
        <CenterViewport
          imageSource={previewImageSource}
          adjustments={adjustments}
          viewMode={viewMode}
          zoom={zoom}
          onZoomChange={setZoom}
          isComparing={isComparing}
          onRendererReady={(renderer) => {
            rendererRef.current = renderer;
          }}
          onRenderFrame={handleRenderFrame}
          onDropImage={handleLoadFile}
          onViewModeChange={setViewMode}
          onCompareStart={() => setIsComparing(true)}
          onCompareEnd={() => setIsComparing(false)}
          onResetAll={handleRevertToOriginal}
        />

        {/* Right Sidebar */}
        <RightSidebar
          adjustments={adjustments}
          onChange={handleAdjustmentsChange}
          onResetAll={handleRevertToOriginal}
        />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        adjustments={adjustments}
        imageInfo={imageInfo}
        renderer={rendererRef.current}
        fullResImageSource={fullResImageSource}
      />
    </div>
  );
}
