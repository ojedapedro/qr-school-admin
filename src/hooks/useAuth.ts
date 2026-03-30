import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { AppUser, UserRole, Student } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            let data = userDoc.data() as AppUser;
            
            // Enforce admin role for master email
            if (firebaseUser.email === "ojeda.pedro2302@gmail.com" && data.role !== 'admin') {
              data.role = 'admin';
              await setDoc(doc(db, 'users', firebaseUser.uid), data);
            }
            
            setAppUser(data);
            
            // If it's a student, fetch their student record
            if (data.role === 'student') {
              const q = query(collection(db, 'students'), where('email', '==', firebaseUser.email));
              const studentSnap = await getDocs(q);
              if (!studentSnap.empty) {
                setStudentData(studentSnap.docs[0].data() as Student);
              }
            }
          } else {
            // Check if this email belongs to a student
            const q = query(collection(db, 'students'), where('email', '==', firebaseUser.email));
            const studentSnap = await getDocs(q);
            
            let role: UserRole = 'teacher';
            if (firebaseUser.email === "ojeda.pedro2302@gmail.com") {
              role = 'admin';
            } else if (!studentSnap.empty) {
              role = 'student';
              setStudentData(studentSnap.docs[0].data() as Student);
            }

            const newAppUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role,
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newAppUser);
            setAppUser(newAppUser);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          console.error("Error fetching user data:", error);
        }
      } else {
        setAppUser(null);
        setStudentData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, appUser, studentData, loading };
}
