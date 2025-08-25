import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Send, FileText, Users, AlertCircle } from "lucide-react";
import api from "../config/api";

const EmailCampaign = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    googleSheetUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    checkGmailStatus();
    fetchTemplates();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const response = await api.get("/auth/gmail/status");
      setGmailStatus(response.data);

      if (!response.data.connected) {
        toast.warning("Please connect your Gmail account first");
        navigate("/gmail-setup");
      }
    } catch (error) {
      console.error("Failed to check Gmail status:", error);
      toast.error("Failed to verify Gmail connection");
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/api/emails/templates");
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTemplateSelect = (template) => {
    setFormData((prev) => ({
      ...prev,
      subject: template.subject,
      body: template.body,
    }));
    toast.success(`Template "${template.name}" applied`);
  };

  // Batch processing function for non-blocking email sending
  const startBatchProcessing = async (campaignId, totalRecipients) => {
    let processedCount = 0;
    let batchNumber = 1;

    try {
      while (processedCount < totalRecipients) {
        console.log(`Processing batch ${batchNumber}...`);

        // Update progress in UI
        const progressPercent = Math.round(
          (processedCount / totalRecipients) * 100
        );
        toast.info(
          `Sending emails... ${progressPercent}% complete (${processedCount}/${totalRecipients})`
        );

        // Process one batch
        const batchResponse = await api.post(
          `/api/campaigns/${campaignId}/process-batch`,
          {
            batchSize: 3, // Small batches for better user experience
          }
        );

        if (!batchResponse.data.success) {
          throw new Error(
            batchResponse.data.error || "Batch processing failed"
          );
        }

        const result = batchResponse.data;
        processedCount = result.processedCount;

        console.log(`Batch ${batchNumber} completed:`, result);

        if (result.completed) {
          console.log("Campaign completed successfully!");
          break;
        }

        batchNumber++;

        // Small delay between batches to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Final success message
      toast.success(`All ${totalRecipients} emails processed successfully!`);
    } catch (error) {
      console.error("Batch processing error:", error);
      throw new Error(`Batch processing failed: ${error.message}`);
    }
  };

  const validateGoogleSheetUrl = (url) => {
    const googleSheetsPattern =
      /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
    return googleSheetsPattern.test(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    if (!formData.subject.trim()) {
      toast.error("Email subject is required");
      return;
    }

    if (!formData.body.trim()) {
      toast.error("Email body is required");
      return;
    }

    if (!formData.googleSheetUrl.trim()) {
      toast.error("Google Sheet URL is required");
      return;
    }

    if (!validateGoogleSheetUrl(formData.googleSheetUrl)) {
      toast.error("Please provide a valid Google Sheets URL");
      return;
    }

    try {
      setIsSubmitting(true);

      // Step 1: Test sheet connection first
      toast.info("Testing Google Sheets connection...");
      const testResponse = await api.post("/api/campaigns/test-sheet", {
        googleSheetUrl: formData.googleSheetUrl.trim(),
      });

      if (!testResponse.data.success) {
        throw new Error(testResponse.data.error);
      }

      // Step 2: Show preview to user
      const { recipientCount, preview } = testResponse.data;
      const confirmSend = window.confirm(
        `Found ${recipientCount} recipients in the sheet.\n\n` +
          `Preview recipients:\n${preview
            .map((r) => `- ${r.name || "No name"} (${r.email})`)
            .join("\n")}\n\n` +
          `Do you want to create and start the campaign for all ${recipientCount} recipients?`
      );

      if (!confirmSend) {
        setIsSubmitting(false);
        return;
      }

      // Step 3: Create campaign (without starting)
      toast.info("Creating email campaign...");
      const response = await api.post("/api/campaigns/create", {
        campaignName: formData.name.trim(),
        subject: formData.subject.trim(),
        body: formData.body.trim(),
        googleSheetUrl: formData.googleSheetUrl.trim(),
      });

      if (response.data.success) {
        const campaignId = response.data.campaignId;

        // Step 4: Start batch processing
        toast.info("Starting email sending in batches...");

        // Start the batch processing loop
        await startBatchProcessing(campaignId, recipientCount);

        toast.success(
          "Campaign completed successfully! Check the dashboard for details."
        );

        // Reset form
        setFormData({
          name: "",
          subject: "",
          body: "",
          googleSheetUrl: "",
        });

        // Redirect to dashboard to see results
        navigate("/dashboard");
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to create campaign"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!gmailStatus?.connected) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Gmail Account Required
          </h2>
          <p className="text-gray-600 mb-6">
            You need to connect your Gmail account before creating email
            campaigns.
          </p>
          <button
            onClick={() => navigate("/gmail-setup")}
            className="btn btn-primary"
          >
            Connect Gmail Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create Email Campaign
          </h1>
          <p className="text-gray-600">
            Set up a new bulk email campaign to send to your recipient list.
          </p>
        </div>

        {/* Templates Section */}
        {templates.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Start Templates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-gray-900">
                      {template.name}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600">{template.subject}</p>
                  <p className="text-xs text-blue-600 mt-2">
                    Click to use template
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Campaign Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter campaign name..."
              className="form-input"
              required
            />
          </div>

          {/* Email Subject */}
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Subject
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Enter email subject..."
              className="form-input"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be the subject line for all emails in this campaign
            </p>
          </div>

          {/* Email Body */}
          <div>
            <label
              htmlFor="body"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Body
            </label>
            <textarea
              id="body"
              name="body"
              value={formData.body}
              onChange={handleInputChange}
              placeholder="Enter your email content here..."
              rows={10}
              className="form-textarea"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              You can use placeholders like {`{{name}}`} that will be replaced
              with data from your Google Sheet
            </p>
          </div>

          {/* Google Sheet URL */}
          <div>
            <label
              htmlFor="googleSheetUrl"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Google Sheet URL
            </label>
            <input
              type="url"
              id="googleSheetUrl"
              name="googleSheetUrl"
              value={formData.googleSheetUrl}
              onChange={handleInputChange}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="form-input"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Make sure your sheet is shared with view access and contains
              columns: Name, Email Address
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">
                  Google Sheet Requirements
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Sheet must be publicly viewable or shared with the service
                    account
                  </li>
                  <li>• Required columns: "Name", "Email Address"</li>
                  <li>
                    • Optional columns: "Email Subject", "Email Body" (for
                    personalization)
                  </li>
                  <li>• First row should contain column headers</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sender Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Send className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">
                  Emails will be sent from: {gmailStatus.email}
                </h4>
                <p className="text-sm text-green-700">
                  Recipients will see this as the sender address
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn btn-primary py-3 flex items-center justify-center space-x-2"
            >
              <Send className="h-5 w-5" />
              <span>
                {isSubmitting ? "Creating Campaign..." : "Create Campaign"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="btn btn-secondary py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailCampaign;
