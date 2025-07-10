import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import PromptGeneratorPage from "@/pages/prompt-generator";
import PromptResultsPage from "@/pages/prompts";
import CompetitorsPage from "@/pages/competitors";
import SourcesPage from "@/pages/sources";
import SettingsPage from "@/pages/settings";
import AnalysisProgressPage from "@/pages/analysis-progress";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/prompt-generator" component={PromptGeneratorPage} />
        <Route path="/" component={Dashboard} />
        <Route path="/prompt-results" component={PromptResultsPage} />
        <Route path="/competitors" component={CompetitorsPage} />
        <Route path="/sources" component={SourcesPage} />
        <Route path="/analysis-progress" component={AnalysisProgressPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
