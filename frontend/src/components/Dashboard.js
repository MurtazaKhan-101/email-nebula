import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  Mail,
  Plus,
  Activity,
  Users,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import api from "../config/api";

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [gmailStatus, setGmailStatus] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingToken, setRefreshingToken] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch Gmail status and campaigns in parallel
      const [gmailResponse, campaignsResponse] = await Promise.all([
        api.get("/auth/gmail/status"),
        api.get("/api/campaigns/list"),
      ]);

      setGmailStatus(gmailResponse.data);
      setCampaigns(campaignsResponse.data.campaigns || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setRefreshingToken(true);
      await api.post("/auth/gmail/refresh");
      await fetchDashboardData();
      toast.success("Gmail token refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh token:", error);
      toast.error("Failed to refresh Gmail token");
    } finally {
      setRefreshingToken(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "running":
        return "text-blue-600 bg-blue-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const recentCampaigns = campaigns.slice(0, 5);
  const totalSent = campaigns.reduce(
    (sum, campaign) => sum + (campaign.sent_count || 0),
    0
  );
  const totalRecipients = campaigns.reduce(
    (sum, campaign) => sum + (campaign.total_recipients || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user.name || user.email}!
        </h1>
        <p className="text-blue-100">
          Manage your bulk email campaigns and track their performance.
        </p>
      </div>

      {/* Gmail Status Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-blue-600" />
            Gmail Connection
          </h2>
          {gmailStatus?.expired && (
            <button
              onClick={handleRefreshToken}
              disabled={refreshingToken}
              className="btn btn-secondary flex items-center space-x-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshingToken ? "animate-spin" : ""}`}
              />
              <span>Refresh Token</span>
            </button>
          )}
        </div>

        {gmailStatus?.connected ? (
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Connected to {gmailStatus.email}
              </p>
              <p className="text-xs text-gray-500">
                Connected on{" "}
                {new Date(gmailStatus.connectedAt).toLocaleDateString()}
                {gmailStatus.expired && (
                  <span className="text-red-600 ml-2">• Token expired</span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Gmail not connected
                </p>
                <p className="text-xs text-gray-500">
                  Connect your Gmail account to start sending emails
                </p>
              </div>
            </div>
            <Link to="/gmail-setup" className="btn btn-primary">
              Connect Gmail
            </Link>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Campaigns
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {campaigns.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Recipients
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRecipients}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Emails Sent</p>
              <p className="text-2xl font-bold text-gray-900">{totalSent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/create-campaign"
            className="btn btn-primary flex items-center justify-center space-x-2 py-3"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Campaign</span>
          </Link>

          <Link
            to="/campaigns"
            className="btn btn-secondary flex items-center justify-center space-x-2 py-3"
          >
            <Activity className="h-5 w-5" />
            <span>View All Campaigns</span>
          </Link>
        </div>
      </div>

      {/* Recent Campaigns */}
      {recentCampaigns.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Campaigns
            </h2>
            <Link
              to="/campaigns"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {recentCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-b-0"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                  <p className="text-sm text-gray-600">{campaign.subject}</p>
                  <p className="text-xs text-gray-500">
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {campaign.sent_count || 0} /{" "}
                      {campaign.total_recipients || 0}
                    </p>
                    <p className="text-xs text-gray-500">sent</p>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      campaign.status
                    )}`}
                  >
                    {campaign.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
