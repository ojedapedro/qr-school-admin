import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, PaymentRecord } from '../types';
import { useAuth } from '../hooks/useAuth';
import { 
  CreditCard, 
  Search, 
  History, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  DollarSign,
  User,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { syncAllStudentsPaymentStatus } from '../lib/paymentUtils';

export function PaymentModule() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<(Student & { docId: string }) | null>(null);
  const [paymentData, setPaymentData] = useState({ amount: 50, month: format(new Date(), 'MMMM yyyy', { locale: es }) });
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Fetch students
    const qStudents = query(collection(db, 'students'), orderBy('name', 'asc'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })) as (Student & { docId: string })[];
      setStudents(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));

    // Fetch recent payments
    const qPayments = query(collection(db, 'payments'), orderBy('date', 'desc'), limit(50));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as PaymentRecord[];
      setPayments(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments'));

    return () => {
      unsubStudents();
      unsubPayments();
    };
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !paymentData.amount || !paymentData.month) return;

    try {
      // 1. Record the payment
      await addDoc(collection(db, 'payments'), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        amount: Number(paymentData.amount),
        month: paymentData.month,
        date: new Date().toISOString(),
        recordedBy: user?.displayName || user?.email || 'Admin'
      });

      // 2. Update student status to 'Solvente'
      await updateDoc(doc(db, 'students', selectedStudent.docId), {
        paymentStatus: 'Solvente'
      });

      setSelectedStudent(null);
      setPaymentData({ amount: 50, month: format(new Date(), 'MMMM yyyy', { locale: es }) });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
    }
  };

  const handleSyncStatus = async () => {
    setIsSyncing(true);
    try {
      const result = await syncAllStudentsPaymentStatus();
      if (result.success) {
        if (result.moraStudents && result.moraStudents.length > 0) {
          const studentList = result.moraStudents.join(', ');
          alert(`Sincronización completada. Los siguientes alumnos están en mora por no pagar el mes anterior: ${studentList}`);
        } else {
          alert('Sincronización de solvencia completada correctamente. Todos los alumnos están al día con el mes anterior.');
        }
      } else {
        alert('Error al sincronizar solvencia.');
      }
    } catch (error) {
      console.error(error);
      alert('Error al sincronizar solvencia.');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Registro de Pagos</h2>
          <p className="text-brand-text-muted">Gestiona la solvencia económica de los alumnos</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="bg-brand-accent/10 border border-brand-accent/20 px-6 py-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-brand-accent/20 rounded-lg text-brand-accent">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-muted">Cuota Mensual</p>
              <p className="text-xl font-black text-brand-accent">$50.00</p>
            </div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-muted">Vencimiento</p>
              <p className="text-xl font-black text-orange-400">Día 30</p>
            </div>
          </div>
          <button
            onClick={handleSyncStatus}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-2xl hover:bg-white/10 transition-all active:scale-95 font-bold shadow-lg disabled:opacity-50"
          >
            <RefreshCw size={20} className={cn(isSyncing && "animate-spin")} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Mora'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Student Selection List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-accent transition-colors" size={20} />
            <input
              type="text"
              placeholder="Buscar alumno por nombre o ID..."
              className="brand-input pl-14 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="glass-card overflow-hidden border-white/5">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em]">Alumno</th>
                    <th className="px-8 py-6 text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em]">Estado</th>
                    <th className="px-8 py-6 text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em] text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-black text-white group-hover:text-brand-accent transition-colors tracking-tight">{student.name}</div>
                        <div className="text-[10px] text-brand-text-muted font-black uppercase tracking-widest mt-1">ID: {student.id} | {student.grade}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                          student.paymentStatus === 'Solvente' 
                            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}>
                          {student.paymentStatus === 'Solvente' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {student.paymentStatus}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => setSelectedStudent(student as any)}
                          className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white p-3.5 rounded-2xl transition-all active:scale-90 shadow-lg shadow-brand-accent/5"
                          title="Registrar Pago"
                        >
                          <CreditCard size={22} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Payments History */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white font-black tracking-tight uppercase text-sm">
            <div className="p-2 bg-brand-accent/20 rounded-lg text-brand-accent">
              <History size={20} />
            </div>
            <h3>Últimos Pagos</h3>
          </div>
          <div className="glass-card p-5 space-y-4 border-white/5">
            {payments.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="inline-flex p-4 bg-white/5 rounded-full text-brand-text-muted">
                  <DollarSign size={32} />
                </div>
                <p className="text-brand-text-muted font-bold">No hay registros recientes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => {
                  const isExpanded = expandedPaymentId === payment.id;
                  return (
                    <div 
                      key={payment.id} 
                      className={cn(
                        "flex flex-col rounded-2xl bg-white/5 transition-all border border-white/5 hover:border-brand-accent/30 overflow-hidden cursor-pointer",
                        isExpanded ? "bg-white/10 border-brand-accent/30 shadow-lg shadow-brand-accent/5" : "hover:bg-white/8"
                      )}
                      onClick={() => setExpandedPaymentId(isExpanded ? null : (payment.id || null))}
                    >
                      <div className="flex items-start gap-4 p-4">
                        <div className="bg-green-500/20 p-3 rounded-xl text-green-400 shadow-inner shrink-0">
                          <DollarSign size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-white truncate group-hover:text-brand-accent transition-colors">{payment.studentName}</p>
                            {isExpanded ? <ChevronUp size={16} className="text-brand-text-muted" /> : <ChevronDown size={16} className="text-brand-text-muted" />}
                          </div>
                          <div className="flex items-center justify-between text-xs text-brand-text-muted mt-1 font-bold uppercase tracking-widest">
                            <span>{payment.month}</span>
                            <span className="text-green-400 text-sm font-black">${payment.amount}</span>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                          >
                            <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/5 bg-black/20">
                              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.15em] font-black">
                                <div className="p-1.5 bg-brand-accent/10 rounded-md text-brand-accent">
                                  <Clock size={12} />
                                </div>
                                <span className="text-brand-text-muted">Fecha y Hora:</span>
                                <span className="text-white ml-auto">
                                  {format(new Date(payment.date), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.15em] font-black">
                                <div className="p-1.5 bg-brand-accent/10 rounded-md text-brand-accent">
                                  <ShieldCheck size={12} />
                                </div>
                                <span className="text-brand-text-muted">Registrado por:</span>
                                <span className="text-white ml-auto">{payment.recordedBy}</span>
                              </div>

                              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.15em] font-black">
                                <div className="p-1.5 bg-brand-accent/10 rounded-md text-brand-accent">
                                  <User size={12} />
                                </div>
                                <span className="text-brand-text-muted">ID Alumno:</span>
                                <span className="text-white ml-auto font-mono">{payment.studentId}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-card border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-brand-accent p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="relative z-10 flex items-center gap-5">
                  <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center shadow-xl">
                    <CreditCard size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Registrar Pago</h3>
                    <p className="text-white/70 font-bold">Alumno: {selectedStudent.name}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRecordPayment} className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest ml-1">Monto ($)</label>
                    <div className="relative group">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-accent transition-colors" size={18} />
                      <input
                        required
                        type="number"
                        className="brand-input pl-12"
                        value={paymentData.amount || ''}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest ml-1">Mes / Concepto</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-accent transition-colors" size={18} />
                      <input
                        required
                        type="text"
                        className="brand-input pl-12"
                        value={paymentData.month}
                        onChange={(e) => setPaymentData({ ...paymentData, month: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-3xl space-y-3 border border-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-text-muted font-bold uppercase tracking-widest">ID Alumno:</span>
                    <span className="font-black text-white font-mono">{selectedStudent.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-text-muted font-bold uppercase tracking-widest">Grado:</span>
                    <span className="font-black text-white">{selectedStudent.grade}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-text-muted font-bold uppercase tracking-widest">Estado Actual:</span>
                    <span className={cn(
                      "font-black uppercase tracking-widest",
                      selectedStudent.paymentStatus === 'Solvente' ? "text-green-400" : "text-red-400"
                    )}>{selectedStudent.paymentStatus}</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="flex-1 px-6 py-4 bg-white/5 text-white rounded-2xl font-black hover:bg-white/10 transition-all active:scale-95 border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="brand-button flex-1 flex items-center justify-center gap-3"
                  >
                    Confirmar
                    <ArrowRight size={20} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
