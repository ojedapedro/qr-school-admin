import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AttendanceRecord, Student } from '../types';
import { format, isToday, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, UserCheck, UserX, BarChart3, Download, Calendar as CalendarIcon, Filter, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function AttendanceStats() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    // Get all students to calculate percentages
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data() as Student));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });

    // Get attendance within range
    const q = query(
      collection(db, 'attendance'),
      where('timestamp', '>=', startOfDay(new Date(startDate + 'T00:00:00')).toISOString()),
      where('timestamp', '<=', endOfDay(new Date(endDate + 'T23:59:59')).toISOString()),
      orderBy('timestamp', 'desc')
    );

    const unsubAttendance = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as AttendanceRecord[];
      setAttendance(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
      setLoading(false);
    });

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, [startDate, endDate]);

  const presentCount = new Set(attendance.map(a => a.studentId)).size;
  const totalStudents = students.length;
  const absentCount = totalStudents - presentCount;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  const exportAttendance = () => {
    const csvRows = [
      ['Nombre', 'ID', 'Grado', 'Fecha/Hora'],
      ...attendance.map(a => [
        a.studentName,
        a.studentId,
        a.grade,
        format(new Date(a.timestamp), 'yyyy-MM-dd HH:mm:ss')
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `asistencia_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const resetDates = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setStartDate(today);
    setEndDate(today);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Dashboard de Asistencia</h2>
          <p className="text-brand-text-muted">Resumen de actividad y registros del periodo</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetDates}
            className="p-3 bg-white/5 border border-white/10 text-brand-text-muted rounded-2xl hover:bg-white/10 transition-all active:scale-95 shadow-lg"
            title="Hoy"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={exportAttendance}
            className="flex items-center justify-center gap-2 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent px-6 py-3 rounded-2xl hover:bg-brand-accent/20 transition-all active:scale-95 font-bold shadow-lg"
          >
            <Download size={20} />
            Exportar Rango
          </button>
        </div>
      </div>

      <div className="glass-card p-6 border-white/5">
        <div className="flex flex-col sm:flex-row items-end gap-6">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1 flex items-center gap-2">
              <CalendarIcon size={12} /> Fecha Inicio
            </label>
            <input 
              type="date" 
              className="brand-input w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest ml-1 flex items-center gap-2">
              <CalendarIcon size={12} /> Fecha Fin
            </label>
            <input 
              type="date" 
              className="brand-input w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-center p-4 bg-brand-accent/20 rounded-2xl text-brand-accent shrink-0 hidden sm:flex">
            <Filter size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Users size={24} />}
          label="Total Alumnos"
          value={totalStudents}
          color="brand-accent"
        />
        <StatCard 
          icon={<UserCheck size={24} />}
          label="Presentes"
          value={presentCount}
          color="green-500"
        />
        <StatCard 
          icon={<UserX size={24} />}
          label="Ausentes"
          value={absentCount}
          color="red-500"
        />
        <StatCard 
          icon={<BarChart3 size={24} />}
          label="% Asistencia"
          value={`${attendanceRate}%`}
          color="purple-500"
        />
      </div>

      <div className="glass-card overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 className="font-black tracking-tight flex items-center gap-3">
            <div className="p-2 bg-brand-accent/20 rounded-lg text-brand-accent">
              <CalendarIcon size={20} />
            </div>
            Registros del Periodo
          </h3>
          {loading && <RefreshCw size={16} className="animate-spin text-brand-accent" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-xs font-black text-brand-text-muted uppercase tracking-widest">Alumno</th>
                <th className="px-6 py-4 text-xs font-black text-brand-text-muted uppercase tracking-widest">Grado</th>
                <th className="px-6 py-4 text-xs font-black text-brand-text-muted uppercase tracking-widest">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {attendance.map((record) => (
                <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="font-bold text-white group-hover:text-brand-accent transition-colors">{record.studentName}</div>
                    <div className="text-xs text-brand-text-muted font-mono">ID: {record.studentId}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-brand-text-muted border border-white/5">
                      {record.grade}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-brand-text-muted text-sm font-medium">
                    {format(new Date(record.timestamp), "d 'de' MMM, HH:mm", { locale: es })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {attendance.length === 0 && !loading && (
            <div className="p-20 text-center">
              <div className="inline-flex p-4 bg-white/5 rounded-full text-brand-text-muted mb-4">
                <CalendarIcon size={32} />
              </div>
              <p className="text-brand-text-muted font-bold">No hay registros de asistencia aún.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorClass = color === 'brand-accent' ? 'text-brand-accent bg-brand-accent/10' : `text-${color} bg-${color}/10`;
  
  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className="glass-card p-6 flex items-center gap-5 border-white/5 hover:border-brand-accent/30 transition-all cursor-default"
    >
      <div className={cn("p-4 rounded-2xl shadow-inner", colorClass)}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-black text-brand-text-muted uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
}
