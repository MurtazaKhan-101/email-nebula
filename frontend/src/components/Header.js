import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, LogOut, Home, Plus, History } from "lucide-react";

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/images/nebula.png" alt="Logo" className="h-60 w-60" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            {/* <Mail className="h-8 w-8 text-blue-600" /> */}
            <img src="/images/nebula.png" alt="Logo" className="h-60 w-60" />
            {/* <span className="text-xl font-bold text-gray-900">
              Bulk Email Platform
            </span> */}
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/dashboard"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isActive("/dashboard")
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/create-campaign"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isActive("/create-campaign")
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Create Campaign</span>
            </Link>

            <Link
              to="/campaigns"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isActive("/campaigns")
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <History className="h-4 w-4" />
              <span>Campaigns</span>
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">{user.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
