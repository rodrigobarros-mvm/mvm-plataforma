import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CelebrationProps {
  show: boolean;
  leadName: string;
  commission?: number;
  isGoalReached?: boolean;
  onClose: () => void;
}

// Mini confetti particle
function Particle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ background: color, left: `${x}%`, top: 0 }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{ y: 300, opacity: 0, rotate: 720 }}
      transition={{ duration: 1.5, delay, ease: "easeIn" }}
    />
  );
}

const COLORS = ["#e21d3c", "#22c55e", "#3b82f6", "#e21d3c", "#a855f7", "#ec4899"];

export default function QualificationCelebration({
  show,
  leadName,
  commission,
  isGoalReached,
  onClose,
}: CelebrationProps) {
  const [particles] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    }))
  );

  // Auto-fechar após 5 segundos
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
              <Particle key={p.id} x={p.x} delay={p.delay} color={p.color} />
            ))}
          </div>

          {/* Card de celebração */}
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
            initial={{ scale: 0.5, y: 60 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 60 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-7 w-7 text-gray-400"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Ícone principal */}
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #e21d3c, #e21d3c)" }}
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Trophy className="w-10 h-10 text-white" />
            </motion.div>

            {/* Título */}
            <motion.h2
              className="text-2xl font-bold mb-1"
              style={{ color: "#1a3a5c", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Lead Qualificado! 🎉
            </motion.h2>

            <motion.p
              className="text-gray-500 text-sm mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {leadName}
            </motion.p>

            {/* Comissão */}
            {commission !== undefined && commission > 0 && (
              <motion.div
                className="rounded-xl p-4 mb-4"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-semibold text-sm">Comissão a receber</span>
                </div>
                <p className="text-green-800 text-2xl font-bold mt-1">
                  {commission.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </motion.div>
            )}

            {/* Meta atingida */}
            {isGoalReached && (
              <motion.div
                className="rounded-xl p-3 mb-4"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-5 h-5 text-red-600 fill-red-600" />
                  <span className="text-red-700 font-bold text-sm">
                    🏆 Meta diária atingida! Parabéns!
                  </span>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                className="w-full font-semibold"
                style={{ background: "#e21d3c", color: "white" }}
                onClick={onClose}
              >
                Continuar Prospectando
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
