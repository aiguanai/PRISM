'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, Sparkles, CheckCircle2, FileText, Shield, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
}

interface UploadAreaProps {
  onFileSelect?: (files: File[]) => void;
  onAnalyze?: (files: File[]) => void;
}


export function UploadArea({ onFileSelect, onAnalyze }: UploadAreaProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileObjects, setFileObjects] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget === e.target) setIsDragging(false); };
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const processFiles = (fileList: File[]) => {
    const newFiles = fileList.map((f) => ({ id: Math.random().toString(36), name: f.name, size: f.size, progress: 0 }));
    setFiles((prev) => [...prev, ...newFiles]);
    setFileObjects((prev) => [...prev, ...fileList]);
    onFileSelect?.(fileList);
    newFiles.forEach((file) => {
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 30;
        if (p >= 100) { p = 100; clearInterval(interval); }
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, progress: p } : f));
      }, 200);
    });
  };

  const removeFile = (id: string) => {
    const idx = files.findIndex(f => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (idx >= 0) setFileObjects((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAnalyze = () => { setIsAnalyzing(true); onAnalyze?.(fileObjects); };
  const allReady = files.length > 0 && files.every((f) => f.progress >= 100);

  const active = isDragging || isHovering;

  return (
    <div className="space-y-5">
      {/* ── Drop zone ── */}
      <motion.div
        className="relative rounded-3xl overflow-hidden cursor-pointer select-none"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onHoverStart={() => setIsHovering(true)}
        onHoverEnd={() => setIsHovering(false)}
        animate={{ scale: isDragging ? 1.015 : 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Animated gradient border */}
        <motion.div
          className="absolute inset-0 rounded-3xl"
          style={{ padding: 1.5, backgroundSize: '300% 300%' }}
          animate={{
            background: active
              ? 'linear-gradient(135deg, #004225, #2d6a4f, #c9a84c, #004225)'
              : 'linear-gradient(135deg, rgba(0,66,37,0.25), rgba(201,168,76,0.25), rgba(0,66,37,0.25))',
          }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute inset-[1.5px] rounded-3xl" style={{ background: active ? '#e8e4d8' : '#f4f1ea' }} />
        </motion.div>

        {/* Outer glow */}
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{
            boxShadow: active
              ? '0 0 60px rgba(0,66,37,0.2), 0 0 120px rgba(201,168,76,0.1)'
              : '0 0 0px transparent',
          }}
          transition={{ duration: 0.4 }}
        />

        {/* Ambient radial fill */}
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{
            background: active
              ? 'radial-gradient(ellipse at 50% 50%, rgba(0,66,37,0.06) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at 50% 50%, rgba(0,66,37,0.02) 0%, transparent 70%)',
          }}
          transition={{ duration: 0.4 }}
        />



        {/* Corner accent dots */}
        {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos, i) => (
          <motion.div
            key={i}
            className={`absolute ${pos} w-1.5 h-1.5 rounded-full pointer-events-none`}
            style={{ background: i % 2 === 0 ? '#004225' : '#c9a84c' }}
            animate={{ opacity: active ? [0.4, 1, 0.4] : [0.15, 0.4, 0.15], scale: active ? [1, 1.5, 1] : 1 }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}

        {/* Inner content */}
        <div className="relative z-10 py-16 px-8 text-center">
          {/* Icon cluster */}
          <motion.div
            className="inline-flex mb-7 relative"
            animate={{ y: active ? -6 : 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className="relative w-20 h-20 rounded-2xl border border-[rgba(0,66,37,0.2)] bg-[rgba(0,66,37,0.04)] flex items-center justify-center transition-colors">
              <motion.div
                animate={{ rotate: isDragging ? 10 : active ? -5 : 0, scale: active ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <FileText className="w-8 h-8 text-[#004225]" />
              </motion.div>
            </div>
          </motion.div>

          {/* Text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isDragging ? 'drag' : 'idle'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <h3 className="text-2xl mb-2" style={{ color: '#1a1f2e', fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {isDragging ? 'Release to upload' : 'Drop your MSME loan agreement here'}
              </h3>
              <p className="text-sm mb-7" style={{ color: '#6b7280', fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {isDragging
                  ? 'Our platform will prepare it for review'
                  : 'PDF, DOCX, or TXT · MSME loan agreements, sanction letters, term sheets'}
              </p>
            </motion.div>
          </AnimatePresence>

          <p className="text-xs font-semibold tracking-wider uppercase mt-4" style={{ color: '#004225' }}>
            Click to browse or drag and drop
          </p>

          <input ref={inputRef} type="file" multiple onChange={handleInputChange} className="hidden" accept=".pdf,.doc,.docx,.txt" />
        </div>
      </motion.div>

      {/* ── File list ── */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Files ({files.length})
              </p>
              <AnimatePresence>
                {allReady && (
                  <motion.span
                    className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </motion.div>
                    Ready to analyze
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {files.map((file, idx) => (
              <motion.div
                key={file.id}
                className="relative flex items-center gap-4 p-4 rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] group overflow-hidden"
                initial={{ opacity: 0, x: -24, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -24, scale: 0.96 }}
                transition={{ delay: idx * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ borderColor: 'rgba(0,66,37,0.25)', boxShadow: '0 0 20px rgba(0,66,37,0.08)' }}
              >
                {/* Progress fill background */}
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, rgba(0,66,37,0.05) 0%, transparent 100%)' }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: file.progress / 100 }}
                  transition={{ duration: 0.3 }}
                />

                {/* File icon */}
                <motion.div
                  className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-[#004225]/10 border border-[#004225]/20 flex items-center justify-center"
                  animate={file.progress < 100 ? { boxShadow: ['0 0 0px #004225', '0 0 10px #00422540', '0 0 0px #004225'] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <File className="w-4 h-4 text-[#004225]" />
                </motion.div>

                <div className="relative flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(0,66,37,0.06)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #004225, #c9a84c)', boxShadow: '0 0 6px rgba(0,66,37,0.5)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <motion.span
                      className="text-xs font-bold text-[#004225] flex-shrink-0 w-8 text-right"
                      animate={file.progress < 100 ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
                      transition={{ duration: 1, repeat: file.progress < 100 ? Infinity : 0 }}
                    >
                      {Math.round(file.progress)}%
                    </motion.span>
                  </div>
                </div>

                <motion.button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="relative flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            ))}

            {/* ── Analyze button ── */}
            <motion.button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="relative w-full py-4 rounded-2xl font-black text-base overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #004225 0%, #2d6a4f 50%, #c9a84c 100%)', color: '#f4f1ea' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={!isAnalyzing ? { scale: 1.02, boxShadow: '0 0 50px rgba(0,66,37,0.4), 0 0 100px rgba(201,168,76,0.2)' } : undefined}
              whileTap={!isAnalyzing ? { scale: 0.98 } : undefined}
            >
              {/* Continuous shimmer */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)', backgroundSize: '200% 100%' }}
                animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              {/* Pulse ring on hover */}
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                animate={!isAnalyzing ? { boxShadow: ['0 0 0 0 rgba(0,66,37,0.3)', '0 0 0 8px rgba(0,66,37,0)'] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />

              <div className="relative flex items-center justify-center gap-2.5">
                {isAnalyzing ? (
                  <>
                    <motion.div
                      className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="tracking-wide">Analysing...</span>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className="w-5 h-5" />
                    </motion.div>
                    <span className="tracking-wide">Request Expert Review</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </>
                )}
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


