import React from 'react';
import { CropState } from '../types/editor';
import { SliderInput } from './SliderInput';
import { FlipHorizontal, FlipVertical, RotateCcw, Crop as CropIcon } from 'lucide-react';

interface CropPanelProps {
  crop: CropState;
  onChange: (crop: CropState) => void;
  onResetCrop: () => void;
}

const ASPECT_RATIOS: { label: string; value: CropState['aspectRatio'] }[] = [
  { label: 'Free', value: 'free' },
  { label: 'Original', value: 'original' },
  { label: '1 : 1', value: '1:1' },
  { label: '4 : 5', value: '4:5' },
  { label: '3 : 2', value: '3:2' },
  { label: '16 : 9', value: '16:9' },
  { label: '9 : 16', value: '9:16' },
  { label: '4 : 3', value: '4:3' },
];

export const CropPanel: React.FC<CropPanelProps> = ({ crop, onChange, onResetCrop }) => {
  const handleAspectChange = (ratio: CropState['aspectRatio']) => {
    onChange({
      ...crop,
      aspectRatio: ratio,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  };

  const handleRotationChange = (rotation: number) => {
    onChange({
      ...crop,
      rotation,
    });
  };

  const toggleFlipH = () => {
    onChange({
      ...crop,
      flipH: !crop.flipH,
    });
  };

  const toggleFlipV = () => {
    onChange({
      ...crop,
      flipV: !crop.flipV,
    });
  };

  return (
    <div className="space-y-3">
      {/* Aspect Ratio Selector */}
      <div className="rounded bg-[#1c1c1c] p-2 border border-[#2a2a2a]">
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-300">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-4 gap-1">
          {ASPECT_RATIOS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleAspectChange(value)}
              className={`rounded py-1 text-[10px] font-semibold transition-all cursor-pointer ${
                crop.aspectRatio === value
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'bg-[#252525] text-neutral-400 hover:bg-[#2e2e2e] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Rotation & Straighten Slider */}
      <div className="rounded bg-[#1c1c1c] p-2 border border-[#2a2a2a] space-y-2">
        <SliderInput
          label="Rotate / Straighten"
          value={crop.rotation}
          min={-180}
          max={180}
          defaultValue={0}
          unit="°"
          onChange={handleRotationChange}
          icon={<RotateCcw className="h-3 w-3" />}
        />

        {/* Flip Controls */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#2a2a2a]">
          <button
            onClick={toggleFlipH}
            className={`flex flex-1 items-center justify-center gap-1 rounded py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
              crop.flipH
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-[#252525] text-neutral-300 hover:bg-[#2e2e2e]'
            }`}
          >
            <FlipHorizontal className="h-3 w-3" />
            Flip Horiz
          </button>

          <button
            onClick={toggleFlipV}
            className={`flex flex-1 items-center justify-center gap-1 rounded py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
              crop.flipV
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-[#252525] text-neutral-300 hover:bg-[#2e2e2e]'
            }`}
          >
            <FlipVertical className="h-3 w-3" />
            Flip Vert
          </button>
        </div>
      </div>

      {/* Reset Geometry */}
      <button
        onClick={onResetCrop}
        className="w-full flex items-center justify-center gap-1 rounded border border-[#2a2a2a] bg-[#1c1c1c] py-1.5 text-[10px] font-bold text-neutral-400 hover:border-neutral-600 hover:text-blue-400 transition-colors cursor-pointer uppercase tracking-wider"
      >
        <CropIcon className="h-3 w-3" />
        Reset Crop & Geometry
      </button>
    </div>
  );
};
