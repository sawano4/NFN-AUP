import AppLayout from '@/components/AppLayout';
import RegistrationFormContainer from './components/RegistrationFormContainer';

export default function GuidedRegistrationFormPage() {
  return (
    <AppLayout showHeader={false}>
      <RegistrationFormContainer />
    </AppLayout>
  );
}