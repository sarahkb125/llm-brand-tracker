import { Link, useLocation } from "wouter";
import { 
  ChartLine, 
  Home, 
  MessageSquare, 
  Users, 
  ExternalLink, 
  Settings, 
  User,
  Activity,
  Zap
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const navigationItems = [
    { id: "prompt-generator", label: "Prompt Generator", icon: Zap, path: "/prompt-generator" },
    { id: "dashboard", label: "Dashboard", icon: Home, path: "/" },
    { id: "prompt-results", label: "Prompt Results", icon: MessageSquare, path: "/prompt-results" },
    { id: "competitors", label: "Competitors", icon: Users, path: "/competitors" },
    { id: "sources", label: "Sources", icon: ExternalLink, path: "/sources" },
    { id: "analysis", label: "Analysis Progress", icon: Activity, path: "/analysis-progress" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo & Title */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ChartLine className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Brand Tracker</h1>
            <p className="text-xs text-slate-500">Brand Analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg w-full text-left transition-colors
                  ${isActive 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Status Indicator */}
        <div className="mt-8 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-emerald-700">API Connected</span>
          </div>
          <p className="text-xs text-emerald-600 mt-1">Last sync: 2 min ago</p>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Analysis User</p>
            <p className="text-xs text-slate-500">Brand Analyst</p>
          </div>
        </div>
      </div>
    </div>
  );
}
