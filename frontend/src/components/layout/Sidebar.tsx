import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  BookOpen,
  Camera,
  ClipboardList,
  QrCode,
  BarChart3,
  LogOut,
  GraduationCap,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const professorNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/professor' },
  { icon: BookOpen, label: 'My Classes', href: '/professor/classes' },
  { icon: Camera, label: 'Take Attendance', href: '/professor/capture' },
    { icon: ClipboardList, label: 'Attendance Results', href: '/professor/results' },
    { icon: ClipboardCheck, label: 'Sessions', href: '/professor/sessions' },
  { icon: GraduationCap, label: 'Enrollments', href: '/professor/enrollments' },
  { icon: UserCircle, label: 'Profile', href: '/profile' },
];

const studentNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/student' },
  { icon: BarChart3, label: 'My Attendance', href: '/student/attendance' },
  { icon: QrCode, label: 'Verify Attendance', href: '/student/verify' },
  { icon: BookOpen, label: 'Enroll Classes', href: '/student/enroll' },
  { icon: UserCircle, label: 'Profile', href: '/profile' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = user?.role === 'professor' ? professorNav : studentNav;

  // Close mobile menu when navigating
  const handleNavClick = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center px-4 gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-muted-foreground hover:text-foreground"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1 className="font-heading font-bold text-lg leading-tight">AttendEase</h1>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 top-16 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col',
          'hidden md:flex',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn('p-4 border-b border-border flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-slide-in">
              <h1 className="font-heading font-bold text-lg leading-tight">AttendEase</h1>
              <p className="text-xs text-muted-foreground">Smart Attendance</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary-foreground')} />
                {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-card shadow-soft hover:bg-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* User Profile */}
        <div className={cn('p-4 border-t border-border', collapsed && 'p-2')}>
          <Link to="/profile" className="block">
            <div className={cn('flex items-center gap-3 hover:bg-accent rounded-lg p-2 transition-colors', collapsed && 'flex-col')}>
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
              )}
            </div>
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="w-full mt-2 text-muted-foreground hover:text-destructive justify-start"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          )}
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="h-8 w-8 mt-2 text-muted-foreground hover:text-destructive mx-auto"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      <div
        className={cn(
          'fixed left-0 top-16 z-40 w-64 h-[calc(100vh-4rem)] bg-card border-r border-border flex flex-col transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0')} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile User Profile */}
        <div className="p-4 border-t border-border">
          <Link to="/profile" onClick={handleNavClick} className="block">
            <div className="flex items-center gap-3 hover:bg-accent rounded-lg p-2 transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full mt-2 text-muted-foreground hover:text-destructive justify-start"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}
