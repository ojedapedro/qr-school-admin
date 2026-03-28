import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, LogOut, ShieldCheck, User as UserIcon, Loader2, Eye, EyeOff, CheckCircle2, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';

export function Auth() {
  const { user, appUser, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const login = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login error:', error);
      const currentDomain = window.location.hostname;
      
      if (error.code === 'auth/unauthorized-domain') {
        setError(`El dominio "${currentDomain}" no está autorizado en Firebase. Por favor, verifica que aparezca exactamente así en la lista de "Dominios autorizados" de tu consola de Firebase.`);
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('El inicio de sesión con Google no está habilitado. Por favor, actívalo en la consola de Firebase (Authentication > Sign-in method).');
      } else {
        setError(`Error de autenticación (${error.code}): ${error.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => signOut(auth);

  if (loading) return <Loader2 className="animate-spin text-brand-accent" />;

  if (!user) {
    return (
      <div className="fixed inset-0 bg-brand-bg flex items-center justify-center p-4 md:p-8 overflow-hidden">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
          
          {/* Left Side: Visuals */}
          <div className="hidden md:flex relative h-[600px] items-center justify-center">
            {/* Background Circle Gradient */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute w-80 h-80 border border-white/5 rounded-full animate-spin-slow" />
            </div>

            {/* Soccer Player Image */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10"
            >
              <img 
                src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800" 
                alt="Young Soccer Player" 
                className="h-[500px] object-contain drop-shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Floating Widgets */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute top-20 left-10 glass-card p-4 flex items-center gap-3"
            >
              <div className="bg-green-500/20 p-2 rounded-lg text-green-500">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="text-[10px] text-brand-text-muted uppercase font-bold">Asistencia</div>
                <div className="text-lg font-bold">98.5%</div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 5, delay: 1 }}
              className="absolute bottom-20 right-10 glass-card p-4 flex items-center gap-3"
            >
              <div className="bg-brand-accent/20 p-2 rounded-lg text-brand-accent">
                <Users size={20} />
              </div>
              <div>
                <div className="text-[10px] text-brand-text-muted uppercase font-bold">Alumnos</div>
                <div className="text-lg font-bold">1,240</div>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Login Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col space-y-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-brand-accent to-purple-400 rounded-full flex items-center justify-center shadow-lg shadow-brand-accent/30">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <h1 className="text-4xl font-black tracking-tighter">
                QR-School<span className="text-brand-accent">.</span>
              </h1>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Bienvenido de nuevo</h2>
              <p className="text-brand-text-muted">Inicia sesión para gestionar tu institución deportiva.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-brand-text-muted">Correo Electrónico</label>
                <input 
                  type="text" 
                  placeholder="admin@escuela.com" 
                  className="w-full brand-input"
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-brand-text-muted">Contraseña</label>
                <div className="relative">
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full brand-input"
                    disabled
                  />
                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-muted">
                    <Eye size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-brand-card accent-brand-accent" />
                  <span className="text-brand-text-muted">Recordarme</span>
                </label>
                <button className="text-brand-accent font-medium hover:underline">¿Olvidaste tu contraseña?</button>
              </div>

              <button
                onClick={login}
                disabled={isLoggingIn}
                className="w-full brand-button flex items-center justify-center gap-3"
              >
                {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                Ingresar con Google
              </button>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="shrink-0" size={18} />
                    <p>{error}</p>
                  </div>
                  <button 
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity underline text-left"
                  >
                    {showDebug ? 'Ocultar Diagnóstico' : 'Ver Diagnóstico Técnico'}
                  </button>
                  
                  {showDebug && (
                    <div className="mt-2 p-3 bg-black/20 rounded-lg font-mono text-[10px] break-all space-y-1 text-red-300/80">
                      <p>DOMINIO ACTUAL: {window.location.hostname}</p>
                      <p>PROJECT_ID: {auth.app.options.projectId}</p>
                      <p>API_KEY: {auth.app.options.apiKey?.substring(0, 10)}...</p>
                      <p>AUTH_DOMAIN: {auth.app.options.authDomain}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-4 text-brand-text-muted text-sm">
              <div className="h-px flex-1 bg-white/5" />
              <span>O continúa con</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <p className="text-center text-sm text-brand-text-muted">
              ¿No tienes una cuenta? <button className="text-brand-accent font-bold hover:underline">Contáctanos</button>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 glass-card p-2 pl-4 border-white/5">
      <div className="flex flex-col items-end">
        <span className="text-sm font-bold truncate max-w-[120px]">{user.displayName || user.email}</span>
        <span className="text-[10px] uppercase tracking-wider font-black text-brand-accent">
          {appUser?.role === 'admin' ? 'Administrador' : appUser?.role === 'student' ? 'Alumno' : 'Profesor'}
        </span>
      </div>
      {user.photoURL ? (
        <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-brand-accent/20 shadow-sm" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-brand-card flex items-center justify-center text-brand-text-muted border border-white/5">
          <UserIcon size={20} />
        </div>
      )}
      <button
        onClick={logout}
        className="p-2 text-brand-text-muted hover:text-red-400 transition-all active:scale-90"
        title="Cerrar Sesión"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}
