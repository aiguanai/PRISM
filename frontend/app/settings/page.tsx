import { redirect } from 'next/navigation';

// Settings removed for now — redirect any direct navigation back to the dashboard.
export default function SettingsPage() {
  redirect('/');
}
