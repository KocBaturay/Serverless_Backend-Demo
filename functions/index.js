const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const Replicate = require("replicate");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

// Initialize Firebase Admin
// Note: Replace with your own service account key
var serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Express app
const app = express();
app.use(cors({ origin: true }));

// Initialize Secret Manager client
const secretClient = new SecretManagerServiceClient();

// Configuration
const CONFIG = {
  // Replace with your Google Cloud project number
  PROJECT_ID: "YOUR_PROJECT_NUMBER",
  SECRET_NAME: "Replicate_APIKey",
  DEFAULT_RESOLUTION: "480p",
  DEFAULT_MODEL: "bytedance/seedance-1-lite"
};

/**
 * Retrieves the Replicate API key from Google Secret Manager
 * @returns {Promise<string>} The API key
 */
async function getReplicateApiKey() {
  const secretPath = `projects/${CONFIG.PROJECT_ID}/secrets/${CONFIG.SECRET_NAME}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name: secretPath });
  return version.payload.data.toString("utf8");
}

/**
 * Creates a video generation task using Replicate API
 * @param {string} prompt - Text prompt for video generation
 * @param {string} imageUrl - URL of the input image
 * @param {string} resolution - Video resolution (default: 480p)
 * @returns {Promise<string>} The prediction/task ID
 */
async function createVideoGeneration(prompt, imageUrl, resolution = CONFIG.DEFAULT_RESOLUTION) {
  try {
    const apiKey = await getReplicateApiKey();
    const replicate = new Replicate({ auth: apiKey });

    const prediction = await replicate.predictions.create({
      model: CONFIG.DEFAULT_MODEL,
      input: {
        prompt: prompt,
        image: imageUrl,
        resolution: resolution
      }
    });

    console.log(`Prediction created: ${prediction.id}, Status: ${prediction.status}`);
    return prediction.id;
  } catch (error) {
    console.error("Error creating video generation:", error);
    throw error;
  }
}

/**
 * Checks the status of a video generation task
 * @param {string} taskId - The prediction ID to check
 * @returns {Promise<Object>} Status information and output URL if completed
 */
async function checkVideoStatus(taskId) {
  try {
    const apiKey = await getReplicateApiKey();
    const replicate = new Replicate({ auth: apiKey });

    const prediction = await replicate.predictions.get(taskId);

    const response = {
      taskId: prediction.id,
      status: prediction.status,
      created_at: prediction.created_at,
      started_at: prediction.started_at,
      completed_at: prediction.completed_at,
      model: prediction.model,
      version: prediction.version
    };

    // Handle different status cases
    if (prediction.status === "succeeded") {
      response.output_url = prediction.output;
      return response;
    }

    if (prediction.status === "failed") {
      response.error = prediction.error;
      return response;
    }

    // Status is 'processing' or 'starting'
    return response;
  } catch (error) {
    console.error("Error checking video status:", error);
    throw error;
  }
}

/**
 * API Endpoint: Create a new video generation task
 * GET /api/createVideo
 * Query params:
 *   - prompt: Text prompt for the video
 *   - imageUrl: URL of the input image
 *   - resolution: Video resolution (optional, default: 480p)
 */
app.get("/api/createVideo", async (req, res) => {
  try {
    const { prompt, imageUrl, resolution } = req.query;

    // Validate required parameters
    if (!prompt || !imageUrl) {
      return res.status(400).json({
        error: "Missing required parameters: prompt and imageUrl"
      });
    }

    const taskId = await createVideoGeneration(prompt, imageUrl, resolution);
    
    return res.status(200).json({
      taskId: taskId,
      status: "started",
      message: "Video generation task created successfully"
    });
  } catch (error) {
    console.error("Error in /api/createVideo:", error);
    return res.status(500).json({
      error: "Failed to create video generation task",
      details: error.message
    });
  }
});

/**
 * API Endpoint: Check video generation status
 * GET /api/checkStatus
 * Query params:
 *   - taskId: The prediction ID to check
 */
app.get("/api/checkStatus", async (req, res) => {
  try {
    const { taskId } = req.query;

    // Validate required parameters
    if (!taskId) {
      return res.status(400).json({
        error: "Missing required parameter: taskId"
      });
    }

    const status = await checkVideoStatus(taskId);
    return res.status(200).json(status);
  } catch (error) {
    console.error("Error in /api/checkStatus:", error);
    return res.status(500).json({
      error: "Failed to check video status",
      details: error.message
    });
  }
});

/**
 * API Endpoint: Test endpoint with mock data
 * GET /api/test
 */
app.get("/api/test", async (req, res) => {
  try {
    return res.status(200).json({
      taskId: "test-1116",
      status: "succeeded",
      output_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      message: "This is a test response"
    });
  } catch (error) {
    console.error("Error in /api/test:", error);
    return res.status(500).json({
      error: "Test endpoint failed",
      details: error.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Export the Express app with Secret Manager Key as a Firebase Cloud Function
exports.app = onRequest(
    {
        secrets: ["Replicate_APIKey"]
    }, 
    app
);