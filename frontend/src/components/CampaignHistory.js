import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Eye,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Mail,
} from "lucide-react";
import api from "../config/api";

const CampaignHistory = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/campaigns/list");
      console.log(response, "Its a responseeeeeeeeee!!!");
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignDetails = async (campaignId) => {
    try {
      const response = await api.get(`/api/campaigns/status/${campaignId}`);
      setSelectedCampaign(response.data.campaign);
      setShowDetails(true);
    } catch (error) {
      console.error("Failed to fetch campaign details:", error);
      toast.error("Failed to load campaign details");
    }
  };

  const deleteCampaign = async (campaignId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this campaign? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await api.delete(`/api/users/campaigns/${campaignId}`);
      setCampaigns(campaigns.filter((c) => c.id !== campaignId));
      toast.success("Campaign deleted successfully");

      if (selectedCampaign?.id === campaignId) {
        setShowDetails(false);
        setSelectedCampaign(null);
      }
    } catch (error) {
      console.error("Failed to delete campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100 border-green-200";
      case "running":
        return "text-blue-600 bg-blue-100 border-blue-200";
      case "failed":
        return "text-red-600 bg-red-100 border-red-200";
      case "pending":
        return "text-yellow-600 bg-yellow-100 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-100 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "pending":
        return <Pause className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showDetails && selectedCampaign) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowDetails(false)}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Campaigns</span>
          </button>
        </div>

        <div className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedCampaign.name}
              </h1>
              <p className="text-gray-600">{selectedCampaign.subject}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                selectedCampaign.status
              )}`}
            >
              <div className="flex items-center space-x-2">
                {getStatusIcon(selectedCampaign.status)}
                <span>{selectedCampaign.status}</span>
              </div>
            </span>
          </div>

          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {selectedCampaign.total_recipients || 0}
              </p>
              <p className="text-sm text-gray-600">Total Recipients</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {selectedCampaign.sent_count || 0}
              </p>
              <p className="text-sm text-gray-600">Emails Sent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {selectedCampaign.failed_count || 0}
              </p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {selectedCampaign.total_recipients > 0
                  ? Math.round(
                      (selectedCampaign.sent_count /
                        selectedCampaign.total_recipients) *
                        100
                    )
                  : 0}
                %
              </p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>
          </div>

          {/* Campaign Details */}
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Email Content</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Subject:</strong> {selectedCampaign.subject}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Body:</strong>
                </p>
                <div className="mt-2 p-3 bg-white rounded border text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedCampaign.body}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                Campaign Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Created:</strong>{" "}
                  {formatDate(selectedCampaign.created_at)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Last Updated:</strong>{" "}
                  {formatDate(selectedCampaign.updated_at)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Sender:</strong> {selectedCampaign.sender_email}
                </p>
                {selectedCampaign.google_sheet_url && (
                  <p className="text-sm text-gray-600">
                    <strong>Google Sheet:</strong>{" "}
                    <a
                      href={selectedCampaign.google_sheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Sheet
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Email Logs */}
            {selectedCampaign.logs && selectedCampaign.logs.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-4">
                  Email Delivery Log
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Message ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedCampaign.logs.map((log, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {log.recipient_email}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                log.status === "sent"
                                  ? "text-green-600 bg-green-100"
                                  : "text-red-600 bg-red-100"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {log.sent_at ? formatDate(log.sent_at) : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {log.message_id || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <button
          onClick={() => navigate("/create-campaign")}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Play className="h-4 w-4" />
          <span>Create New Campaign</span>
        </button>
      </div>

      <div className="card p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Email Campaigns
          </h1>
          <p className="text-gray-600">
            View and manage all your email campaigns.
          </p>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first email campaign to get started.
            </p>
            <button
              onClick={() => navigate("/create-campaign")}
              className="btn btn-primary"
            >
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {campaign.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {campaign.subject}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          campaign.status
                        )}`}
                      >
                        {getStatusIcon(campaign.status)}
                        <span>{campaign.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {campaign.total_recipients || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {campaign.sent_count || 0}
                      {campaign.total_recipients > 0 && (
                        <span className="text-gray-500">
                          {" "}
                          (
                          {Math.round(
                            (campaign.sent_count / campaign.total_recipients) *
                              100
                          )}
                          %)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(campaign.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => fetchCampaignDetails(campaign.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Campaign"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignHistory;
