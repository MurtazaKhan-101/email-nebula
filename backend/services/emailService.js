const { google } = require("googleapis");
const nodemailer = require("nodemailer");
const db = require("../database/factory");
const Encryption = require("../utils/encryption");

class EmailService {
  constructor() {
    // Configuration using environment variables for consistency
    this.config = {
      maxEmailsPerBatch: parseInt(process.env.EMAIL_BATCH_SIZE) || 3,
      emailDelay: parseInt(process.env.EMAIL_DELAY_MS) || 1000,
      maxTimeout: parseInt(process.env.MAX_PROCESSING_TIME) || 30000,
    };

    console.log("📧 EmailService initialized with config:", this.config);
  }

  // Create OAuth2 client for user
  async createOAuthClient(userId) {
    console.log("🔐 Looking for Gmail credentials for user:", userId);
    const gmailCreds = await db.getGmailCredentials(userId);

    if (!gmailCreds) {
      console.error("❌ Gmail credentials not found for user:", userId);
      throw new Error("Gmail credentials not found");
    }

    console.log("🔐 Setting up OAuth2 client for user:", userId);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials
    let credentials;
    try {
      credentials = {
        access_token: Encryption.decryptToken(gmailCreds.access_token),
        refresh_token: Encryption.decryptToken(gmailCreds.refresh_token),
      };
    } catch (error) {
      console.error("❌ Failed to decrypt stored tokens:", error.message);
      throw new Error(
        "Invalid stored credentials. Please re-authenticate with Gmail."
      );
    }

    console.log("📝 Setting OAuth credentials...");
    oauth2Client.setCredentials(credentials);

    // Handle token refresh
    oauth2Client.on("tokens", async (tokens) => {
      console.log("🔄 OAuth tokens refreshed, updating database...");
      if (tokens.access_token) {
        // Update the Gmail credentials with new access token
        await db.saveGmailCredentials({
          user_id: userId,
          access_token: Encryption.encryptToken(tokens.access_token),
          // Keep other fields intact - this will update only the access_token
        });
      }
    });

    return oauth2Client;
  }

