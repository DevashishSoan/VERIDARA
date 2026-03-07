import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Download, CheckCircle } from 'lucide-react';

interface DashboardProps {
    result: {
        id: string;
        score: number;
        verdict: string;
        layers: Array<{ label: string; value: number }>;
    };
    onClose: () => void;
}

const ForensicDashboard: React.FC<DashboardProps> = ({ result, onClose }) => {
    const isSynthetic = result.score < 50;

    const handleDownload = async () => {
        try {
            let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            let response: Response;

            try {
                response = await fetch(`${apiUrl}/v1/jobs/${result.id}/report`, {
                    method: 'GET',
                });
            } catch (primaryError) {
                console.error('Primary report download failed:', primaryError);

                if (apiUrl.includes('trycloudflare.com')) {
                    const fallbackUrl = 'http://localhost:3001';
                    console.warn('Falling back to local gateway for report download at:', fallbackUrl);

                    apiUrl = fallbackUrl;
                    response = await fetch(`${apiUrl}/v1/jobs/${result.id}/report`, {
                        method: 'GET',
                    });
                } else {
                    throw primaryError;
                }
            }

            if (!response.ok) throw new Error('Report generation failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `VERIDARA_Report_${result.id.slice(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download PDF report', error);
            alert('Could not download the forensic report at this time.');
        }
    };

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter text-metallic">Forensic Report</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Node-Alpha // {result.id.slice(0, 8)}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
                >
                    <CheckCircle className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* Verdict Badge - Cinematic Section */}
            <div className="flex flex-col items-center gap-8 py-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`
                        px-16 py-6 rounded-full border backdrop-blur-xl flex items-center gap-6
                        ${isSynthetic
                            ? 'bg-risk/10 border-risk/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]'
                            : 'bg-primary/10 border-primary/30 shadow-[0_0_50px_rgba(16,185,129,0.2)]'}
                    `}
                >
                    <motion.div
                        animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-4 h-4 rounded-full ${isSynthetic ? 'bg-risk' : 'bg-primary'} shadow-[0_0_15px_currentColor]`}
                    />
                    <div className="flex flex-col">
                        <span className={`text-[11px] font-black tracking-[0.6em] uppercase ${isSynthetic ? 'text-risk' : 'text-primary'}`}>
                            Forensic Conclusion
                        </span>
                        <span className="text-4xl font-black tracking-tighter text-white uppercase italic">
                            {result.verdict.replace('_', ' ')}
                        </span>
                    </div>
                </motion.div>

                {/* Main Trust Meter */}
                <div className="relative group">
                    <svg className="w-64 h-64 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                        <motion.circle
                            cx="50" cy="50" r="45"
                            fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                            className={isSynthetic ? 'text-risk' : 'text-primary'}
                            strokeDasharray="283"
                            initial={{ strokeDashoffset: 283 }}
                            animate={{ strokeDashoffset: 283 - (283 * result.score) / 100 }}
                            transition={{ duration: 2.5, ease: "circOut" }}
                            style={{ filter: `drop-shadow(0 0 12px ${isSynthetic ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'})` }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-8xl font-black tracking-tighter text-metallic leading-none"
                        >
                            {result.score}
                        </motion.span>
                        <span className="text-[10px] font-black uppercase tracking-[0.8em] text-white/20 -mt-2">Integrity Score</span>
                    </div>
                </div>
            </div>

            {/* Analysis Layers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.layers.filter(l => l.value > 0 || !['Temporal', 'Audio', 'Semantic'].includes(l.label)).map((layer, i) => (
                    <motion.div
                        key={layer.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="p-10 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors relative group overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                            <Shield className="w-12 h-12" />
                        </div>
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/15 block mb-2">{layer.label} Integrity</span>
                                <span className="text-5xl font-black tracking-tighter text-metallic">{layer.value}%</span>
                            </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${layer.value}%` }}
                                transition={{ duration: 1.5, delay: 0.8 + i * 0.1 }}
                                className="h-full bg-primary"
                                style={{ boxShadow: '0 0 10px rgba(16,185,129,0.5)' }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Action */}
            <div className="pt-10">
                <button
                    onClick={handleDownload}
                    className="btn-cinematic-primary w-full py-8 text-[11px] flex items-center justify-center gap-4 hover:scale-[1.02] transition-transform"
                >
                    <Download className="w-5 h-5" />
                    DOWNLOAD CERTIFIED FORENSIC PROOF (PDF)
                </button>
            </div>
        </div>
    );
};

export default ForensicDashboard;
