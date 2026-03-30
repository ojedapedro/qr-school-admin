import { collection, query, where, getDocs, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, PaymentRecord } from '../types';
import { format, startOfMonth, subMonths, isAfter, setDate } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Checks and updates the payment status of all students based on the current date.
 * Fee: $50 monthly
 * Due Date: 30th of each month
 */
export async function syncAllStudentsPaymentStatus() {
  try {
    const now = new Date();
    const currentMonthStr = format(now, 'MMMM yyyy', { locale: es });
    const prevMonthDate = subMonths(now, 1);
    const prevMonthStr = format(prevMonthDate, 'MMMM yyyy', { locale: es });
    
    const studentsInMoraPrevMonth: string[] = [];

    // Get all students
    const studentsSnap = await getDocs(collection(db, 'students'));
    const students = studentsSnap.docs.map(d => ({ ...d.data(), docId: d.id })) as (Student & { docId: string })[];

    for (const student of students) {
      // Check if student has paid for current month
      const currentMonthPaymentQuery = query(
        collection(db, 'payments'),
        where('studentId', '==', student.id),
        where('month', '==', currentMonthStr)
      );
      const currentMonthSnap = await getDocs(currentMonthPaymentQuery);
      
      const hasPaidCurrentMonth = !currentMonthSnap.empty;

      // Check if they paid the previous month
      const prevMonthPaymentQuery = query(
        collection(db, 'payments'),
        where('studentId', '==', student.id),
        where('month', '==', prevMonthStr)
      );
      const prevMonthSnap = await getDocs(prevMonthPaymentQuery);
      const hasPaidPrevMonth = !prevMonthSnap.empty;

      if (!hasPaidPrevMonth) {
        studentsInMoraPrevMonth.push(student.name);
      }

      if (hasPaidCurrentMonth) {
        // If paid current month, they are Solvente
        if (student.paymentStatus !== 'Solvente') {
          await updateDoc(doc(db, 'students', student.docId), { paymentStatus: 'Solvente' });
        }
        continue;
      }

      // If not paid current month, check if it's past the 30th
      const dayOfMonth = now.getDate();
      const isPastDueCurrentMonth = dayOfMonth > 30;

      if (isPastDueCurrentMonth || !hasPaidPrevMonth) {
        // Past 30th or missed previous month -> Mora
        if (student.paymentStatus !== 'Mora') {
          await updateDoc(doc(db, 'students', student.docId), { paymentStatus: 'Mora' });
        }
      } else {
        // Paid previous month and current month is not yet due -> Solvente
        if (student.paymentStatus !== 'Solvente') {
          await updateDoc(doc(db, 'students', student.docId), { paymentStatus: 'Solvente' });
        }
      }
    }
    
    return { success: true, moraStudents: studentsInMoraPrevMonth };
  } catch (error) {
    console.error("Error syncing payment status:", error);
    return { success: false, error, moraStudents: [] };
  }
}
