import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { Mail, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import api from "../config/api";

const Login = () => {
  const { login } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authUrl, setAuthUrl] = useState("");

  useEffect(() => {
    // Get Google OAuth URL when component mounts
    const getAuthUrl = async () => {
      try {
        const response = await api.get("/auth/google/url");
        setAuthUrl(response.data.authUrl);
      } catch (error) {
        console.error("Failed to get auth URL:", error);
        toast.error("Failed to initialize Google authentication");
      }
    };

    getAuthUrl();

    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const email = urlParams.get("email");
    const name = urlParams.get("name");
    const error = urlParams.get("error");

    if (error) {
      let errorMessage = "Authentication failed";
      switch (error) {
        case "oauth_failed":
          errorMessage = "OAuth authentication was cancelled or failed";
          break;
        case "no_code":
          errorMessage = "No authorization code received from Google";
          break;
        case "auth_failed":
          errorMessage = "Failed to process authentication";
          break;
        default:
          errorMessage = "Authentication error occurred";
      }
      toast.error(errorMessage);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (token && email) {
      handleOAuthSuccess(token, email, name);
    }
  }, []);

  const handleOAuthSuccess = (token, email, name) => {
    setIsAuthenticating(true);
    try {
      const userData = {
        email: decodeURIComponent(email),
        name: name ? decodeURIComponent(name) : "",
      };

      login(userData, token);
      toast.success("Successfully authenticated with Google!");

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error("Failed to process authentication:", error);
      toast.error("Failed to complete authentication");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogin = () => {
    if (authUrl) {
      window.location.href = authUrl;
    } else {
      toast.error("Authentication URL not available. Please refresh the page.");
    }
  };

  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Authenticating...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we set up your account
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Bulk Email Platform
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Send bulk emails using your own Gmail account
          </p>
        </div>

        <div className="card p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Get Started
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Connect your Gmail account to start sending bulk emails with
                your own sender address.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-900">
                    What you'll get:
                  </h4>
                  <ul className="mt-2 text-sm text-blue-800 space-y-1">
                    <li>• Send emails from your own Gmail address</li>
                    <li>• Track email delivery and responses</li>
                    <li>• Manage multiple email campaigns</li>
                    <li>• Secure OAuth authentication</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-900">
                    Privacy & Security:
                  </h4>
                  <p className="mt-1 text-sm text-yellow-800">
                    We only request permission to send emails on your behalf.
                    Your data is encrypted and secure.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={!authUrl}
              className="w-full btn btn-primary py-3 text-lg flex items-center justify-center space-x-2"
            >
              <Mail className="h-5 w-5" />
              <span>Connect with Gmail</span>
              <ExternalLink className="h-4 w-4" />
            </button>

            <p className="text-xs text-gray-500 text-center">
              By connecting your Gmail account, you agree to our terms of
              service and privacy policy. You can disconnect at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
