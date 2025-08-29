import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Send,
  FileText,
  Users,
  AlertCircle,
  Eye,
  Code,
  Image,
  Link,
} from "lucide-react";
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
  const [isCheckingGmail, setIsCheckingGmail] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCodeTemplates, setShowCodeTemplates] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);

  const checkGmailStatus = async () => {
    try {
      setIsCheckingGmail(true);
      const response = await api.get("/auth/gmail/status");
      setGmailStatus(response.data);

      if (!response.data.connected) {
        toast.warning("Please connect your Gmail account first");
        navigate("/gmail-setup");
      }
    } catch (error) {
      console.error("Failed to check Gmail status:", error);
      toast.error("Failed to verify Gmail connection");
    } finally {
      setIsCheckingGmail(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/api/emails/templates");
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      // Fallback to built-in templates if API fails
      setTemplates([
        {
          id: "welcome",
          name: "Welcome Email",
          subject: "Welcome to our community, {{name}}!",
          body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #3b82f6; text-align: center; margin-bottom: 30px;">Welcome {{name}}! 🎉</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              Thank you for joining our community! We're excited to have you on board.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://example.com/getting-started" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Get Started
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; text-align: center;">
              If you have any questions, feel free to reach out to us.
            </p>
          </div>`,
        },
        {
          id: "newsletter",
          name: "Newsletter",
          subject: "Weekly Update - {{name}}",
          body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #1f2937; text-align: center; margin-bottom: 30px;">Weekly Newsletter</h1>
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hello {{name}},</p>
              
              <h2 style="color: #3b82f6; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">This Week's Highlights</h2>
              <ul style="color: #374151; line-height: 1.8;">
                <li>Feature update #1</li>
                <li>Important announcement</li>
                <li>Community spotlight</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://example.com/newsletter" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px;">
                  Read Full Newsletter
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                You're receiving this because you subscribed to our newsletter.
              </p>
            </div>
          </div>`,
        },
        {
          id: "promotion",
          name: "Promotional Email",
          subject: "Special Offer Just for You, {{name}}!",
          body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 10px;">
            <div style="background-color: white; padding: 30px; border-radius: 8px;">
              <h1 style="color: #667eea; text-align: center; margin-bottom: 20px;">🎁 Special Offer</h1>
              <p style="font-size: 18px; color: #374151; text-align: center; margin-bottom: 30px;">
                Hi {{name}}, we have something special for you!
              </p>
              
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h2 style="color: #d97706; margin: 0; font-size: 24px;">50% OFF</h2>
                <p style="color: #92400e; margin: 10px 0 0 0;">Limited time offer</p>
              </div>
              
              <p style="color: #374151; line-height: 1.6; text-align: center;">
                Don't miss out on this exclusive deal. Valid until end of month!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://example.com/offer" style="display: inline-block; background-color: #ef4444; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                  Claim Offer Now
                </a>
              </div>
              
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                Offer expires soon. Terms and conditions apply.
              </p>
            </div>
          </div>`,
        },
      ]);
    }
  };

  useEffect(() => {
    checkGmailStatus();
    fetchTemplates();
  }, []);

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

    // Auto-enable HTML mode if template contains HTML tags
    if (template.body.includes("<") && template.body.includes(">")) {
      setIsHtmlMode(true);
      setShowPreview(true);
    }

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

  // HTML Code Templates for quick insertion
  const htmlCodeTemplates = [
    {
      name: "Two Column Layout",
      code: `<table style="width: 100%; border-collapse: collapse;">
  <tr>
    <td style="width: 50%; padding: 20px; vertical-align: top;">
      <h3 style="color: #1f2937; margin-top: 0;">Left Column</h3>
      <p style="color: #374151; line-height: 1.6;">Your content here...</p>
    </td>
    <td style="width: 50%; padding: 20px; vertical-align: top;">
      <h3 style="color: #1f2937; margin-top: 0;">Right Column</h3>
      <p style="color: #374151; line-height: 1.6;">Your content here...</p>
    </td>
  </tr>
</table>`,
    },
    {
      name: "Product Card",
      code: `<div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #ffffff;">
  <img src="https://via.placeholder.com/300x200" alt="Product Image" style="width: 100%; height: 200px; object-fit: cover; border-radius: 6px; margin-bottom: 15px;" />
  <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 20px;">Product Name</h3>
  <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 14px;">Brief product description goes here...</p>
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 24px; font-weight: bold; color: #059669;">$99.99</span>
    <a href="#" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Buy Now</a>
  </div>
</div>`,
    },
    {
      name: "Testimonial Block",
      code: `<div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <p style="font-style: italic; color: #374151; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
    "This is an amazing product that has completely transformed how we work. Highly recommended!"
  </p>
  <div style="display: flex; align-items: center;">
    <img src="https://via.placeholder.com/50x50" alt="Customer" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px;" />
    <div>
      <strong style="color: #1f2937;">John Smith</strong><br>
      <span style="color: #6b7280; font-size: 14px;">CEO, Company Name</span>
    </div>
  </div>
</div>`,
    },
    {
      name: "Feature List",
      code: `<div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 20px 0;">
  <h3 style="color: #1f2937; margin: 0 0 20px 0; text-align: center;">Key Features</h3>
  <div style="list-style: none; padding: 0; margin: 0;">
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
      <span style="color: #374151;">Feature 1 - Description of the feature</span>
    </div>
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
      <span style="color: #374151;">Feature 2 - Another great feature</span>
    </div>
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
      <span style="color: #374151;">Feature 3 - Yet another feature</span>
    </div>
  </div>
</div>`,
    },
    {
      name: "Social Media Footer",
      code: `<div style="background-color: #f3f4f6; padding: 30px 20px; text-align: center; margin-top: 40px; border-radius: 8px;">
  <h4 style="color: #1f2937; margin: 0 0 20px 0;">Connect With Us</h4>
  <div style="margin-bottom: 20px;">
    <a href="#" style="display: inline-block; margin: 0 10px; text-decoration: none;">
      <img src="https://via.placeholder.com/32x32" alt="Facebook" style="width: 32px; height: 32px;" />
    </a>
    <a href="#" style="display: inline-block; margin: 0 10px; text-decoration: none;">
      <img src="https://via.placeholder.com/32x32" alt="Twitter" style="width: 32px; height: 32px;" />
    </a>
    <a href="#" style="display: inline-block; margin: 0 10px; text-decoration: none;">
      <img src="https://via.placeholder.com/32x32" alt="LinkedIn" style="width: 32px; height: 32px;" />
    </a>
  </div>
  <p style="color: #6b7280; font-size: 12px; margin: 0;">
    © 2024 Your Company Name. All rights reserved.<br>
    <a href="#" style="color: #3b82f6;">Unsubscribe</a> | <a href="#" style="color: #3b82f6;">Privacy Policy</a>
  </p>
</div>`,
    },
    {
      name: "Call-to-Action Banner",
      code: `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px; margin: 30px 0;">
  <h2 style="color: white; margin: 0 0 15px 0; font-size: 28px;">Don't Miss Out!</h2>
  <p style="color: #e5e7eb; margin: 0 0 25px 0; font-size: 16px;">
    Limited time offer - Get 50% off your first order
  </p>
  <a href="#" style="display: inline-block; background-color: #ffffff; color: #667eea; padding: 15px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    Claim Your Discount
  </a>
</div>`,
    },
    {
      name: "Progress Bar",
      code: `<div style="margin: 20px 0;">
  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
    <span style="color: #374151; font-weight: bold;">Campaign Progress</span>
    <span style="color: #6b7280;">75%</span>
  </div>
  <div style="background-color: #e5e7eb; height: 10px; border-radius: 5px; overflow: hidden;">
    <div style="background-color: #10b981; height: 100%; width: 75%; border-radius: 5px; transition: width 0.3s ease;"></div>
  </div>
</div>`,
    },
    {
      name: "Event Card",
      code: `<div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 20px 0; background-color: #ffffff;">
  <div style="background: linear-gradient(45deg, #3b82f6, #1d4ed8); padding: 20px; text-align: center;">
    <h3 style="color: white; margin: 0 0 10px 0; font-size: 24px;">Upcoming Event</h3>
    <p style="color: #dbeafe; margin: 0;">Join us for an amazing experience</p>
  </div>
  <div style="padding: 25px;">
    <div style="margin-bottom: 15px;">
      <strong style="color: #1f2937;">📅 Date:</strong> <span style="color: #374151;">March 15, 2024</span>
    </div>
    <div style="margin-bottom: 15px;">
      <strong style="color: #1f2937;">🕒 Time:</strong> <span style="color: #374151;">2:00 PM - 5:00 PM</span>
    </div>
    <div style="margin-bottom: 20px;">
      <strong style="color: #1f2937;">📍 Location:</strong> <span style="color: #374151;">Virtual Event</span>
    </div>
    <a href="#" style="display: block; background-color: #059669; color: white; padding: 12px; text-align: center; text-decoration: none; border-radius: 8px; font-weight: bold;">
      Register Now
    </a>
  </div>
</div>`,
    },
  ];

  const insertCodeTemplate = (template) => {
    const textarea = document.getElementById("body");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newValue =
      formData.body.substring(0, start) +
      template.code +
      formData.body.substring(end);

    setFormData((prev) => ({ ...prev, body: newValue }));

    // Set cursor position after inserted template
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + template.code.length,
        start + template.code.length
      );
    }, 10);

    toast.success(`${template.name} template inserted`);
  };

  const insertHtmlElement = (elementType) => {
    const textarea = document.getElementById("body");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.body.substring(start, end);

    let insertText = "";

    switch (elementType) {
      case "link":
        const url = prompt("Enter URL (must start with https://):", "https://");
        if (url && url.startsWith("http")) {
          insertText = selectedText
            ? `<a href="${url}" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: underline;">${selectedText}</a>`
            : `<a href="${url}" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: underline;">Link Text</a>`;
        } else if (url) {
          alert(
            "⚠️ Please use a full URL starting with https:// for email compatibility"
          );
        }
        break;
      case "image":
        const imgUrl = prompt(
          "Enter image URL (must start with https://):",
          "https://"
        );
        const altText = prompt(
          "Enter alt text (required for accessibility):",
          "Image description"
        );
        if (imgUrl && imgUrl.startsWith("http") && altText) {
          insertText = `<img src="${imgUrl}" alt="${altText}" style="display: block; max-width: 100%; height: auto; border: 0; margin: 10px 0;" />`;
        } else if (imgUrl && !imgUrl.startsWith("http")) {
          alert("⚠️ Please use a full HTTPS URL for images in emails");
        } else if (!altText) {
          alert("⚠️ Alt text is required for email accessibility");
        }
        break;
      case "button":
        const btnUrl = prompt(
          "Enter button URL (must start with https://):",
          "https://"
        );
        const btnText = prompt("Enter button text:", "Click Here");
        if (btnUrl && btnUrl.startsWith("http") && btnText) {
          insertText = `<a href="${btnUrl}" target="_blank" rel="noopener" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; border: 0;">${btnText}</a>`;
        } else if (btnUrl && !btnUrl.startsWith("http")) {
          alert("⚠️ Please use a full HTTPS URL for button links");
        }
        break;
      case "bold":
        insertText = selectedText
          ? `<strong>${selectedText}</strong>`
          : "<strong>Bold Text</strong>";
        break;
      case "italic":
        insertText = selectedText
          ? `<em>${selectedText}</em>`
          : "<em>Italic Text</em>";
        break;
      case "heading":
        insertText = selectedText
          ? `<h2 style="color: #1f2937; margin: 20px 0 10px 0;">${selectedText}</h2>`
          : '<h2 style="color: #1f2937; margin: 20px 0 10px 0;">Heading</h2>';
        break;
      case "paragraph":
        insertText = selectedText
          ? `<p style="margin: 10px 0; line-height: 1.6;">${selectedText}</p>`
          : '<p style="margin: 10px 0; line-height: 1.6;">Paragraph text</p>';
        break;
      case "linebreak":
        insertText = "<br />";
        break;
      case "divider":
        insertText =
          '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />';
        break;
      default:
        return;
    }

    if (insertText) {
      const newValue =
        formData.body.substring(0, start) +
        insertText +
        formData.body.substring(end);
      setFormData((prev) => ({ ...prev, body: newValue }));

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + insertText.length,
          start + insertText.length
        );
      }, 10);
    }
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
      toast.info("Processing...");
      const testResponse = await api.post("/api/campaigns/test-sheet", {
        googleSheetUrl: formData.googleSheetUrl.trim(),
      });

      if (!testResponse.data.success) {
        throw new Error(testResponse.data.error);
      }

      // Step 2: Show preview to user
      const { recipientCount, preview } = testResponse.data;

      // Set confirmation data and show modal
      setConfirmationData({
        recipientCount,
        preview,
        campaignName: formData.name.trim(),
        subject: formData.subject.trim(),
        body: formData.body.trim(),
        googleSheetUrl: formData.googleSheetUrl.trim(),
      });
      setShowConfirmModal(true);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Campaign submission error:", error);
      toast.error(error.response?.data?.error || error.message);
      setIsSubmitting(false);
    }
  };

  const handleConfirmCampaign = async () => {
    try {
      setShowConfirmModal(false);
      setIsSubmitting(true);

      // Step 3: Create campaign (without starting)
      toast.info("Creating email campaign...");
      const response = await api.post("/api/campaigns/create", {
        campaignName: confirmationData.campaignName,
        subject: confirmationData.subject,
        body: confirmationData.body,
        googleSheetUrl: confirmationData.googleSheetUrl,
      });

      if (response.data.success) {
        const campaignId = response.data.campaignId;

        // Step 4: Start batch processing
        toast.info("Starting email sending in batches...");
        setFormData({
          name: "",
          subject: "",
          body: "",
          googleSheetUrl: "",
        });
        navigate("/dashboard");
        // Start the batch processing loop
        await startBatchProcessing(campaignId, confirmationData.recipientCount);

        toast.success(
          "Campaign completed successfully! Check the dashboard for details."
        );
        navigate("/campaigns");
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

  const handleCancelCampaign = () => {
    setShowConfirmModal(false);
    setConfirmationData(null);
    setIsSubmitting(false);
  };

  if (isCheckingGmail) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
      {/* Confirmation Modal */}
      {showConfirmModal && confirmationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-center mb-6">
                <div className="bg-blue-100 rounded-full p-3">
                  <Send className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              {/* Modal Title */}
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-4">
                Confirm Campaign Creation
              </h3>

              {/* Campaign Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Campaign Name:
                  </span>
                  <p className="text-gray-900">
                    {confirmationData.campaignName}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Subject:
                  </span>
                  <p className="text-gray-900">{confirmationData.subject}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Recipients Found:
                  </span>
                  <p className="text-lg font-bold text-blue-600">
                    {confirmationData.recipientCount} emails
                  </p>
                </div>
              </div>

              {/* Recipients Preview */}
              {/* <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-600 mb-3">
                  Preview Recipients:
                </h4>
                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                  {confirmationData.preview.map((recipient, index) => (
                    <div key={index} className="text-sm text-gray-700 py-1">
                      • {recipient.name || "No name"} ({recipient.email})
                    </div>
                  ))}
                  {confirmationData.recipientCount >
                    confirmationData.preview.length && (
                    <div className="text-sm text-gray-500 italic mt-2">
                      ... and{" "}
                      {confirmationData.recipientCount -
                        confirmationData.preview.length}{" "}
                      more recipients
                    </div>
                  )}
                </div>
              </div> */}
              {/* Confirmation Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-center">
                  <strong>Ready to send?</strong>
                  <br />
                  This will create and start the campaign for all{" "}
                  <span className="font-bold">
                    {confirmationData.recipientCount}
                  </span>{" "}
                  recipients.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelCampaign}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCampaign}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center space-x-2"
                  disabled={isSubmitting}
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? "Creating..."
                      : `Send to ${confirmationData.recipientCount}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="body"
                className="block text-sm font-medium text-gray-700"
              >
                Email Body
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsHtmlMode(!isHtmlMode)}
                  className={`px-3 py-1 text-xs rounded-md flex items-center space-x-1 ${
                    isHtmlMode
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : "bg-gray-100 text-gray-700 border border-gray-300"
                  }`}
                >
                  <Code className="h-3 w-3" />
                  <span>{isHtmlMode ? "HTML Mode" : "Text Mode"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`px-3 py-1 text-xs rounded-md flex items-center space-x-1 ${
                    showPreview
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-gray-100 text-gray-700 border border-gray-300"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>{showPreview ? "Hide Preview" : "Show Preview"}</span>
                </button>
              </div>
            </div>

            {/* HTML Tools */}
            {isHtmlMode && (
              <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  HTML Tools:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertHtmlElement("link")}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center space-x-1"
                  >
                    <Link className="h-3 w-3" />
                    <span>Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlElement("image")}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center space-x-1"
                  >
                    <Image className="h-3 w-3" />
                    <span>Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlElement("button")}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  >
                    Button
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlElement("bold")}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlElement("italic")}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlElement("heading")}
                    className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlElement("paragraph")}
                    className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                  >
                    P
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlElement("linebreak")}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    BR
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlElement("divider")}
                    className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                  >
                    HR
                  </button>
                </div>
              </div>
            )}

            {/* HTML Code Templates */}
            {isHtmlMode && (
              <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-purple-700">
                    🎨 HTML Code Templates:
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCodeTemplates(!showCodeTemplates)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                  >
                    {showCodeTemplates ? "Hide" : "Show"} Templates
                  </button>
                </div>

                {showCodeTemplates && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
                    {htmlCodeTemplates.map((template, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => insertCodeTemplate(template)}
                        className="px-3 py-2 text-xs bg-white text-purple-700 rounded-md hover:bg-purple-100 border border-purple-200 transition-colors duration-200 text-left"
                        title={`Insert ${template.name} template`}
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-purple-500 mt-1">
                          Click to insert
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!showCodeTemplates && (
                  <div className="text-xs text-purple-600 mt-1">
                    Professional layouts, cards, testimonials, and more
                    ready-to-use components
                  </div>
                )}
              </div>
            )}

            <div
              className={`grid ${
                showPreview ? "grid-cols-2 gap-4" : "grid-cols-1"
              }`}
            >
              {/* Email Body Textarea */}
              <div>
                <textarea
                  id="body"
                  name="body"
                  value={formData.body}
                  onChange={handleInputChange}
                  placeholder={
                    isHtmlMode
                      ? 'Enter your HTML email content here...\n\nExample:\n<h2>Welcome {{name}}!</h2>\n<p>Thank you for joining us.</p>\n<a href="https://example.com">Visit our website</a>'
                      : "Enter your email content here..."
                  }
                  rows={showPreview ? 12 : 10}
                  cols={50}
                  className="form-textarea font-mono text-sm"
                  required
                />
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="border border-gray-300 rounded-md p-4 bg-white max-h-96 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-2 border-b pb-2">
                    Email Preview ({`{{name}}`} will be replaced with recipient
                    names)
                  </div>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: formData.body.replace(
                        /\{\{name\}\}/g,
                        "John Doe"
                      ),
                    }}
                  />
                </div>
              )}
            </div>

            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-500">
                💡 You can use placeholders like{" "}
                <code className="bg-gray-100 px-1 rounded">{`{{name}}`}</code>{" "}
                that will be replaced with data from your Google Sheet
              </p>
              {isHtmlMode && (
                <div className="text-xs text-blue-600 space-y-1">
                  <p>
                    🎨 <strong>HTML Mode:</strong> You can use full HTML
                    formatting including:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-0.5">
                    <li>
                      Links:{" "}
                      <code className="bg-blue-50 px-1 rounded">
                        &lt;a href="https://example.com"
                        target="_blank"&gt;Click Here&lt;/a&gt;
                      </code>
                    </li>
                    <li>
                      Images:{" "}
                      <code className="bg-blue-50 px-1 rounded">
                        &lt;img src="https://yourdomain.com/image.jpg"
                        alt="Description" style="max-width:100%;" /&gt;
                      </code>
                    </li>
                    <li>
                      <strong>📧 Email Tips:</strong> Use HTTPS URLs, include
                      alt text for images, and add target="_blank" for links
                    </li>
                    <li>
                      <strong>🖼️ Image Hosting:</strong> Use reliable image
                      hosts (your website, Imgur, etc.) - avoid file:// or data:
                      URLs
                    </li>
                    <li>
                      Styling: Use inline CSS styles for best email client
                      compatibility
                    </li>
                    <li>
                      Dynamic variables: Use any column from your Google Sheet
                      as{" "}
                      <code className="bg-blue-50 px-1 rounded">
                        {`{{column_name}}`}
                      </code>
                    </li>
                    <li>
                      Common variables:{" "}
                      <code className="bg-blue-50 px-1 rounded">
                        {`{{name}}`}
                      </code>
                      ,{" "}
                      <code className="bg-blue-50 px-1 rounded">
                        {`{{email}}`}
                      </code>
                      ,{" "}
                      <code className="bg-blue-50 px-1 rounded">
                        {`{{company}}`}
                      </code>
                      , etc.
                    </li>
                  </ul>
                </div>
              )}
            </div>
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
