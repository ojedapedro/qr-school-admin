import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, CreditCard, Calendar, ShieldCheck, Download } from 'lucide-react';
import { Student } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface StudentProfileProps {
  student: Student;
}

export function StudentProfile({ student }: StudentProfileProps) {
  const downloadQR = () => {
    const svg = document.getElementById(`qr-profile-${student.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `Mi_QR_${student.name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-black tracking-tight">Mi Perfil Escolar</h2>
        <p className="text-brand-text-muted">Muestra este código QR al entrar a la institución</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* QR Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass-card p-10 flex flex-col items-center space-y-8 border-white/5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-accent/20 transition-all" />
          
          <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl shadow-brand-accent/20 border-8 border-brand-accent/10 relative z-10">
            <QRCodeSVG 
              id={`qr-profile-${student.id}`} 
              value={student.id} 
              size={240}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <button 
            onClick={downloadQR}
            className="flex items-center gap-3 text-brand-accent font-black uppercase tracking-widest text-sm hover:text-white transition-all active:scale-95 group/btn"
          >
            <div className="p-2 bg-brand-accent/10 rounded-lg group-hover/btn:bg-brand-accent group-hover/btn:text-white transition-all">
              <Download size={20} />
            </div>
            Descargar mi QR
          </button>
        </motion.div>

        {/* Info Card */}
        <div className="space-y-6">
          <div className="glass-card p-8 space-y-8 border-white/5">
            <div className="flex items-center gap-5 group">
              <div className="w-14 h-14 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent shadow-inner group-hover:bg-brand-accent group-hover:text-white transition-all">
                <User size={28} />
              </div>
              <div>
                <p className="text-[10px] text-brand-text-muted uppercase font-black tracking-[0.2em] mb-1">Nombre del Alumno</p>
                <p className="font-black text-xl text-white tracking-tight">{student.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-5 group">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 shadow-inner group-hover:bg-purple-500 group-hover:text-white transition-all">
                <Calendar size={28} />
              </div>
              <div>
                <p className="text-[10px] text-brand-text-muted uppercase font-black tracking-[0.2em] mb-1">Grado / Sección</p>
                <p className="font-black text-xl text-white tracking-tight">{student.grade}</p>
              </div>
            </div>

            <div className="flex items-center gap-5 group">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all",
                student.paymentStatus === 'Solvente' 
                  ? "bg-green-500/10 text-green-400 group-hover:bg-green-500 group-hover:text-white" 
                  : "bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white"
              )}>
                <CreditCard size={28} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-brand-text-muted uppercase font-black tracking-[0.2em] mb-1">Estado de Pago</p>
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "font-black text-xl tracking-tight uppercase",
                    student.paymentStatus === 'Solvente' ? "text-green-400" : "text-red-400"
                  )}>
                    {student.paymentStatus}
                  </p>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest">$50.00 / mes</p>
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Vence día 30</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {student.paymentStatus === 'Mora' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-start gap-4 shadow-xl shadow-red-500/5"
            >
              <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                <ShieldCheck size={24} className="shrink-0" />
              </div>
              <p className="text-sm text-red-200 font-medium leading-relaxed">
                Tienes pagos pendientes. Por favor contacta con administración para regularizar tu situación y permitir el acceso a las instalaciones.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
