import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, AttendanceRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Camera, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function QRScanner({ onNavigateToPayments }: { onNavigateToPayments: () => void }) {
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; student?: Student } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        },
        /* verbose= */ false
      );

      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  async function onScanSuccess(decodedText: string) {
    if (scanResult) return; // Prevent multiple scans at once

    try {
      setIsScanning(false);
      if (scannerRef.current) {
        await scannerRef.current.clear();
        scannerRef.current = null;
      }

      // 1. Check if student exists
      const q = query(collection(db, 'students'), where('id', '==', decodedText));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'students');
        return;
      }

      if (querySnapshot.empty) {
        setScanResult({ success: false, message: "Alumno no encontrado en la base de datos." });
        return;
      }

      const studentData = querySnapshot.docs[0].data() as Student;

      // 2. Check payment status
      if (studentData.paymentStatus === 'Mora') {
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

    } catch (error) {
      console.error("Scan error:", error);
      setScanResult({ success: false, message: "Error al procesar el escaneo." });
    }
  }

  function onScanFailure(error: any) {
    // Silently handle scan failures (usually just "no QR found in frame")
  }

  const resetScanner = () => {
    setScanResult(null);
    setIsScanning(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black tracking-tight">Escáner de Asistencia</h2>
        <p className="text-brand-text-muted">Escanea el código QR del alumno para validar su entrada</p>
      </div>

      <div className="w-full max-w-md glass-card overflow-hidden border-white/5">
        {!isScanning && !scanResult && (
          <div className="p-16 flex flex-col items-center space-y-6">
            <div className="w-24 h-24 bg-brand-accent/20 rounded-3xl flex items-center justify-center text-brand-accent shadow-xl shadow-brand-accent/10">
              <Camera size={48} />
            </div>
            <button
              onClick={() => setIsScanning(true)}
              className="brand-button w-full"
            >
              Iniciar Cámara
            </button>
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
        <button
          onClick={() => setIsScanning(false)}
          className="text-brand-text-muted hover:text-white font-bold transition-colors"
        >
          Cancelar Escaneo
        </button>
      )}
    </div>
  );
}
