import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout, PortalLayout } from './components/layout';
import { AuthGuard } from './components/guard';
import { Loading } from './components/ui';

const LandingPage = lazy(() =>
  import('./pages/public/LandingPage').then((module) => ({ default: module.LandingPage })),
);
const RequestPage = lazy(() =>
  import('./pages/public/RequestPage').then((module) => ({ default: module.RequestPage })),
);
const SuccessPage = lazy(() =>
  import('./pages/public/SuccessPage').then((module) => ({ default: module.SuccessPage })),
);
const StatusPage = lazy(() =>
  import('./pages/public/StatusPage').then((module) => ({ default: module.StatusPage })),
);
const TrackPage = lazy(() =>
  import('./pages/public/TrackPage').then((module) => ({ default: module.TrackPage })),
);
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('./pages/pharmacy/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const PharmacyDashboard = lazy(() =>
  import('./pages/pharmacy/DashboardPage').then((module) => ({
    default: module.PharmacyDashboardPage,
  })),
);
const PharmacyRequests = lazy(() =>
  import('./pages/pharmacy/RequestsPage').then((module) => ({ default: module.RequestsPage })),
);
const PharmacyHistory = lazy(() =>
  import('./pages/pharmacy/RequestsPage').then((module) => ({
    default: () => <module.RequestsPage history />,
  })),
);
const PharmacyRequestDetail = lazy(() =>
  import('./pages/pharmacy/RequestDetailPage').then((module) => ({
    default: module.RequestDetailPage,
  })),
);
const PharmacyProfile = lazy(() =>
  import('./pages/pharmacy/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);
const RegistrationStatus = lazy(() =>
  import('./pages/pharmacy/RegistrationStatusPage').then((module) => ({
    default: module.RegistrationStatusPage,
  })),
);
const AdminDashboard = lazy(() =>
  import('./pages/admin/DashboardPage').then((module) => ({ default: module.AdminDashboardPage })),
);
const AdminPrescriptions = lazy(() =>
  import('./pages/admin/PrescriptionsPage').then((module) => ({
    default: module.AdminPrescriptionsPage,
  })),
);
const AdminRegistrations = lazy(() =>
  import('./pages/admin/RegistrationsPage').then((module) => ({
    default: module.RegistrationsPage,
  })),
);
const AdminRegistrationDetail = lazy(() =>
  import('./pages/admin/RegistrationDetailPage').then((module) => ({
    default: module.RegistrationDetailPage,
  })),
);
const AdminPharmacies = lazy(() =>
  import('./pages/admin/PharmaciesPage').then((module) => ({ default: module.PharmaciesPage })),
);
const AdminUsers = lazy(() =>
  import('./pages/admin/UsersPage').then((module) => ({ default: module.UsersPage })),
);
const AdminInsurance = lazy(() =>
  import('./pages/admin/InsurancePage').then((module) => ({ default: module.InsurancePage })),
);
const AdminLogs = lazy(() =>
  import('./pages/admin/LogsPage').then((module) => ({ default: module.LogsPage })),
);

export const App = () => (
  <Suspense fallback={<Loading />}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/request" element={<RequestPage />} />
        <Route path="/request/success" element={<SuccessPage />} />
        <Route path="/request/track" element={<TrackPage />} />
        <Route path="/request/:publicId" element={<StatusPage />} />
        <Route path="/pharmacy/login" element={<LoginPage kind="pharmacy" />} />
        <Route path="/pharmacy/register" element={<RegisterPage />} />
        <Route path="/admin/login" element={<LoginPage kind="admin" />} />
      </Route>
      <Route element={<AuthGuard roles={['PHARMACY_ADMIN', 'PHARMACY_USER']} />}>
        <Route element={<PortalLayout kind="pharmacy" />}>
          <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
          <Route path="/pharmacy/requests" element={<PharmacyRequests />} />
          <Route path="/pharmacy/history" element={<PharmacyHistory />} />
          <Route path="/pharmacy/requests/:id" element={<PharmacyRequestDetail />} />
          <Route path="/pharmacy/profile" element={<PharmacyProfile />} />
          <Route path="/pharmacy/registration-status" element={<RegistrationStatus />} />
        </Route>
      </Route>
      <Route element={<AuthGuard roles={['ADMIN', 'SUPER_ADMIN']} />}>
        <Route element={<PortalLayout kind="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/prescriptions" element={<AdminPrescriptions />} />
          <Route path="/admin/pharmacy-registrations" element={<AdminRegistrations />} />
          <Route path="/admin/pharmacy-registrations/:id" element={<AdminRegistrationDetail />} />
          <Route path="/admin/pharmacies" element={<AdminPharmacies />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/insurance" element={<AdminInsurance />} />
          <Route path="/admin/logs" element={<AdminLogs />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);
