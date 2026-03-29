import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppUser, UserRole } from '../types';
import { Shield, User, Trash2, Loader2, Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      const usersData = snap.docs.map(doc => doc.data() as AppUser);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    setUpdatingId(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario del sistema?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Gestión de Usuarios</h2>
          <p className="text-brand-text-muted">Administra los roles y accesos del sistema.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por correo..." 
            className="w-full brand-input pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={20} />
          <select 
            className="w-full brand-input pl-12 appearance-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="teacher">Profesor</option>
            <option value="student">Alumno</option>
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-brand-accent" size={32} />
            <p className="text-brand-text-muted">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-brand-text-muted">Usuario</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-brand-text-muted">Rol Actual</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-brand-text-muted">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <motion.tr 
                    key={user.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-card flex items-center justify-center text-brand-text-muted border border-white/5">
                          <User size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold">{user.email}</span>
                          <span className="text-[10px] text-brand-text-muted font-mono">{user.uid}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {user.role === 'admin' ? (
                          <span className="px-2 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Shield size={10} /> Administrador
                          </span>
                        ) : user.role === 'teacher' ? (
                          <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-wider">
                            Profesor
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                            Alumno
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <select 
                          className="bg-brand-card border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-accent transition-colors"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                          disabled={updatingId === user.uid || user.email === "ojeda.pedro2302@gmail.com"}
                        >
                          <option value="admin">Hacer Admin</option>
                          <option value="teacher">Hacer Profesor</option>
                          <option value="student">Hacer Alumno</option>
                        </select>
                        
                        {user.email !== "ojeda.pedro2302@gmail.com" && (
                          <button 
                            onClick={() => handleDeleteUser(user.uid)}
                            className="p-2 text-brand-text-muted hover:text-red-400 transition-colors"
                            title="Eliminar Usuario"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        
                        {updatingId === user.uid && <Loader2 className="animate-spin text-brand-accent" size={16} />}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="p-12 text-center text-brand-text-muted">
                No se encontraron usuarios que coincidan con la búsqueda.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
