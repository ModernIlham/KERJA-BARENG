import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2 } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-0 w-full h-[50vh] bg-blue-600/10 skew-y-3 transform -translate-y-20" />
            <div className="absolute bottom-0 right-0 w-full h-[50vh] bg-slate-200/50 -skew-y-3 transform translate-y-20" />
        </div>
      
      <div className="w-full max-w-lg z-10 px-4">
        <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
                <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 font-display tracking-tight">SIMAN-G</h1>
            <p className="text-slate-500">Sistem Informasi Manajemen Aset Negara & Kepegawaian</p>
        </div>

        <Card className="border-slate-200 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-slate-900">Selamat Datang</CardTitle>
            <CardDescription className="text-slate-500">
              Masukan kredensial akun anda untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  {...register('email', { required: 'Email wajib diisi' })}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password wajib diisi' })}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 mt-2 shadow-md shadow-blue-600/10"
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
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center text-xs text-slate-400">
          &copy; 2025 Kementerian Keuangan Republik Indonesia
        </div>
      </div>
    </div>
  );
}
