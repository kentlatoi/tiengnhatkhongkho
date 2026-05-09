import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatFileSize, downloadFile } from '../../services/fileService';

const SPEEDS = [0.75, 1, 1.25, 1.5];
const BAR_COUNT = 24;

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ file, onClose, toast }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showVolume, setShowVolume] = useState(false);

  const isVideo = file?.mime?.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(file?.type);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  }, []);

  const seek = useCallback((e) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * duration;
  }, [duration]);

  const changeSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [speed]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
    };
  }, [file]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (!file) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="rounded-2xl overflow-hidden bg-gradient-to-br from-surface-50 to-primary-50/30 dark:from-surface-800 dark:to-primary-900/20 border border-surface-200 dark:border-surface-700 shadow-xl"
      >
        {/* Hidden media element */}
        {isVideo ? (
          <video
            ref={audioRef}
            src={file.dataUrl}
            className="w-full max-h-64 rounded-t-2xl bg-black"
            playsInline
          />
        ) : (
          <audio ref={audioRef} src={file.dataUrl} preload="metadata" />
        )}

        {/* Waveform visualizer (audio only) */}
        {!isVideo && (
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="flex items-end justify-center gap-[3px] h-16 sm:h-20 mb-2">
              {Array.from({ length: BAR_COUNT }).map((_, i) => {
                const isActive = progress > (i / BAR_COUNT) * 100;
                return (
                  <motion.div
                    key={i}
                    className={`w-1.5 sm:w-2 rounded-full transition-colors duration-300 ${
                      isActive
                        ? 'bg-primary-500 dark:bg-primary-400'
                        : 'bg-surface-300 dark:bg-surface-600'
                    }`}
                    animate={playing ? {
                      height: [
                        `${20 + Math.sin(i * 0.8 + currentTime * 3) * 30 + Math.random() * 20}%`,
                        `${30 + Math.cos(i * 0.6 + currentTime * 2) * 35 + Math.random() * 15}%`,
                        `${15 + Math.sin(i * 0.9 + currentTime * 4) * 25 + Math.random() * 25}%`,
                      ],
                    } : { height: `${20 + Math.sin(i * 0.5) * 15}%` }}
                    transition={playing ? {
                      duration: 0.4 + Math.random() * 0.3,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut',
                    } : { duration: 0.5 }}
                  />
                );
              })}
            </div>

            {/* Pulsing recording indicator */}
            <AnimatePresence>
              {playing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 mb-2"
                >
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full bg-primary-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400">Đang phát</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* File info */}
        <div className="px-4 sm:px-6 py-2">
          <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{file.name}</p>
          <p className="text-xs text-surface-400">{formatFileSize(file.size)} · {(file.type || '').toUpperCase()}</p>
        </div>

        {/* Progress bar */}
        <div className="px-4 sm:px-6">
          <div
            className="relative h-2 bg-surface-200 dark:bg-surface-700 rounded-full cursor-pointer group"
            onClick={seek}
          >
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-surface-400 tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-[10px] text-surface-400 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
          <div className="flex items-center justify-between gap-2">
            {/* Speed */}
            <button
              onClick={changeSpeed}
              className="px-2.5 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-700 text-xs font-bold text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors cursor-pointer min-w-[3rem]"
            >
              {speed}x
            </button>

            {/* Main controls */}
            <div className="flex items-center gap-3">
              {/* Rewind 10s */}
              <button
                onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer text-sm"
                title="-10s"
              >
                ⏪
              </button>

              {/* Play/Pause */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/30 hover:shadow-xl cursor-pointer"
              >
                <motion.span
                  key={playing ? 'pause' : 'play'}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="text-xl sm:text-2xl"
                >
                  {playing ? '⏸' : '▶️'}
                </motion.span>
              </motion.button>

              {/* Forward 10s */}
              <button
                onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer text-sm"
                title="+10s"
              >
                ⏩
              </button>
            </div>

            {/* Right controls: volume + download */}
            <div className="flex items-center gap-1">
              {/* Volume */}
              <div className="relative">
                <button
                  onClick={() => setShowVolume(v => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer text-sm"
                >
                  {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <AnimatePresence>
                  {showVolume && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-12 left-1/2 -translate-x-1/2 w-10 h-28 bg-white dark:bg-surface-800 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 p-2 flex flex-col items-center z-10"
                    >
                      <input
                        type="range"
                        min="0" max="1" step="0.05"
                        value={volume}
                        onChange={e => setVolume(parseFloat(e.target.value))}
                        className="h-full cursor-pointer accent-primary-500"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '20px' }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Download */}
              <button
                onClick={() => downloadFile(file, toast)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer text-sm"
                title="Tải xuống"
              >
                ⬇️
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
