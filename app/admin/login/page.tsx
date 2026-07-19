import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm px-5 pt-20">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
