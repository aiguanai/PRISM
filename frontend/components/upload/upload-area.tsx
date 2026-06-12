'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { File, X, ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import { useState, useRef } from 'react';

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

  return (
    <div className="space-y-5">
      {/* ── Drop zone ── */}
      <motion.div
        className={`relative rounded-xl cursor-pointer select-none bg-card transition-colors duration-200 ${
          isDragging
            ? 'border-2 border-accent shadow-lg'
            : 'border-2 border-dashed border-primary/25 hover:border-accent shadow-md hover:shadow-lg'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        role="button"
        tabIndex={0}
        aria-label="Upload a loan agreement — click or press Enter to browse files"
        animate={{ scale: isDragging ? 1.01 : 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative z-10 py-14 px-8 text-center">
          {/* Icon */}
          <motion.div
            className="inline-flex mb-6"
            animate={{ y: isDragging ? -6 : 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          >
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center transition-colors duration-200 ${
              isDragging ? 'bg-accent/15 border border-accent/40' : 'bg-primary/5 border border-primary/15'
            }`}>
              <motion.div
                animate={{ rotate: isDragging ? 8 : 0, scale: isDragging ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 220 }}
              >
                <FileText className="w-7 h-7 text-primary dark:text-primary" />
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
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-xl font-bold text-foreground mb-2">
                {isDragging ? 'Release to upload' : 'Drop your loan agreement here'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {isDragging
                  ? 'We will prepare it for review'
                  : 'PDF, DOCX, or TXT · loan agreements, sanction letters, term sheets'}
              </p>
            </motion.div>
          </AnimatePresence>

          <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold border border-border bg-background text-foreground">
            Click to browse or drag &amp; drop
          </span>

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
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between">
              <p className="label-caps">Files (<span className="num">{files.length}</span>)</p>
              <AnimatePresence>
                {allReady && (
                  <motion.span
                    className="flex items-center gap-1.5 text-xs text-sev-low font-semibold"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready to analyze
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {files.map((file, idx) => (
              <motion.div
                key={file.id}
                className="card-elevated relative flex items-center gap-4 p-4 group overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: idx * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* File icon */}
                <div className="relative flex-shrink-0 w-10 h-10 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center">
                  <File className="w-4 h-4 text-primary" />
                </div>

                <div className="relative flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="num text-xs text-muted-foreground flex-shrink-0">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <span className="num text-xs font-semibold text-foreground flex-shrink-0 w-9 text-right">
                      {Math.round(file.progress)}%
                    </span>
                  </div>
                </div>

                <motion.button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  aria-label={`Remove ${file.name}`}
                  className="relative flex-shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-sev-critical-bg text-muted-foreground hover:text-sev-critical transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            ))}

            {/* ── Analyze button ── */}
            <motion.button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="relative w-full py-3.5 rounded-full font-bold text-[15px] bg-primary text-primary-foreground shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              whileHover={!isAnalyzing ? { scale: 1.015, boxShadow: 'var(--shadow-lg)' } : undefined}
              whileTap={!isAnalyzing ? { scale: 0.985 } : undefined}
            >
              <div className="relative flex items-center justify-center gap-2.5">
                {isAnalyzing ? (
                  <>
                    <motion.div
                      className="w-4.5 h-4.5 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>Analysing…</span>
                  </>
                ) : (
                  <>
                    <span>Request Expert Review</span>
                    <ArrowRight className="w-4 h-4" />
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
