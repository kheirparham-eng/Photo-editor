export interface HSLChannel {
  hue: number; // -100 to +100
  saturation: number; // -100 to +100
  luminance: number; // -100 to +100
}

export interface HSLState {
  red: HSLChannel;
  orange: HSLChannel;
  yellow: HSLChannel;
  green: HSLChannel;
  aqua: HSLChannel;
  blue: HSLChannel;
  purple: HSLChannel;
  magenta: HSLChannel;
}

export interface ColorWheelVal {
  hue: number; // 0 to 360
  saturation: number; // 0 to 100
  luminance: number; // -100 to +100
}

export interface ColorGradingState {
  shadows: ColorWheelVal;
  midtones: ColorWheelVal;
  highlights: ColorWheelVal;
  blending: number; // 0 to 100
  balance: number; // -100 to +100
}

export interface CurvePoint {
  x: number; // 0 to 255
  y: number; // 0 to 255
}

export interface ToneCurveChannel {
  points: CurvePoint[];
}

export interface ToneCurveState {
  master: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export interface CropState {
  aspectRatio: 'free' | 'original' | '1:1' | '4:5' | '3:2' | '16:9' | '9:16' | '4:3';
  rotation: number; // -180 to 180 degrees
  flipH: boolean;
  flipV: boolean;
  x: number; // 0 to 1 relative crop start
  y: number; // 0 to 1 relative crop start
  width: number; // 0 to 1 relative width
  height: number; // 0 to 1 relative height
}

export interface PhotoAdjustments {
  // Light
  exposure: number; // -5 to +5 EV
  contrast: number; // -100 to +100
  highlights: number; // -100 to +100
  shadows: number; // -100 to +100
  whites: number; // -100 to +100
  blacks: number; // -100 to +100

  // Color & White Balance
  temp: number; // 2000 to 10000 K (or normalized -100 to +100 for display, internally mapped)
  tint: number; // -100 to +100
  vibrance: number; // -100 to +100
  saturation: number; // -100 to +100

  // HSL Mixer
  hsl: HSLState;

  // Color Grading
  colorGrading: ColorGradingState;

  // Tone Curve
  toneCurve: ToneCurveState;

  // Effects & Detail
  clarity: number; // -100 to +100
  texture: number; // -100 to +100
  dehaze: number; // -100 to +100
  vignette: number; // -100 to +100
  sharpening: number; // 0 to 100
  grain: number; // 0 to 100

  // Crop & Geometry
  crop: CropState;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  label: string;
  adjustments: PhotoAdjustments;
}

export type PresetCategory =
  | 'Mood & Atmosphere'
  | 'Specialty & Film Stocks'
  | 'Cinematic & Film'
  | 'Subject-Focused'
  | 'Vintage & Analog Film'
  | 'Modern Cinematic Tones'
  | 'Portrait & Skin Retouching'
  | 'Nature & Landscape'
  | 'B&W Fine Art'
  | 'Social & Lifestyle'
  | 'Built-in'
  | 'User';

export type LiquidGlassTheme = 'cosmic-dark' | 'polar-light' | 'sunset-aurora';

export interface Preset {
  id: string;
  name: string;
  category: PresetCategory;
  description?: string;
  thumbnailUrl?: string;
  adjustments: Partial<PhotoAdjustments>;
}

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  l: number[];
  maxVal: number;
  hasHighlightClipping: boolean;
  hasShadowClipping: boolean;
}

export interface ImageInfo {
  name: string;
  width: number;
  height: number;
  fileSize?: string;
  type?: string;
}

export type ViewMode = 'single' | 'before-after-split' | 'before-after-side';

export type ActiveTool = 'edit' | 'crop' | 'curve' | 'preset' | 'history';
