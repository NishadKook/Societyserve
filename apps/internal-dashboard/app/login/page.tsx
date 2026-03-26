'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

const phoneSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter valid Indian mobile number with +91'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const onSendOtp = async (data: PhoneForm) => {
    setLoading(true);
    try {
      await authService.sendOtp(data.phone);
      setPhone(data.phone);
      setStep('otp');
      toast.success('OTP sent');
    } catch {
      toast.error('Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (data: OtpForm) => {
    setLoading(true);
    try {
      const res = await authService.verifyOtp(phone, data.otp);
      const { accessToken, refreshToken } = res.data;

      const payload = JSON.parse(atob(accessToken.split('.')[1])) as {
        sub: string;
        phone: string;
        role: string;
      };

      if (payload.role !== 'SUPER_ADMIN') {
        toast.error('Super admin access only.');
        return;
      }

      setAuth({ id: payload.sub, phone: payload.phone, role: payload.role }, accessToken, refreshToken);
      toast.success('Welcome, Super Admin!');
      router.push('/dashboard');
    } catch {
      toast.error('Invalid OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">SocietyServe</h1>
            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              Internal
            </span>
          </div>
          <p className="text-gray-500 text-sm">Super admin access only</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                {...phoneForm.register('phone')}
                placeholder="+919999000004"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {phoneForm.formState.errors.phone && (
                <p className="text-red-500 text-xs mt-1">
                  {phoneForm.formState.errors.phone.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
            <p className="text-sm text-gray-600">
              OTP sent to <strong>{phone}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter OTP
              </label>
              <input
                {...otpForm.register('otp')}
                placeholder="123456"
                maxLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 tracking-widest text-center text-lg"
              />
              {otpForm.formState.errors.otp && (
                <p className="text-red-500 text-xs mt-1">
                  {otpForm.formState.errors.otp.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-gray-500 text-sm hover:underline"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
