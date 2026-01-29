import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sprout, MessageCircle, History } from "lucide-react";

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Sprout, label: "Scan" },
    { path: "/chat", icon: MessageCircle, label: "Chat" },
    { path: "/history", icon: History, label: "History" },
  ];

  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      
      {/* Bottom Navigation */}
      <nav 
        data-testid="bottom-navigation"
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-border z-50"
      >
        <div className="flex justify-around items-center p-4 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-6 py-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
