import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, PaymentStatus } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Trash2, QrCode, Download, Search, UserPlus, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function AdminDashboard({ onNavigateToPayments }: { onNavigateToPayments: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ id: '', name: '', grade: '', email: '' });

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      })) as (Student & { docId: string })[];
      setStudents(studentData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });
    return () => unsubscribe();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.id || !newStudent.name || !newStudent.grade) return;

    try {
      await addDoc(collection(db, 'students'), {
        ...newStudent,
        paymentStatus: 'Solvente',
        createdAt: new Date().toISOString()
      });
      setNewStudent({ id: '', name: '', grade: '', email: '' });
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'students');
    }
  };

  const togglePaymentStatus = async (student: Student & { docId: string }) => {
    const newStatus: PaymentStatus = student.paymentStatus === 'Solvente' ? 'Mora' : 'Solvente';
    try {
      await updateDoc(doc(db, 'students', student.docId), {
        paymentStatus: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${student.docId}`);
    }
  };

  const deleteStudent = async (docId: string) => {
    if (!confirm('¿Estás seguro de eliminar este alumno?')) return;
    try {
      await deleteDoc(doc(db, 'students', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${docId}`);
    }
  };

  const downloadQR = (studentId: string, studentName: string) => {
    const svg = document.getElementById(`qr-${studentId}`);
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
      downloadLink.download = `QR_${studentName}_${studentId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Gestión de Alumnos</h2>
          <p className="text-brand-text-muted">Administra la base de datos de tus deportistas.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="brand-button flex items-center justify-center gap-2"
        >
          <UserPlus size={20} />
          Nuevo Alumno
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-accent transition-colors" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre, ID o grado..."
          className="w-full pl-14 pr-6 py-5 bg-brand-card/50 border border-white/5 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all font-bold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-hidden border-white/5">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text-muted">Alumno</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text-muted">ID / Grado</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text-muted">Estado Pago</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text-muted">QR</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text-muted text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-black text-white tracking-tight">{student.name}</div>
                    {student.email && <div className="text-xs text-brand-text-muted font-bold">{student.email}</div>}
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-black tracking-tight">ID: {student.id}</div>
                    <div className="text-xs text-brand-text-muted font-bold">{student.grade}</div>
                  </td>
                  <td className="px-8 py-6">
                    <button
                      onClick={() => togglePaymentStatus(student as any)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                        student.paymentStatus === 'Solvente' 
                          ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" 
                          : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      )}
                    >
                      {student.paymentStatus === 'Solvente' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {student.paymentStatus}
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <div className="hidden">
                      <QRCodeSVG id={`qr-${student.id}`} value={student.id} size={256} />
                    </div>
                    <button
                      onClick={() => downloadQR(student.id, student.name)}
                      className="text-brand-accent hover:bg-brand-accent/10 p-3 rounded-2xl transition-all active:scale-90"
                      title="Descargar QR"
                    >
                      <Download size={22} />
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <button
                        onClick={onNavigateToPayments}
                        className="text-brand-accent hover:bg-brand-accent/10 p-3 rounded-2xl transition-all active:scale-90"
                        title="Registrar Pago"
                      >
                        <CreditCard size={22} />
                      </button>
                      <button
                        onClick={() => deleteStudent((student as any).docId)}
                        className="text-red-400 hover:bg-red-400/10 p-3 rounded-2xl transition-all active:scale-90"
                        title="Eliminar Alumno"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && !loading && (
            <div className="p-12 text-center text-brand-text-muted font-medium">No se encontraron alumnos registrados.</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-card border border-white/10 rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
              <h3 className="text-2xl font-black mb-6">Nuevo Alumno</h3>
              <form onSubmit={handleAddStudent} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-text-muted">ID Único</label>
                  <input
                    required
                    type="text"
                    className="w-full brand-input"
                    value={newStudent.id}
                    onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Nombre Completo</label>
                  <input
                    required
                    type="text"
                    className="w-full brand-input"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="Para acceso del alumno"
                    className="w-full brand-input"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-text-muted">Grado</label>
                  <input
                    required
                    type="text"
                    className="w-full brand-input"
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 brand-button"
                  >
                    Guardar
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
