import { BrowserRouter, Routes, Route } from 'react-router';
import { ThemeProvider } from './components/ThemeProvider';
import { ApolloWrapper } from './components/ApolloWrapper';
import HomePage from './routes/Home';
import DocsPage from './routes/Docs';
import SessionPage from './routes/Session';
import AnalyticsPage from './routes/Analytics';
import PresenterPage from './routes/Presenter';

export function App() {
  return (
    <ThemeProvider>
      <ApolloWrapper>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/session/:code" element={<SessionPage />} />
            <Route path="/session/:code/analytics" element={<AnalyticsPage />} />
            <Route path="/session/:code/present" element={<PresenterPage />} />
          </Routes>
        </BrowserRouter>
      </ApolloWrapper>
    </ThemeProvider>
  );
}
