'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Bell, Shield, Palette, Globe, Key, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

const sections = [
  {
    id: 'general',
    label: 'General',
    icon: Globe,
    settings: [
      { id: 'language', label: 'Language', description: 'Interface language', type: 'select', value: 'English', options: ['English', 'Spanish', 'French', 'German'] },
      { id: 'timezone', label: 'Timezone', description: 'Used for timestamps', type: 'select', value: 'UTC', options: ['UTC', 'EST', 'PST', 'GMT'] },
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: Shield,
    settings: [
      { id: 'autoAnalyze', label: 'Auto-analyze on upload', description: 'Start analysis immediately after upload', type: 'toggle', value: true },
      { id: 'riskThreshold', label: 'Risk alert threshold', description: 'Notify when risk score exceeds this value', type: 'select', value: '70', options: ['50', '60', '70', '80', '90'] },
      { id: 'saveHistory', label: 'Save analysis history', description: 'Keep a record of all analyzed documents', type: 'toggle', value: true },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    settings: [
      { id: 'emailAlerts', label: 'Email alerts', description: 'Receive analysis results via email', type: 'toggle', value: false },
      { id: 'criticalOnly', label: 'Critical risk only', description: 'Only notify for critical risk findings', type: 'toggle', value: true },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    settings: [
      { id: 'theme', label: 'Theme', description: 'Color scheme', type: 'select', value: 'Dark', options: ['Dark', 'Light', 'System'] },
      { id: 'animations', label: 'Animations', description: 'Enable UI animations', type: 'toggle', value: true },
      { id: 'compactMode', label: 'Compact mode', description: 'Reduce spacing for denser layout', type: 'toggle', value: false },
    ],
  },
  {
    id: 'api',
    label: 'API & Integrations',
    icon: Key,
    settings: [
      { id: 'apiKey', label: 'API Key', description: 'Your PRISM API key', type: 'apikey', value: 'prism_sk_••••••••••••••••' },
    ],
  },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    autoAnalyze: true,
    saveHistory: true,
    emailAlerts: false,
    criticalOnly: true,
    animations: true,
    compactMode: false,
  });
  const [selects, setSelects] = useState<Record<string, string>>({
    language: 'English',
    timezone: 'UTC',
    riskThreshold: '70',
    theme: 'Dark',
  });

  const currentSection = sections.find((s) => s.id === activeSection);

  return (
    <DashboardLayout>
      <main className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen">
        {/* Background orb */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-primary/10 to-secondary/10 rounded-full blur-3xl"
            animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="font-display text-3xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Settings
            </h2>
            <p className="text-muted-foreground">Manage your preferences and configuration.</p>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Section nav */}
            <motion.nav
              className="md:w-56 flex-shrink-0 space-y-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <motion.button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/50'
                        : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium text-sm">{section.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                  </motion.button>
                );
              })}
            </motion.nav>

            {/* Settings panel */}
            <motion.div
              key={activeSection}
              className="flex-1 glass-effect rounded-2xl border border-border/40 p-6 space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentSection && (
                <>
                  <div className="flex items-center gap-3 pb-4 border-b border-border/40">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <currentSection.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{currentSection.label}</h3>
                  </div>

                  <div className="space-y-5">
                    {currentSection.settings.map((setting, index) => (
                      <motion.div
                        key={setting.id}
                        className="flex items-center justify-between gap-4 py-3 border-b border-border/20 last:border-0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{setting.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                        </div>

                        {/* Toggle */}
                        {setting.type === 'toggle' && (
                          <button
                            onClick={() =>
                              setToggles((prev) => ({ ...prev, [setting.id]: !prev[setting.id] }))
                            }
                            className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-300 ${
                              toggles[setting.id] ? 'bg-primary' : 'bg-muted'
                            }`}
                            aria-checked={toggles[setting.id]}
                            role="switch"
                          >
                            <motion.span
                              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
                              animate={{ x: toggles[setting.id] ? 20 : 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        )}

                        {/* Select */}
                        {setting.type === 'select' && setting.options && (
                          <select
                            value={selects[setting.id] ?? setting.value}
                            onChange={(e) =>
                              setSelects((prev) => ({ ...prev, [setting.id]: e.target.value }))
                            }
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg glass-effect border border-border/40 bg-card/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                          >
                            {setting.options.map((opt) => (
                              <option key={opt} value={opt} className="bg-card text-foreground">
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* API Key */}
                        {setting.type === 'apikey' && (
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-muted-foreground bg-card/50 px-3 py-1.5 rounded-lg border border-border/40 font-mono">
                              {setting.value}
                            </code>
                            <motion.button
                              className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors font-medium"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Regenerate
                            </motion.button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Save button */}
                  <div className="pt-2 flex justify-end">
                    <motion.button
                      className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Save Changes
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
