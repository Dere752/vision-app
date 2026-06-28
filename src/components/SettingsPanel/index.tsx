import React, { memo } from 'react';
import type { AppSettings, ModelInfo } from '../../types';
import { MODELS } from '../../config/app';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  currentModel: ModelInfo;
  onChangeModel: (m: ModelInfo) => void;
}

function SliderRow({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <label className="text-white/60 text-xs font-medium">{label}</label>
        <span className="text-white/80 text-xs font-mono">{value}{unit ?? ''}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
        style={{ background: `linear-gradient(to right, #3b82f6 ${((value-min)/(max-min))*100}%, rgba(255,255,255,0.12) 0%)` }}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-white/70 text-sm">{label}</div>
        {description && <div className="text-white/30 text-xs">{description}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${
          checked ? 'bg-blue-600' : 'bg-white/15'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export const SettingsPanel = memo(function SettingsPanel({
  isOpen, onClose, settings, onChange, currentModel, onChangeModel,
}: SettingsPanelProps) {
  const s = settings;
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    onChange({ ...s, [k]: v });

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="absolute inset-0 z-30 bg-black/40"
          onClick={onClose}
          style={{ backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Drawer */}
      <div
        className="absolute top-0 right-0 h-full z-40 w-80 overflow-y-auto transition-transform duration-350"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          background: 'rgba(8,8,16,0.95)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-white text-base font-semibold">Settings</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/8 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <Section title="Model">
            <div className="space-y-2">
              {MODELS.map(m => (
                <button
                  key={m.name}
                  onClick={() => onChangeModel(m)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                    currentModel.name === m.name
                      ? 'border-blue-500/50 bg-blue-600/15 text-white'
                      : 'border-white/8 bg-white/4 text-white/60 hover:bg-white/8'
                  }`}
                >
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{m.description}</div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Detection">
            <SliderRow
              label="Confidence" value={Math.round(s.confidenceThreshold * 100)} min={10} max={95} step={5} unit="%"
              onChange={v => set('confidenceThreshold', v / 100)}
            />
            <SliderRow
              label="IoU Threshold" value={Math.round(s.iouThreshold * 100)} min={10} max={90} step={5} unit="%"
              onChange={v => set('iouThreshold', v / 100)}
            />
            <SliderRow
              label="FPS Limit" value={s.fpsLimit} min={5} max={60} step={5} unit=" fps"
              onChange={v => set('fpsLimit', v)}
            />
          </Section>

          <Section title="Tracking">
            <Toggle
              label="Object Tracking" checked={s.trackingEnabled} onChange={v => set('trackingEnabled', v)}
              description="Keeps IDs stable across frames"
            />
            <SliderRow
              label="Smoothing" value={Math.round(s.smoothingFactor * 100)} min={5} max={80} step={5} unit="%"
              onChange={v => set('smoothingFactor', v / 100)}
            />
          </Section>

          <Section title="Appearance">
            <Toggle label="Show Labels" checked={s.showLabels} onChange={v => set('showLabels', v)} />
            <Toggle label="Show Confidence" checked={s.showConfidence} onChange={v => set('showConfidence', v)} />
            <Toggle label="Show Track IDs" checked={s.showIds} onChange={v => set('showIds', v)} />
            <Toggle label="Scan Lines" checked={s.showScanLines} onChange={v => set('showScanLines', v)} description="Retro CRT effect" />
            <SliderRow
              label="Box Opacity" value={Math.round(s.boxOpacity * 100)} min={2} max={50} step={2} unit="%"
              onChange={v => set('boxOpacity', v / 100)}
            />
            <SliderRow
              label="Label Size" value={s.labelSize} min={9} max={20} step={1} unit="px"
              onChange={v => set('labelSize', v)}
            />
          </Section>
        </div>
      </div>
    </>
  );
});
