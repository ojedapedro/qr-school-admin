import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { QRScanner } from './components/QRScanner';
import { AttendanceStats } from './components/AttendanceStats';
import { PaymentModule } from './components/PaymentModule';
import { StudentProfile } from './components/StudentProfile';
import { MoraReport } from './components/MoraReport';
import { UserManagement } from './components/UserManagement';
import { 
  LayoutDashboard, 
  QrCode, 
  BarChart3, 
  Users, 
  ShieldCheck,
  Menu,
  X,
  CreditCard,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPWA } from './components/InstallPWA';

type View = 'admin' | 'scanner' | 'stats' | 'payments' | 'profile' | 'mora-report' | 'users';

export default function App() {
  const { user, appUser, studentData, loading } = useAuth();
  const [activeView, setActiveView] = useState<View>('scanner');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (appUser?.role === 'student') {
      setActiveView('profile');
    }
  }, [appUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 bg-brand-card border border-white/5 rounded-3xl flex items-center justify-center shadow-2xl">
            <ShieldCheck size={40} className="text-brand-accent animate-bounce" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tighter">QR-School<span className="text-brand-accent">.</span></h1>
            <div className="flex items-center gap-2 justify-center">
              <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce delay-150" />
              <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce delay-300" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <Auth />
      </div>
    );
  }

  const isAdmin = appUser?.role === 'admin';

  const navItems = [
    { id: 'scanner', label: 'Escáner', icon: QrCode, roles: ['admin', 'teacher'] },
    { id: 'payments', label: 'Pagos', icon: CreditCard, roles: ['admin'] },
    { id: 'admin', label: 'Alumnos', icon: Users, roles: ['admin'] },
    { id: 'users', label: 'Usuarios', icon: ShieldCheck, roles: ['admin'] },
    { id: 'stats', label: 'Reportes', icon: BarChart3, roles: ['admin', 'teacher'] },
    { id: 'profile', label: 'Mi QR', icon: User, roles: ['student'] },
  ].filter(item => item.roles.includes(appUser?.role || ''));

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row text-white">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex flex-col w-72 bg-brand-card/30 border-r border-white/5 p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-brand-accent/20 p-2 rounded-xl text-brand-accent">
              <ShieldCheck size={28} />
            </div>
            <h1 className="font-black text-2xl tracking-tighter">QR-School<span className="text-brand-accent">.</span></h1>
          </div>

          <nav className="flex-1 space-y-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group",
                  activeView === item.id 
                    ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" 
                    : "text-brand-text-muted hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon size={22} className={cn(activeView === item.id ? "text-white" : "group-hover:text-brand-accent transition-colors")} />
                <span className="font-bold">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 border-t border-white/5">
            <Auth />
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden bg-brand-card/50 backdrop-blur-md border-b border-white/5 p-5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <ShieldCheck size={24} className="text-brand-accent" />
            <span className="font-black text-xl tracking-tighter">QR-School<span className="text-brand-accent">.</span></span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-white/5 rounded-lg"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="fixed inset-0 z-50 md:hidden bg-brand-bg p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={32} className="text-brand-accent" />
                  <span className="font-black text-2xl tracking-tighter">QR-School<span className="text-brand-accent">.</span></span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-xl">
                  <X size={24} />
                </button>
              </div>
              
              <nav className="space-y-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as View);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-5 px-6 py-5 rounded-2xl text-xl transition-all",
                      activeView === item.id 
                        ? "bg-brand-accent text-white font-bold shadow-xl shadow-brand-accent/20" 
                        : "text-brand-text-muted bg-white/5"
                    )}
                  >
                    <item.icon size={28} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto">
                <Auth />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10 lg:p-14 max-w-7xl mx-auto w-full overflow-y-auto">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {activeView === 'scanner' && (
              <QRScanner onNavigateToPayments={() => setActiveView('payments')} />
            )}
            {activeView === 'payments' && <PaymentModule />}
            {activeView === 'users' && isAdmin && <UserManagement />}
            {activeView === 'admin' && isAdmin && (
              <AdminDashboard onNavigateToPayments={() => setActiveView('payments')} />
            )}
            {activeView === 'stats' && (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <button 
                    onClick={() => setActiveView('mora-report')}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-3 rounded-2xl hover:bg-red-500/20 transition-all active:scale-95 font-bold shadow-lg"
                  >
                    <BarChart3 size={20} />
                    Reporte de Mora
                  </button>
                </div>
                <AttendanceStats />
              </div>
            )}
            {activeView === 'mora-report' && (
              <MoraReport onBack={() => setActiveView('stats')} />
            )}
            {activeView === 'profile' && studentData && (
              <StudentProfile student={studentData} />
            )}
          </motion.div>
        </main>
        <InstallPWA />
      </div>
    </ErrorBoundary>
);

}
