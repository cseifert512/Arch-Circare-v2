import { Route, Switch } from 'wouter';
import { SearchStoreProvider } from './lib/searchStore';
import IntroPage from './pages/IntroPage';
import ResultsPage from './pages/ResultsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';

export default function App() {
  return (
    <SearchStoreProvider>
      <Switch>
        <Route path="/" component={IntroPage} />
        <Route path="/results" component={ResultsPage} />
        <Route path="/projects/:projectId" component={ProjectDetailPage} />
        <Route>
          {(params) => <div style={{ padding: 24 }}>Not Found</div>}
        </Route>
      </Switch>
    </SearchStoreProvider>
  );
}
