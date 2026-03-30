import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, AttendanceRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Camera, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export function QRScanner({ onNavigateToPayments }: { onNavigateToPayments: () => void }) {
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; student?: Student } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Audio and Haptic feedback helper
  const playFeedback = (type: 'success' | 'error') => {
    try {
      // Vibration (Haptic feedback)
      if ('vibrate' in navigator) {
        navigator.vibrate(type === 'success' ? 100 : [100, 50, 100]);
      }

      // Audio using Web Audio API (No external files needed)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        // High-pitched "ding"
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); // E6
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      } else {
        // Low-pitched "buzz"
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        oscillator.frequency.linearRampToValueAtTime(110, audioCtx.currentTime + 0.2); // A2
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      }

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('Feedback audio/vibration not supported or blocked:', e);
    }
  };

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      const startScanner = async () => {
        try {
          setCameraError(null);
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;

          const config = { 
            fps: 15, 
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.7);
              return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.0,
          };

          // Get available cameras first
          const cameras = await Html5Qrcode.getCameras();
          setAvailableCameras(cameras);

          if (cameras && cameras.length > 0) {
            // Try to use the last camera (usually the main back camera on mobile)
            const lastCamera = cameras[cameras.length - 1];
            setCurrentCameraIndex(cameras.length - 1);
            await html5QrCode.start(
              lastCamera.id, 
              config, 
              onScanSuccess, 
              onScanFailure
            );
          } else {
            // Fallback to facingMode if no cameras listed
            await html5QrCode.start(
              { facingMode: "environment" }, 
              config, 
              onScanSuccess, 
              onScanFailure
            );
          }
        } catch (err: any) {
          console.error("Error starting scanner:", err);
          let errorMessage = "No se pudo acceder a la cámara.";
          
          if (err?.toString().includes("NotAllowedError") || err?.toString().includes("Permission denied")) {
            errorMessage = "Permiso de cámara denegado. Por favor, habilita el acceso en la configuración de tu navegador.";
          } else if (err?.toString().includes("NotFoundError")) {
            errorMessage = "No se encontró ninguna cámara en este dispositivo.";
          } else if (err?.toString().includes("NotReadableError") || err?.toString().includes("Could not start video source")) {
            errorMessage = "La cámara está siendo usada por otra aplicación o no se pudo iniciar.";
          }
          
          setCameraError(errorMessage);
          setIsScanning(false);
        }
      };

      startScanner();
    }

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current = null;
          }).catch(err => console.error("Failed to stop scanner", err));
        } else {
          scannerRef.current = null;
        }
      }
    };
  }, [isScanning]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  async function onScanSuccess(decodedText: string) {
    if (scanResult) return;

    try {
      await stopScanner();
      
      // Process scan...
      await processStudentId(decodedText);
    } catch (error) {
      console.error("Scan error:", error);
      setScanResult({ success: false, message: "Error al procesar el escaneo." });
    }
  }

  const processStudentId = async (studentId: string) => {
    try {
      // 1. Check if student exists
      const q = query(collection(db, 'students'), where('id', '==', studentId));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'students');
        return;
      }

      if (querySnapshot.empty) {
        playFeedback('error');
        setScanResult({ success: false, message: "Alumno no encontrado en la base de datos." });
        return;
      }

      const studentData = querySnapshot.docs[0].data() as Student;

      // 2. Check payment status
      if (studentData.paymentStatus === 'Mora') {
        playFeedback('error');
        setScanResult({ 
          success: false, 
          message: "ACCESO DENEGADO: Pendiente por Pago", 
          student: studentData 
        });
        return;
      }

      // 3. Register attendance
      try {
        await addDoc(collection(db, 'attendance'), {
          studentId: studentData.id,
          studentName: studentData.name,
          grade: studentData.grade,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'attendance');
        return;
      }

      setScanResult({ 
        success: true, 
        message: "Asistencia Registrada Correctamente", 
        student: studentData 
      });
      playFeedback('success');
    } catch (error) {
      console.error("Process error:", error);
      setScanResult({ success: false, message: "Error al procesar los datos." });
    }
  };

  function onScanFailure(error: any) {
    // Silently handle scan failures
  }

  const resetScanner = () => {
    setScanResult(null);
    setIsScanning(true);
    setManualId('');
    setIsManualMode(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      processStudentId(manualId.trim());
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length < 2 || !scannerRef.current) return;
    
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIndex);
    
    try {
      await scannerRef.current.stop();
      
      const config = { 
        fps: 15, 
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
      };
      
      await scannerRef.current.start(
        availableCameras[nextIndex].id,
        config,
        onScanSuccess,
        onScanFailure
      );
    } catch (err) {
      console.error("Error switching camera:", err);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black tracking-tight">Escáner de Asistencia</h2>
        <p className="text-brand-text-muted px-4">Escanea el carnet del alumno para validar su entrada a la institución</p>
      </div>

      <div className="w-full max-w-md glass-card overflow-hidden border-white/5 relative">
        {/* Mobile Instructions Overlay */}
        {isScanning && (
          <div className="absolute top-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/80">
              Apunta al código QR del carnet
            </div>
          </div>
        )}
        
        {cameraError && !scanResult && (
          <div className="p-8 text-center space-y-4">
            <div className="bg-red-500/20 p-4 rounded-full text-red-500 inline-flex">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-2">
              <p className="text-red-400 font-bold text-sm leading-relaxed">{cameraError}</p>
              <p className="text-brand-text-muted text-[10px] uppercase tracking-widest font-black">
                Tip: Si estás en móvil, intenta abrir la app en una pestaña nueva
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={() => setIsScanning(true)}
                className="brand-button text-xs py-3 w-full"
              >
                Reintentar Cámara
              </button>
              <button 
                onClick={openInNewTab}
                className="w-full py-3 bg-white/5 text-brand-text-muted rounded-2xl font-black hover:bg-white/10 transition-all text-[10px] uppercase tracking-widest border border-white/10"
              >
                Abrir en pestaña nueva
              </button>
            </div>
          </div>
        )}

        {!isScanning && !scanResult && !isManualMode && (
          <div className="p-16 flex flex-col items-center space-y-6">
            <div className="w-24 h-24 bg-brand-accent/20 rounded-3xl flex items-center justify-center text-brand-accent shadow-xl shadow-brand-accent/10">
              <Camera size={48} />
            </div>
            <div className="space-y-3 w-full">
              <button
                onClick={() => setIsScanning(true)}
                className="brand-button w-full"
              >
                Iniciar Cámara
              </button>
              <button
                onClick={() => setIsManualMode(true)}
                className="w-full py-4 bg-white/5 text-brand-text-muted rounded-2xl font-black hover:bg-white/10 transition-all text-xs uppercase tracking-widest"
              >
                Ingreso Manual (ID)
              </button>
            </div>
          </div>
        )}

        {isManualMode && !scanResult && (
          <div className="p-10 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black">Ingreso Manual</h3>
              <p className="text-xs text-brand-text-muted">Ingresa el ID del alumno que aparece en su carnet</p>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input 
                type="text" 
                placeholder="Ej: ALUM-001"
                className="brand-input w-full text-center text-xl font-mono"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className="flex-1 py-4 bg-white/5 text-brand-text-muted rounded-2xl font-black hover:bg-white/10 transition-all text-xs"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className="flex-[2] brand-button"
                  disabled={!manualId.trim()}
                >
                  Validar ID
                </button>
              </div>
            </form>
          </div>
        )}

        <div id="reader" className={cn("w-full", !isScanning && "hidden")}></div>

        <AnimatePresence mode="wait">
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "p-10 flex flex-col items-center text-center space-y-6",
                scanResult.success ? "bg-green-500/5" : "bg-red-500/5",
                !scanResult.success && scanResult.student?.paymentStatus === 'Mora' && "border-4 border-red-500/50 animate-pulse"
              )}
            >
              {scanResult.success ? (
                <div className="bg-green-500/20 p-4 rounded-full text-green-500">
                  <CheckCircle2 size={64} />
                </div>
              ) : (
                <div className="bg-red-500/20 p-4 rounded-full text-red-500">
                  <ShieldAlert size={64} className={cn(
                    scanResult.student?.paymentStatus === 'Mora' && "animate-bounce"
                  )} />
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className={cn(
                  "text-2xl font-black tracking-tight",
                  scanResult.success ? "text-green-400" : "text-red-400"
                )}>
                  {scanResult.message}
                </h3>
                {scanResult.student && (
                  <div className="text-white">
                    <p className="font-black text-xl">{scanResult.student.name}</p>
                    <p className="text-sm text-brand-text-muted font-bold uppercase tracking-widest">{scanResult.student.grade} | ID: {scanResult.student.id}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col w-full gap-3 pt-4">
                <button
                  onClick={resetScanner}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black transition-all active:scale-95 shadow-lg",
                    scanResult.success 
                      ? "bg-green-600 text-white hover:bg-green-500 shadow-green-600/20" 
                      : "bg-red-600 text-white hover:bg-red-500 shadow-red-600/20"
                  )}
                >
                  Siguiente Escaneo
                </button>
                {!scanResult.success && scanResult.student?.paymentStatus === 'Mora' && (
                  <button
                    onClick={onNavigateToPayments}
                    className="w-full py-4 bg-brand-accent text-white rounded-2xl font-black hover:bg-brand-accent/90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-brand-accent/20"
                  >
                    Registrar Pago Ahora
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isScanning && (
        <div className="flex flex-col items-center gap-4">
          {availableCameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              <RefreshCw size={16} />
              Cambiar Cámara
            </button>
          )}
          <button
            onClick={stopScanner}
            className="text-brand-text-muted hover:text-white font-bold transition-colors text-sm"
          >
            Cancelar Escaneo
          </button>
        </div>
      )}
    </div>
  );
}
