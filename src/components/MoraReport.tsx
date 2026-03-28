import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, PaymentRecord } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Download, Printer, ArrowLeft, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface StudentWithLastPayment extends Student {
  lastPaymentDate?: string;
}

export function MoraReport({ onBack }: { onBack: () => void }) {
  const [moraStudents, setMoraStudents] = useState<StudentWithLastPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMoraData = async () => {
      try {
        // 1. Fetch all students in Mora
        const studentsQuery = query(
          collection(db, 'students'),
          where('paymentStatus', '==', 'Mora')
        );
        const studentsSnap = await getDocs(studentsQuery);
        const studentsList = studentsSnap.docs.map(doc => doc.data() as Student);

        // 2. For each student, fetch their last payment
        const studentsWithPayments = await Promise.all(
          studentsList.map(async (student) => {
            const paymentsQuery = query(
              collection(db, 'payments'),
              where('studentId', '==', student.id),
              orderBy('date', 'desc'),
              limit(1)
            );
            const paymentsSnap = await getDocs(paymentsQuery);
            
            let lastPaymentDate = undefined;
            if (!paymentsSnap.empty) {
              const lastPayment = paymentsSnap.docs[0].data() as PaymentRecord;
              lastPaymentDate = lastPayment.date;
            }

            return {
              ...student,
              lastPaymentDate
            };
          })
        );

        setMoraStudents(studentsWithPayments);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'reports/mora');
        setLoading(false);
      }
    };

    fetchMoraData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-brand-text-muted font-bold">Generando reporte de mora...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header - Hidden on Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black tracking-tight">Reporte de Mora</h2>
            <p className="text-brand-text-muted">Estudiantes con pagos pendientes</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="brand-button flex items-center justify-center gap-2"
          >
            <Printer size={20} />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white text-slate-900 rounded-[2rem] shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
        {/* Report Header */}
        <div className="p-10 border-b-2 border-slate-100 bg-slate-50 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-brand-accent mb-2">QR-School.</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Reporte de Cartera Morosa</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-500">Fecha de Generación</p>
            <p className="text-lg font-black">{format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="p-8 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Morosos</p>
            <p className="text-3xl font-black text-red-600">{moraStudents.length}</p>
          </div>
          <div className="p-8 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
            <p className="text-3xl font-black text-slate-800">Crítico</p>
          </div>
          <div className="p-8 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prioridad</p>
            <p className="text-3xl font-black text-brand-accent">Alta</p>
          </div>
        </div>

        {/* Table */}
        <div className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudiante</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grado</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Pago</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {moraStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-6">
                    <div className="font-black text-slate-800 text-lg tracking-tight">{student.name}</div>
                    <div className="text-xs font-bold text-slate-400">ID: {student.id}</div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-600 uppercase tracking-wider">
                      {student.grade}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    {student.lastPaymentDate ? (
                      <div className="text-sm font-bold text-slate-600">
                        {format(new Date(student.lastPaymentDate), "d 'de' MMM, yyyy", { locale: es })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-500 text-sm font-black italic">
                        <AlertCircle size={14} />
                        Sin registros
                      </div>
                    )}
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      Mora
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {moraStudents.length === 0 && (
            <div className="p-20 text-center">
              <div className="inline-flex p-6 bg-green-50 rounded-full text-green-500 mb-4">
                <FileText size={48} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">¡Todo al día!</h3>
              <p className="text-slate-500 font-bold">No se encontraron estudiantes con mora en sus pagos.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-10 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">
            Documento generado automáticamente por QR-School Admin System
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .glass-card { border: none !important; background: white !important; box-shadow: none !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          @page { margin: 2cm; }
        }
      `}} />
    </div>
  );
}
