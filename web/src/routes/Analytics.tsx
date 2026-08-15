import { Navigate, useParams } from 'react-router';

// Analytics folded into the settings page; this path is kept as a redirect so
// existing links and bookmarks still land somewhere useful.
export default function AnalyticsPage() {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={`/session/${code}/settings`} replace />;
}
