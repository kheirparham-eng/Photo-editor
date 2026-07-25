import React, { useRef } from 'react';
import { ViewMode, LiquidGlassTheme } from '../types/editor';
import {
  Upload,
  Undo2,
  Redo2,
  RotateCcw,
  SplitSquareVertical,
  Columns2,
  Square,
  ZoomIn,
  ZoomOut,
  Download,
  Eye,
  Sun,
  Moon,
  Sparkles,
  Flame,
} from 'lucide-react';

interface HeaderProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRevert: () => void;

  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;

  zoom: number;
  onChangeZoom: (zoom: number) => void;
  onFitZoom: () => void;

  isComparing: boolean;
  onStartCompare: () => void;
  onEndCompare: () => void;

  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenExportModal: () => void;

  theme: LiquidGlassTheme;
  onChangeTheme: (theme: LiquidGlassTheme) => void;
}

export const Header: React.FC<HeaderProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRevert,

  viewMode,
  onChangeViewMode,

  zoom,
  onChangeZoom,
  onFitZoom,

  isComparing,
  onStartCompare,
  onEndCompare,

  onFileUpload,
  onOpenExportModal,

  theme,
  onChangeTheme,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="ios-glass-bar flex h-14 w-full items-center justify-between px-4 select-none z-30 shrink-0 relative transition-colors duration-300">
      {/* App Branding & Open File */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 text-xs font-black text-white shadow-xl shadow-blue-500/40 border border-white/40 overflow-hidden">
            <span className="relative z-10 drop-shadow">Lr</span>
            {/* Top Glossy Highlight */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xs tracking-wider uppercase leading-none opacity-95">
              Lumina <span className="text-blue-400 font-extrabold drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]">Studio</span>
            </span>
            <span className="text-[9px] font-mono opacity-60 tracking-tight">
              iPhone Liquid Glass Pro
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-white/20 mx-1" />

        {/* Upload Button */}
        <label className="ios-glass-button flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer text-white shadow-md active:scale-95">
          <Upload className="h-3.5 w-3.5 text-blue-400 drop-shadow" />
          <span className="drop-shadow-sm">Open Image</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Center Controls: Undo/Redo, View Mode, Compare */}
      <div className="flex items-center gap-3">
        {/* Undo / Redo / Revert */}
        <div className="flex items-center rounded-full bg-black/20 border border-white/15 p-1 backdrop-blur-md shadow-inner">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="rounded-full p-1.5 text-neutral-300 hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="rounded-full p-1.5 text-neutral-300 hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-3.5 w-px bg-white/15" />
          <button
            onClick={onRevert}
            title="Revert to Original"
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-neutral-300 hover:bg-white/15 hover:text-blue-400 transition-all active:scale-95"
          >
            <RotateCcw className="h-3 w-3" />
            Revert
          </button>
        </div>

        {/* Before / After View Mode Toggles */}
        <div className="flex items-center rounded-full bg-black/30 border border-white/20 p-1 backdrop-blur-xl shadow-inner">
          <button
            onClick={() => onChangeViewMode('single')}
            title="Single View"
            className={`rounded-full p-1.5 text-xs font-bold transition-all active:scale-90 ${
              viewMode === 'single'
                ? 'ios-glossy-blue text-white font-extrabold shadow-lg shadow-blue-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeViewMode('before-after-split')}
            title="Split-Screen Before / After"
            className={`rounded-full p-1.5 text-xs font-bold transition-all active:scale-90 ${
              viewMode === 'before-after-split'
                ? 'ios-glossy-blue text-white font-extrabold shadow-lg shadow-blue-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <SplitSquareVertical className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeViewMode('before-after-side')}
            title="Side-by-Side Before / After"
            className={`rounded-full p-1.5 text-xs font-bold transition-all active:scale-90 ${
              viewMode === 'before-after-side'
                ? 'ios-glossy-blue text-white font-extrabold shadow-lg shadow-blue-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Hold-to-Compare Button */}
        <button
          onMouseDown={onStartCompare}
          onMouseUp={onEndCompare}
          onMouseLeave={onEndCompare}
          onTouchStart={onStartCompare}
          onTouchEnd={onEndCompare}
          title="Hold to Compare Original (\)"
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all active:scale-95 ${
            isComparing
              ? 'ios-glossy-blue text-white shadow-xl shadow-blue-500/50'
              : 'ios-glass-button text-neutral-200 hover:text-white'
          }`}
        >
          <Eye className="h-3.5 w-3.5 text-blue-400 drop-shadow" />
          <span>Compare</span>
        </button>
      </div>

      {/* Right Controls: Theme Switcher, Zoom & Export */}
      <div className="flex items-center gap-3">
        {/* Liquid Glass 3-Theme Selector */}
        <div className="flex items-center rounded-full bg-black/30 border border-white/20 p-1 backdrop-blur-xl shadow-inner gap-1">
          <button
            onClick={() => onChangeTheme('cosmic-dark')}
            title="Liquid Glass: Cosmic Dark (Studio Default)"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-all cursor-pointer active:scale-95 ${
              theme === 'cosmic-dark'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/40 border border-white/30'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Moon className="h-3 w-3 text-cyan-300 drop-shadow shrink-0" />
            <span className="hidden sm:inline">Cosmic</span>
          </button>

          <button
            onClick={() => onChangeTheme('polar-light')}
            title="Liquid Glass: Polar Light (Daylight Mode)"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-all cursor-pointer active:scale-95 ${
              theme === 'polar-light'
                ? 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white shadow-md shadow-sky-500/40 border border-white/40'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sun className="h-3 w-3 text-amber-300 drop-shadow shrink-0" />
            <span className="hidden sm:inline">Polar</span>
          </button>

          <button
            onClick={() => onChangeTheme('sunset-aurora')}
            title="Liquid Glass: Sunset Aurora (Vibrant & Warm)"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-all cursor-pointer active:scale-95 ${
              theme === 'sunset-aurora'
                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white shadow-md shadow-rose-500/40 border border-white/30'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Flame className="h-3 w-3 text-amber-200 drop-shadow shrink-0" />
            <span className="hidden sm:inline">Sunset</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 rounded-full bg-black/30 border border-white/20 px-3 py-1 text-xs font-mono text-neutral-300 backdrop-blur-xl shadow-inner">
          <button
            onClick={() => onChangeZoom(Math.max(0.1, zoom - 0.25))}
            title="Zoom Out"
            className="p-1 hover:text-white transition-colors active:scale-90"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <span className="w-12 text-center font-extrabold text-blue-400 drop-shadow">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => onChangeZoom(Math.min(4.0, zoom + 0.25))}
            title="Zoom In"
            className="p-1 hover:text-white transition-colors active:scale-90"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onFitZoom}
            title="Fit to Screen"
            className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-neutral-200 hover:text-white hover:bg-white/25 transition-all active:scale-95 border border-white/20"
          >
            Fit
          </button>
        </div>

        {/* Export Button */}
        <button
          onClick={onOpenExportModal}
          className="ios-glossy-blue flex items-center gap-1.5 rounded-full text-white px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 drop-shadow" />
          <span className="drop-shadow">Export</span>
        </button>
      </div>
    </header>
  );
};
