import { useState } from 'react';
import { Layout } from './components/Layout';
import { useRoute } from './lib/router';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Alerts } from './pages/Alerts';
import { Workers, WorkerProfile } from './pages/Workers';
import { Salesmen, SalesmanProfile } from './pages/Salesmen';
import { Cashbook } from './pages/Cashbook';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ShareView } from './pages/ShareView';

export default function App() {
  const route = useRoute();
  const [searchQuery, setSearchQuery] = useState('');

  // Share view is a standalone page (no app shell)
  if (route.name === 'share') {
    return <ShareView token={route.token} />;
  }

  return (
    <Layout onSearch={setSearchQuery}>
      {route.name === 'dashboard' && <Dashboard searchQuery={searchQuery} />}
      {route.name === 'orders' && <Orders />}
      {route.name === 'alerts' && <Alerts />}
      {route.name === 'workers' && <Workers />}
      {route.name === 'worker' && <WorkerProfile id={route.id} />}
      {route.name === 'salesmen' && <Salesmen />}
      {route.name === 'salesman' && <SalesmanProfile id={route.id} />}
      {route.name === 'cashbook' && <Cashbook />}
      {route.name === 'reports' && <Reports />}
      {route.name === 'settings' && <Settings />}
    </Layout>
  );
}
