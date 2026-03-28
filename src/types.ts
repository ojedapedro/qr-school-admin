export type PaymentStatus = 'Solvente' | 'Mora';
export type UserRole = 'admin' | 'teacher' | 'student';

export interface Student {
  id: string;
  name: string;
  email?: string;
  grade: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  studentName: string;
  grade: string;
  timestamp: string;
}

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
}

export interface PaymentRecord {
  id?: string;
  studentId: string;
  studentName: string;
  amount: number;
  month: string;
  date: string;
  recordedBy: string;
}
