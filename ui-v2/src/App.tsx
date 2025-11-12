import { Route, Switch } from "wouter";
import { Homepage } from "./pages/Homepage";
import { TextSearchPage } from "./pages/TextSearchPage";
import { ImageSearchPage } from "./pages/ImageSearchPage";
import { ResultsPage } from "./pages/ResultsPage";
import { EmptyResultsPage } from "./pages/EmptyResultsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Switch>
        <Route path="/" component={Homepage} />
        <Route path="/search/text" component={TextSearchPage} />
        <Route path="/search/image" component={ImageSearchPage} />
        <Route path="/results" component={ResultsPage} />
        <Route path="/empty" component={EmptyResultsPage} />
        <Route path="/project/:id" component={ProjectDetailPage} />
        <Route>
          <Homepage />
        </Route>
      </Switch>
      <Toaster />
    </div>
  );
}