  // Get recipients from Google Sheets
  async getRecipientsFromSheet(sheetUrl, oauth2Client) {
    try {
      console.log("Attempting to access Google Sheet:", sheetUrl);

      // Extract sheet ID from URL
      const sheetIdMatch = sheetUrl.match(
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
      );
      if (!sheetIdMatch) {
        throw new Error(
          "Invalid Google Sheets URL format. Please ensure you're using a valid Google Sheets URL."
        );
      }

      const sheetId = sheetIdMatch[1];
      console.log("Extracted Sheet ID:", sheetId);

      // Create a fresh Sheets API instance with auth
      const sheets = google.sheets({ version: "v4", auth: oauth2Client });

      // Test the OAuth token first
      try {
        // Try to get basic spreadsheet info first
        const metadataResponse = await sheets.spreadsheets.get({
          spreadsheetId: sheetId,
        });
        console.log(
          "Successfully accessed spreadsheet:",
          metadataResponse.data.properties.title
        );
      } catch (authError) {
        console.error("Authentication error:", authError.message);
        if (authError.message.includes("insufficient authentication scopes")) {
          throw new Error(
            "Missing Google Sheets permissions. Please reconnect your Gmail account to grant Sheets access."
          );
        }
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      // Get sheet data
      console.log("Fetching sheet data...");
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "A:Z", // Get all columns
      });

      const rows = response.data.values;
      if (!rows || rows.length < 1) {
        throw new Error(
          "Sheet is empty. Please add data to your Google Sheet."
        );
      }

      if (rows.length < 2) {
        throw new Error(
          "Sheet only has headers but no data rows. Please add recipient data."
        );
      }

      // Parse headers and data
      const headers = rows[0].map((h) => h.toLowerCase().trim());
      console.log("Found headers:", headers);

      const emailIndex = headers.findIndex((h) => h.includes("email"));
      const nameIndex = headers.findIndex((h) => h.includes("name"));

      if (emailIndex === -1) {
        throw new Error(
          `No email column found in sheet. Available columns: ${headers.join(
            ", "
          )}. Please ensure you have a column containing 'email' in the header.`
        );
      }

      console.log("Email column found at index:", emailIndex);
      if (nameIndex !== -1) {
        console.log("Name column found at index:", nameIndex);
      }

      const recipients = [];
      const sheetHeaders = rows[0]; // Store headers for personalization

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[emailIndex] && row[emailIndex].trim()) {
          recipients.push({
            email: row[emailIndex].trim(),
            name: nameIndex !== -1 ? (row[nameIndex] || "").trim() : "",
            rowData: row,
            headers: sheetHeaders, // Include headers for dynamic personalization
          });
        }
      }

      console.log(
        `Successfully parsed ${recipients.length} recipients from sheet with headers:`,
        sheetHeaders
      );
      return recipients;
    } catch (error) {
      console.error("Error reading Google Sheets:", error);

      // Provide more specific error messages
      if (error.message.includes("The caller does not have permission")) {
        throw new Error(
          "Permission denied: Please make sure the Google Sheet is shared publicly or with your Gmail account, and that you have Google Sheets permissions."
        );
      } else if (error.message.includes("Unable to parse range")) {
        throw new Error(
          "Invalid sheet range. Please check your Google Sheets URL."
        );
      } else if (error.message.includes("Requested entity was not found")) {
        throw new Error(
          "Google Sheet not found. Please check that the URL is correct and the sheet exists."
        );
      }

      throw new Error(`Failed to read Google Sheets: ${error.message}`);
    }
  }

  // Create nodemailer transporter using Gmail OAuth
  async createTransporter(oauth2Client, userEmail) {
    console.log("Creating email transporter for:", userEmail);

    try {
      // Ensure we have fresh tokens
      console.log("🔄 Refreshing access token...");
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      console.log("📝 Current token info:");
      console.log("- Access token exists:", !!credentials.access_token);
      console.log("- Refresh token exists:", !!credentials.refresh_token);
      console.log(
        "- Token expires at:",
        credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : "Unknown"
      );

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: userEmail,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: credentials.refresh_token,
          // accessToken: credentials.access_token,
          // expires: credentials.expiry_date,
        },
        logger: false, // Disable excessive logging
        debug: false, // Disable debug for cleaner logs
      });

      // Skip verification as Gmail SMTP OAuth can be unreliable for verification
      // We'll test with actual sending instead
      console.log(
        "⚠️ Skipping transporter verification (Gmail SMTP OAuth issue)"
      );
      console.log(
        "✅ Email transporter created (will verify during actual send)"
      );

      return transporter;
    } catch (error) {
      console.error("❌ Failed to create email transporter:", error);
      throw new Error(`Email transporter setup failed: ${error.message}`);
    }
  }

  // Send individual email
  async sendEmail(transporter, emailData, campaignId, oauth2Client = null) {
    try {
      const {
        to,
        subject,
        body,
        senderEmail,
        recipientName,
        recipientData,
        sheetHeaders,
      } = emailData;

      console.log(`📧 Preparing email for ${to}...`);

      // Personalize email content
      let personalizedBody = body;
      let personalizedSubject = subject;

      // Basic replacements
      const replacements = {
        "{{name}}": recipientName || "there",
        "{{email}}": to,
        "{{Name}}": recipientName || "there",
        "{{Email}}": to,
      };

      // Add dynamic replacements from Google Sheet columns
      if (recipientData && sheetHeaders) {
        recipientData.forEach((value, index) => {
          if (sheetHeaders[index]) {
            const headerName = sheetHeaders[index].toLowerCase().trim();
            const displayName = sheetHeaders[index].trim();

            // Add various formats of the column name as placeholders
            replacements[`{{${headerName}}}`] = value || "";
            replacements[`{{${displayName}}}`] = value || "";

            // Handle common variations
            if (headerName.includes("name")) {
              replacements[`{{name}}`] = value || recipientName || "there";
              replacements[`{{Name}}`] = value || recipientName || "there";
            }
            if (headerName.includes("email")) {
              replacements[`{{email}}`] = value || to;
              replacements[`{{Email}}`] = value || to;
            }
          }
        });
      }

      Object.entries(replacements).forEach(([placeholder, value]) => {
        personalizedBody = personalizedBody.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
        personalizedSubject = personalizedSubject.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
      });

      console.log(
        `📨 Sending email to ${to} with subject: "${personalizedSubject}"`
      );

      // Try Gmail API first since SMTP OAuth has been unreliable
      if (oauth2Client) {
        try {
          console.log(`🚀 Using Gmail API (primary method) for ${to}...`);
          return await this.sendEmailViaGmailAPI(
            oauth2Client,
            {
              to,
              subject: personalizedSubject,
              body: personalizedBody,
              senderEmail,
            },
            campaignId,
            recipientName
          );
        } catch (gmailApiError) {
          console.warn(
            `⚠️ Gmail API failed for ${to}, trying nodemailer fallback...`,
            gmailApiError.message
          );

          // Fallback to nodemailer
          try {
            // Optimize HTML for email clients
            const isHtmlContent =
              personalizedBody.includes("<") && personalizedBody.includes(">");
            const optimizedHtml = isHtmlContent
              ? this.optimizeHtmlForEmail(personalizedBody)
              : personalizedBody;

            const mailOptions = {
              from: senderEmail,
              to: to,
              subject: personalizedSubject,
              html: optimizedHtml,
              text: optimizedHtml
                .replace(/<[^>]*>/g, "")
                .replace(/\s+/g, " ")
                .trim(), // Strip HTML for text version
            };

            const result = await transporter.sendMail(mailOptions);

            // Log successful email
            await db.logEmail({
              campaign_id: campaignId,
              recipient_email: to,
              recipient_name: recipientName,
              status: "sent",
              message_id: result.messageId,
              sent_at: new Date(),
            });

            console.log(
              `✅ Email sent via nodemailer to ${to} - Message ID: ${result.messageId}`
            );
            return { success: true, messageId: result.messageId };
          } catch (transporterError) {
            console.error(`❌ Both Gmail API and nodemailer failed for ${to}`);
            throw new Error(
              `Both sending methods failed. Gmail API: ${gmailApiError.message}, Nodemailer: ${transporterError.message}`
            );
          }
        }
      } else {
        // No oauth2Client provided, use nodemailer only
        // Optimize HTML for email clients
        const isHtmlContent =
          personalizedBody.includes("<") && personalizedBody.includes(">");
        const optimizedHtml = isHtmlContent
          ? this.optimizeHtmlForEmail(personalizedBody)
          : personalizedBody;

        const mailOptions = {
          from: senderEmail,
          to: to,
          subject: personalizedSubject,
          html: optimizedHtml,
          text: optimizedHtml
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim(), // Strip HTML for text version
        };

        const result = await transporter.sendMail(mailOptions);

        // Log successful email
        await db.logEmail({
          campaign_id: campaignId,
          recipient_email: to,
          recipient_name: recipientName,
          status: "sent",
          message_id: result.messageId,
          sent_at: new Date(),
        });

        console.log(`✅ Email sent to ${to} - Message ID: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
      }
    } catch (error) {
      // Log failed email
      await db.logEmail({
        campaign_id: campaignId,
        recipient_email: emailData.to,
        recipient_name: emailData.recipientName,
        status: "failed",
        error_message: error.message,
        sent_at: new Date(),
      });

      console.error(`❌ Failed to send email to ${emailData.to}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Backup method: Send email using Gmail API directly
  // Optimize HTML content for email clients
  optimizeHtmlForEmail(htmlContent) {
    if (!htmlContent || !htmlContent.includes("<")) {
      return htmlContent;
    }

    let optimizedHtml = htmlContent;

    // 1. Ensure all links have proper attributes for email clients
    optimizedHtml = optimizedHtml.replace(
      /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
      (match, beforeHref, url, afterHref) => {
        // Ensure target="_blank" and add tracking attributes
        const hasTarget = /target\s*=/i.test(beforeHref + afterHref);
        const hasRel = /rel\s*=/i.test(beforeHref + afterHref);

        let linkAttributes = `${beforeHref}href="${url}"${afterHref}`;

        if (!hasTarget) {
          linkAttributes += ' target="_blank"';
        }
        if (!hasRel) {
          linkAttributes += ' rel="noopener"';
        }

        // Add email-safe styling if not present
        if (!linkAttributes.includes("style=")) {
          linkAttributes +=
            ' style="color: #3b82f6; text-decoration: underline;"';
        }

        return `<a ${linkAttributes}>`;
      }
    );

    // 2. Optimize images for email clients
    optimizedHtml = optimizedHtml.replace(
      /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
      (match, beforeSrc, imageUrl, afterSrc) => {
        let imgAttributes = `${beforeSrc}src="${imageUrl}"${afterSrc}`;

        // Ensure alt text exists
        if (!imgAttributes.includes("alt=")) {
          imgAttributes += ' alt="Image"';
        }

        // Add email-safe image styling
        const hasStyle = /style\s*=/i.test(imgAttributes);
        if (!hasStyle) {
          imgAttributes +=
            ' style="display: block; max-width: 100%; height: auto; border: 0;"';
        } else {
          // Enhance existing styles with email-safe properties
          imgAttributes = imgAttributes.replace(
            /style=["']([^"']*?)["']/gi,
            (styleMatch, existingStyle) => {
              const enhancedStyle =
                existingStyle +
                (existingStyle.includes("display") ? "" : "; display: block") +
                (existingStyle.includes("border") ? "" : "; border: 0") +
                (existingStyle.includes("max-width")
                  ? ""
                  : "; max-width: 100%");
              return `style="${enhancedStyle}"`;
            }
          );
        }

        return `<img ${imgAttributes}>`;
      }
    );

    // 3. Wrap content in email-safe container
    const emailWrapper = `
      <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        ${optimizedHtml}
      </div>
    `;

    // 4. Add email-safe DOCTYPE and meta tags
    const fullHtmlEmail = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
        ${emailWrapper}
      </body>
      </html>
    `.trim();

    return fullHtmlEmail;
  }

  async sendEmailViaGmailAPI(
    oauth2Client,
    emailData,
    campaignId,
    recipientName
  ) {
    try {
      const { to, subject, body, senderEmail } = emailData;

      console.log(`📮 Using Gmail API to send to ${to}...`);

      // Ensure we have fresh credentials
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        console.log("🔄 Refreshed OAuth credentials for Gmail API");
      } catch (refreshError) {
        console.warn(
          "⚠️ Token refresh failed, using existing credentials:",
          refreshError.message
        );
      }

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Check if body contains HTML
      const isHtmlContent = body.includes("<") && body.includes(">");

      // Optimize HTML content for email clients
      const optimizedBody = isHtmlContent
        ? this.optimizeHtmlForEmail(body)
        : body;

      let email;

      if (isHtmlContent) {
        // Create multipart MIME message for HTML emails
        const textVersion = optimizedBody
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim(); // Strip HTML for text version
        const boundary =
          "----=_Part_" + Math.random().toString(36).substr(2, 9);

        email = [
          `From: ${senderEmail}`,
          `To: ${to}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset=utf-8`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          textVersion,
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset=utf-8`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          optimizedBody,
          ``,
          `--${boundary}--`,
        ].join("\r\n");
      } else {
        // Simple plain text message
        email = [
          `From: ${senderEmail}`,
          `To: ${to}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/plain; charset=utf-8`,
          `Content-Transfer-Encoding: 7bit`,
          "",
          body,
        ].join("\r\n");
      }

      // Encode the email
      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      console.log(
        `📤 Sending via Gmail API (${
          isHtmlContent ? "HTML" : "TEXT"
        } format)...`
      );

      // Send via Gmail API
      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      // Log successful email
      await db.logEmail({
        campaign_id: campaignId,
        recipient_email: to,
        recipient_name: recipientName,
        status: "sent",
        message_id: result.data.id,
        sent_at: new Date(),
      });

      console.log(
        `✅ Email sent via Gmail API to ${to} - Message ID: ${result.data.id}`
      );
      return { success: true, messageId: result.data.id };
    } catch (error) {
      console.error(`❌ Gmail API send failed for ${emailData.to}:`, error);

      // Provide more specific error messages
      if (error.code === 403) {
        throw new Error(
          `Gmail API permission denied. Please reconnect your Gmail account with proper permissions.`
        );
      } else if (error.code === 401) {
        throw new Error(
          `Gmail API authentication failed. Please reconnect your Gmail account.`
        );
      } else if (error.message.includes("insufficient authentication scopes")) {
        throw new Error(
          `Missing Gmail permissions. Please reconnect your Gmail account to grant email sending access.`
        );
      }

      throw new Error(`Gmail API error: ${error.message}`);
    }
  }

  // Process email campaign with non-blocking batch processing (for concurrent users)
  async processCampaignBatch(campaignId, batchSize = null) {
    const BATCH_SIZE =
      batchSize ||
      (process.env.EMAIL_BATCH_SIZE
        ? parseInt(process.env.EMAIL_BATCH_SIZE)
        : process.env.VERCEL
        ? 3
        : 5); // Smaller batches for better concurrency

    console.log(
      `🚀 Processing batch for campaign ID: ${campaignId} (batch size: ${BATCH_SIZE})`
    );

    try {
      // Get campaign details
      const campaign = await db.getCampaign(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Don't process if campaign is completed or failed
      if (
        ["completed", "completed_with_errors", "failed"].includes(
          campaign.status
        )
      ) {
        console.log(
          `📋 Campaign ${campaignId} already completed with status: ${campaign.status}`
        );
        return {
          success: true,
          completed: true,
          status: campaign.status,
          message: "Campaign already completed",
        };
      }

      console.log(
        `📧 Processing campaign: "${campaign.name}" by ${campaign.sender_email}`
      );

      // Get or fetch recipients
      let recipients;
      if (!campaign.recipients_data) {
        console.log("📊 Fetching recipients from Google Sheets...");
        const oauth2Client = await this.createOAuthClient(campaign.user_id);
        recipients = await this.getRecipientsFromSheet(
          campaign.google_sheet_url,
          oauth2Client
        );

        // Cache recipients and initialize campaign
        await db.updateCampaign(campaignId, {
          total_recipients: recipients.length,
          recipients_data: JSON.stringify(recipients),
          processed_count: 0,
          sent_count: 0,
          failed_count: 0,
        });

        // Set status to running if not already
        if (campaign.status !== "running") {
          await db.updateCampaignStatus(campaignId, "running", {
            started_at: new Date(),
          });
        }
      } else {
        recipients = JSON.parse(campaign.recipients_data);
      }

      const startIndex = campaign.processed_count || 0;
      const remainingRecipients = recipients.slice(startIndex);

      console.log(
        `📦 ${remainingRecipients.length} recipients remaining to process`
      );

      if (remainingRecipients.length === 0) {
        console.log("✅ All recipients processed, finalizing campaign");
        await this.finalizeCampaign(campaignId);
        return {
          success: true,
          completed: true,
          totalRecipients: recipients.length,
          processedCount: recipients.length,
        };
      }

      // Process only one small batch in this call
      const batchToProcess = remainingRecipients.slice(0, BATCH_SIZE);
      console.log(
        `📦 Processing ${batchToProcess.length} emails in this batch`
      );

      // Create OAuth client and process the batch
      const oauth2Client = await this.createOAuthClient(campaign.user_id);
      const batchResults = await this.processBatch(
        campaign,
        batchToProcess,
        campaignId,
        oauth2Client,
        startIndex
      );

      // Update progress
      const newProcessedCount = startIndex + batchToProcess.length;
      const progressPercentage = Math.round(
        (newProcessedCount / recipients.length) * 100
      );

      await db.updateCampaign(campaignId, {
        processed_count: newProcessedCount,
        progress_percentage: progressPercentage,
      });

      const stillRemaining = recipients.length - newProcessedCount;
      const isCompleted = stillRemaining === 0;

      if (isCompleted) {
        console.log("✅ All emails processed, finalizing campaign");
        await this.finalizeCampaign(campaignId);
        return {
          success: true,
          completed: true,
          totalRecipients: recipients.length,
          processedCount: newProcessedCount,
          message: "Campaign completed successfully",
        };
      } else {
        console.log(`📊 Batch completed. ${stillRemaining} emails remaining`);
        return {
          success: true,
          completed: false,
          totalRecipients: recipients.length,
          processedCount: newProcessedCount,
          remainingCount: stillRemaining,
          progressPercentage,
          message: `Processed ${batchToProcess.length} emails. ${stillRemaining} remaining.`,
        };
      }
    } catch (error) {
      console.error("💥 Campaign batch processing error:", error);
      await db.updateCampaignStatus(campaignId, "failed", {
        error_message: error.message,
        failed_at: new Date(),
      });
      throw error;
    }
  }

  // Legacy method - kept for compatibility but now calls the new batch method
  async processCampaign(campaignId) {
    const startTime = Date.now();
    const BATCH_SIZE = process.env.EMAIL_BATCH_SIZE
      ? parseInt(process.env.EMAIL_BATCH_SIZE)
      : process.env.VERCEL
      ? 5
      : 10;
    const MAX_PROCESSING_TIME = process.env.MAX_PROCESSING_TIME
      ? parseInt(process.env.MAX_PROCESSING_TIME)
      : process.env.VERCEL
      ? 45000
      : 300000;

    try {
      console.log(
        `🚀 Starting campaign processing for campaign ID: ${campaignId}`
      );
      console.log(
        `⚙️ Batch size: ${BATCH_SIZE}, Max processing time: ${MAX_PROCESSING_TIME}ms`
      );

      // Get campaign details
      console.log(
        "🔍 Looking up campaign with ID:",
        campaignId,
        "Type:",
        typeof campaignId
      );
      const campaign = await db.getCampaign(campaignId);
      console.log("📋 Campaign lookup result:", !!campaign);

      if (!campaign) {
        console.error("❌ Campaign not found for ID:", campaignId);
        throw new Error("Campaign not found");
      }

      console.log(
        `📧 Campaign found: "${campaign.name}" by ${campaign.sender_email}`
      );

      // Check if this is a continuation of a paused campaign
      const isResumingCampaign =
        campaign.status === "paused" && campaign.processed_count > 0;
      const startIndex = isResumingCampaign ? campaign.processed_count : 0;

      if (!isResumingCampaign) {
        // Update campaign status to running (first time)
        console.log("📝 Updating campaign status to 'running'...");
        await db.updateCampaignStatus(campaignId, "running", {
          started_at: new Date(),
          processed_count: 0,
        });
      } else {
        console.log(`🔄 Resuming campaign from position ${startIndex}`);
        await db.updateCampaignStatus(campaignId, "running", {
          resumed_at: new Date(),
        });
      }

      // Create OAuth client
      console.log("🔐 Creating OAuth client...");
      const oauth2Client = await this.createOAuthClient(campaign.user_id);

      // Get recipients from Google Sheets (only if not already cached)
      let recipients;
      if (!campaign.recipients_data) {
        console.log("📊 Fetching recipients from Google Sheets...");
        try {
          recipients = await this.getRecipientsFromSheet(
            campaign.google_sheet_url,
            oauth2Client
          );
          console.log("✅ Successfully fetched recipients:", recipients.length);

          // Cache recipients data in campaign for continuation
          await db.updateCampaign(campaignId, {
            total_recipients: recipients.length,
            recipients_data: JSON.stringify(recipients),
          });
        } catch (sheetsError) {
          console.error("❌ Google Sheets error:", sheetsError.message);
          throw new Error(`Failed to fetch recipients: ${sheetsError.message}`);
        }
      } else {
        // Use cached recipients for continuation
        console.log("📋 Using cached recipients data");
        recipients = JSON.parse(campaign.recipients_data);
        console.log("✅ Loaded cached recipients:", recipients.length);
      }

      console.log(
        `👥 Processing campaign ${campaignId} with ${recipients.length} recipients`
      );

      // Calculate remaining recipients
      const remainingRecipients = recipients.slice(startIndex);
      console.log(
        `📦 ${remainingRecipients.length} recipients remaining to process`
      );

      if (remainingRecipients.length === 0) {
        console.log("✅ All recipients already processed, finalizing campaign");
        await this.finalizeCampaign(campaignId);
        return;
      }

      // Process in batches to avoid timeout
      const totalBatches = Math.ceil(remainingRecipients.length / BATCH_SIZE);
      let processedInThisRun = 0;

      console.log(
        `� Will process ${Math.min(totalBatches, 10)} batches in this run`
      );

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Check if we're running out of time (leave 10s buffer)
        const timeElapsed = Date.now() - startTime;
        if (timeElapsed > MAX_PROCESSING_TIME - 10000) {
          console.log(
            `⏰ Approaching timeout after processing ${processedInThisRun} emails, scheduling continuation...`
          );
          await this.scheduleContinuation(
            campaignId,
            startIndex + processedInThisRun
          );
          return;
        }

        const batchStartIdx = batchIndex * BATCH_SIZE;
        const batchEndIdx = Math.min(
          batchStartIdx + BATCH_SIZE,
          remainingRecipients.length
        );
        const batch = remainingRecipients.slice(batchStartIdx, batchEndIdx);

        console.log(
          `� Processing batch ${batchIndex + 1}/${totalBatches} (${
            batch.length
          } emails)`
        );

        // Process this batch
        const batchResults = await this.processBatch(
          campaign,
          batch,
          campaignId,
          oauth2Client,
          startIndex + batchStartIdx
        );
        processedInThisRun += batch.length;

        // Update progress
        const totalProcessed = startIndex + processedInThisRun;
        const progressPercentage = Math.round(
          (totalProcessed / recipients.length) * 100
        );

        await db.updateCampaign(campaignId, {
          processed_count: totalProcessed,
          progress_percentage: progressPercentage,
        });

        console.log(
          `📊 Progress: ${totalProcessed}/${recipients.length} (${progressPercentage}%)`
        );

        // Small delay between batches to avoid rate limiting
        if (batchIndex < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // All remaining emails processed successfully in this run
      console.log(
        `✅ Processed all remaining ${processedInThisRun} emails in this run`
      );
      await this.finalizeCampaign(campaignId);

      return {
        success: true,
        campaignId,
        totalRecipients: recipients.length,
        processedCount: startIndex + processedInThisRun,
        status: "completed",
      };
    } catch (error) {
      console.error("💥 Campaign processing error:", error);
      await db.updateCampaignStatus(campaignId, "failed", {
        error_message: error.message,
        failed_at: new Date(),
      });
      throw error;
    }
  }

  // Get campaign statistics
  async getCampaignStats(campaignId) {
    const campaign = await db.getCampaign(campaignId);
    const logs = await db.getCampaignLogs(campaignId);

    const stats = {
      campaign,
      logs: logs.reduce((acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      }, {}),
    };

    return stats;
  }

  // New method to process a batch of emails
  async processBatch(
    campaign,
    recipients,
    campaignId,
    oauth2Client,
    startIndex
  ) {
    console.log(
      `🔨 Processing batch of ${recipients.length} emails starting at index ${startIndex}`
    );

    // Create transporter once per batch
    let transporter;
    try {
      transporter = await this.createTransporter(
        oauth2Client,
        campaign.sender_email
      );
      console.log("✅ Email transporter created for batch");
    } catch (transporterError) {
      console.error("❌ Batch transporter error:", transporterError.message);
      throw new Error(
        `Failed to create email transporter: ${transporterError.message}`
      );
    }

    const EMAIL_DELAY = process.env.EMAIL_DELAY_MS
      ? parseInt(process.env.EMAIL_DELAY_MS)
      : process.env.VERCEL
      ? 1000
      : 2000;
    const MAX_RETRIES = process.env.MAX_RETRIES
      ? parseInt(process.env.MAX_RETRIES)
      : 2;

    let batchSentCount = 0;
    let batchFailedCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const globalIndex = startIndex + i;

      try {
        console.log(
          `📧 Sending email ${globalIndex + 1} to: ${recipient.email}`
        );

        const emailData = {
          to: recipient.email,
          subject: campaign.subject,
          body: campaign.body,
          senderEmail: campaign.sender_email,
          recipientName: recipient.name,
          recipientData: recipient.rowData, // Include all row data for personalization
          sheetHeaders: recipient.headers, // Include headers for dynamic placeholders
        };

        // Send email with retry logic
        const result = await this.sendEmailWithRetry(
          transporter,
          emailData,
          campaignId,
          oauth2Client,
          MAX_RETRIES
        );

        if (result && result.success) {
          batchSentCount++;
          console.log(`✅ Email sent successfully to ${recipient.email}`);
        } else {
          batchFailedCount++;
          console.log(`❌ Email failed to ${recipient.email}: ${result.error}`);
          // Log the failure (if not already logged by sendEmail method)
          await db.logEmail({
            campaign_id: campaignId,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            status: "failed",
            error_message: result.error,
            sent_at: new Date(),
          });
        }

        // Small delay between emails (reduced for serverless)
        if (i < recipients.length - 1) {
          console.log(`⏳ Waiting ${EMAIL_DELAY}ms before next email...`);
          await new Promise((resolve) => setTimeout(resolve, EMAIL_DELAY));
        }
      } catch (error) {
        console.error(`❌ Failed to send email to ${recipient.email}:`, error);
        batchFailedCount++;
        await db.logEmail({
          campaign_id: campaignId,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          status: "failed",
          error_message: error.message,
          sent_at: new Date(),
        });
      }
    }

    // Update campaign with batch counts
    const currentCampaign = await db.getCampaign(campaignId);
    const newSentCount = (currentCampaign.sent_count || 0) + batchSentCount;
    const newFailedCount =
      (currentCampaign.failed_count || 0) + batchFailedCount;

    await db.updateCampaign(campaignId, {
      sent_count: newSentCount,
      failed_count: newFailedCount,
    });

    console.log(`✅ Completed batch processing of ${recipients.length} emails`);
    console.log(
      `📊 Batch results: ${batchSentCount} sent, ${batchFailedCount} failed`
    );
    console.log(
      `📊 Campaign totals: ${newSentCount} sent, ${newFailedCount} failed`
    );

    return {
      sentCount: batchSentCount,
      failedCount: batchFailedCount,
      totalSent: newSentCount,
      totalFailed: newFailedCount,
    };
  }

  // New method to send email with retry logic
  async sendEmailWithRetry(
    transporter,
    emailData,
    campaignId,
    oauth2Client,
    maxRetries = 2
  ) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Attempt ${attempt}/${maxRetries} - Sending to ${emailData.to}...`
        );

        const result = await this.sendEmail(
          transporter,
          emailData,
          campaignId,
          oauth2Client
        );

        if (result.success) {
          console.log(`✅ Email sent successfully to ${emailData.to}`);
          return result;
        } else {
          lastError = new Error(result.error);
          if (attempt < maxRetries) {
            console.log(`⚠️ Retrying in 2 seconds... (${result.error})`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        lastError = error;
        console.error(
          `💥 Error sending email to ${emailData.to} (attempt ${attempt}):`,
          error.message
        );

        if (attempt < maxRetries) {
          console.log(`⚠️ Retrying in 2 seconds...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    // All retries failed
    console.error(`❌ All ${maxRetries} attempts failed for ${emailData.to}`);
    return { success: false, error: lastError.message };
  }

  // New method to schedule campaign continuation
  async scheduleContinuation(campaignId, processedCount) {
    console.log(
      `📅 Scheduling continuation for campaign ${campaignId} from position ${processedCount}`
    );

    // Update campaign with continuation info
    await db.updateCampaignStatus(campaignId, "paused", {
      processed_count: processedCount,
      needs_continuation: true,
      paused_at: new Date(),
    });

    // In production, trigger continuation directly without HTTP call
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      try {
        console.log(
          `🔄 Triggering immediate continuation for campaign ${campaignId}`
        );

        // Use setTimeout to trigger continuation in a new execution context
        setTimeout(async () => {
          try {
            await this.continueCampaign(campaignId);
            console.log(`✅ Successfully continued campaign ${campaignId}`);
          } catch (error) {
            console.error(
              `❌ Failed to continue campaign ${campaignId}:`,
              error.message
            );

            // Mark campaign as failed if continuation fails
            await db.updateCampaignStatus(campaignId, "failed", {
              error_message: `Continuation failed: ${error.message}`,
              failed_at: new Date(),
            });
          }
        }, 1000); // 1 second delay to ensure clean execution context
      } catch (error) {
        console.error("❌ Failed to schedule continuation:", error.message);
      }
    } else {
      console.log("💻 Development mode: Skipping automatic continuation");
    }
  }

  // New method to finalize campaign
  async finalizeCampaign(campaignId) {
    console.log(`🏁 Finalizing campaign ${campaignId}`);

    // Get current campaign data to use existing counts
    const campaign = await db.getCampaign(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found for finalization");
    }

    // Get logs for verification and additional stats
    const logs = await db.getCampaignLogs(campaignId);
    const logSentCount = logs.filter((log) => log.status === "sent").length;
    const logFailedCount = logs.filter((log) => log.status === "failed").length;

    // Use the higher of the two counts (campaign tracked vs logs) to be safe
    const sentCount = Math.max(campaign.sent_count || 0, logSentCount);
    const failedCount = Math.max(campaign.failed_count || 0, logFailedCount);

    console.log(
      `📊 Campaign counts - Tracked: ${campaign.sent_count || 0} sent, ${
        campaign.failed_count || 0
      } failed`
    );
    console.log(
      `📊 Log counts - ${logSentCount} sent, ${logFailedCount} failed`
    );
    console.log(
      `📊 Using final counts - ${sentCount} sent, ${failedCount} failed`
    );

    const finalStatus =
      failedCount === 0 ? "completed" : "completed_with_errors";

    await db.updateCampaignStatus(campaignId, finalStatus, {
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date(),
      progress_percentage: 100,
    });

    console.log(
      `✅ Campaign ${campaignId} finalized: ${sentCount} sent, ${failedCount} failed, status: ${finalStatus}`
    );

    return {
      success: true,
      totalRecipients: sentCount + failedCount,
      sentCount,
      failedCount,
      status: finalStatus,
    };
  }

  // New method to continue a paused campaign
  async continueCampaign(campaignId) {
    console.log(`🔄 Continuing paused campaign: ${campaignId}`);

    // Get campaign details
    const campaign = await db.getCampaign(campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "paused" || !campaign.needs_continuation) {
      console.log(
        `⚠️ Campaign ${campaignId} doesn't need continuation (status: ${campaign.status})`
      );
      return;
    }

    // Reset continuation flag and resume processing
    await db.updateCampaign(campaignId, {
      needs_continuation: false,
    });

    // Resume the campaign processing
    return await this.processCampaign(campaignId);
  }
}

module.exports = new EmailService();
