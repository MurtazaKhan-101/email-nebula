import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import {
  Mail,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import axios from "axios";
import api from "../config/api";

const GmailSetup = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [authUrl, setAuthUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [gmailStatus, setGmailStatus] = useState(null);

  useEffect(() => {
    checkGmailStatus();
    getAuthUrl();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const response = await api.get("/auth/gmail/status");
      setGmailStatus(response.data);
    } catch (error) {
      console.error("Failed to check Gmail status:", error);
    }
  };

  const getAuthUrl = async () => {
    try {
      const response = await api.get("/auth/google/url");
      setAuthUrl(response.data.authUrl);
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      toast.error("Failed to initialize Google authentication");
    }
  };

  const handleConnectGmail = () => {
    if (authUrl) {
      setIsConnecting(true);
      window.location.href = authUrl;
    } else {
      toast.error("Authentication URL not available. Please refresh the page.");
    }
  };

  const handleDisconnectGmail = async () => {
    if (
      window.confirm(
        "Are you sure you want to disconnect your Gmail account? This will stop all active email campaigns."
      )
    ) {
      try {
        await api.delete("/auth/gmail/disconnect");
        setGmailStatus({ connected: false });
        toast.success("Gmail account disconnected successfully");
      } catch (error) {
        console.error("Failed to disconnect Gmail:", error);
        toast.error("Failed to disconnect Gmail account");
      }
    }
  };

  if (gmailStatus?.connected) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="card p-8">
          <div className="text-center mb-6">
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Gmail Connected Successfully!
            </h1>
            <p className="text-gray-600">
              Your Gmail account is connected and ready to send bulk emails.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-3">
              <Mail className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">
                  Connected Account: {gmailStatus.email}
                </h3>
                <p className="text-sm text-green-700">
                  Connected on{" "}
                  {new Date(gmailStatus.connectedAt).toLocaleDateString()}
                </p>
                {gmailStatus.expired && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Token expired - please refresh your connection
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 mb-3">What's Next?</h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">
                  Your emails will be sent from{" "}
                  <strong>{gmailStatus.email}</strong>
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">
                  Create email campaigns with custom subject and content
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">
                  Upload recipient lists via Google Sheets
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">
                  Track email delivery and campaign performance
                </span>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 mt-8">
            <button
              onClick={() => navigate("/create-campaign")}
              className="flex-1 btn btn-primary"
            >
              Create Your First Campaign
            </button>

            <button onClick={handleDisconnectGmail} className="btn btn-danger">
              Disconnect Gmail
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="card p-8">
        <div className="text-center mb-8">
          <Mail className="mx-auto h-16 w-16 text-blue-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Connect Your Gmail Account
          </h1>
          <p className="text-gray-600">
            Connect your Gmail account to start sending bulk emails with your
            own sender address.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-medium text-blue-900 mb-3">
              Why do we need access to your Gmail?
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                <span>Send emails on your behalf using your Gmail address</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                <span>Maintain your sender reputation and deliverability</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                <span>
                  Recipients see emails coming from your trusted domain
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-2">
                  Security & Privacy
                </h4>
                <ul className="space-y-1 text-sm text-yellow-800">
                  <li>• We only request permission to send emails</li>
                  <li>• Your credentials are encrypted and stored securely</li>
                  <li>• You can disconnect at any time</li>
                  <li>• We never read or access your existing emails</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-3">
              What happens next?
            </h4>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                  1
                </span>
                <span>You'll be redirected to Google to authorize access</span>
              </li>
              <li className="flex space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                  2
                </span>
                <span>Grant permission for email sending only</span>
              </li>
              <li className="flex space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                  3
                </span>
                <span>Return here to start creating email campaigns</span>
              </li>
            </ol>
          </div>

          <button
            onClick={handleConnectGmail}
            disabled={!authUrl || isConnecting}
            className="w-full btn btn-primary py-4 text-lg flex items-center justify-center space-x-3"
          >
            <Mail className="h-6 w-6" />
            <span>{isConnecting ? "Connecting..." : "Connect with Gmail"}</span>
            <ExternalLink className="h-5 w-5" />
          </button>

          <p className="text-xs text-gray-500 text-center">
            By connecting your Gmail account, you agree to our terms of service
            and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GmailSetup;
