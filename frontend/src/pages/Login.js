import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data) => {
    setIsLoading(true);
    const success = await login(data.email, data.password);
    setIsLoading(false);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1761792425134-7e09471c5b55?crop=entropy&cs=srgb&fm=jpg&q=85")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(100%)'
        }}
      />
      
      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 font-display">SIMAN-G</h1>
          <p className="text-slate-400">Sistem Informasi Manajemen Aset Negara</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-white">Login</CardTitle>
            <CardDescription className="text-slate-400">
              Masukan email dan password untuk mengakses sistem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Email</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  {...register('email', { required: 'Email wajib diisi' })}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:ring-amber-500 focus:border-amber-500"
                />
                {errors.email && <span className="text-xs text-red-400">{errors.email.message}</span>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password wajib diisi' })}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:ring-amber-500 focus:border-amber-500"
                />
                {errors.password && <span className="text-xs text-red-400">{errors.password.message}</span>}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk Aplikasi'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-xs text-slate-500">
              &copy; 2025 Kementerian Keuangan Republik Indonesia
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
