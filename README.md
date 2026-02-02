# Serverless Backend - AI Video Generation 

A serverless backend API built with Firebase Cloud Functions and Express.js for AI-powered image-to-video generation using Replicate's AI models.

## 🎯 Purpose

This project demonstrates how to build a production-ready serverless backend that:
- Integrates with Replicate API for video generation
- Uses Google Cloud Secret Manager for secure API key management
- Implements asynchronous task polling patterns
- Provides RESTful API endpoints for frontend applications
- Deploys easily to Firebase Cloud Functions

**Note**: This is a demo project. For production use, implement proper authentication, rate limiting, and error handling.

**✨ Features**

- **Image-to-Video Generation**: Convert static images to animated videos using AI
- **Secure Secret Management**: API keys stored securely in Google Cloud Secret Manager
- **Asynchronous Processing**: Poll-based status checking for long-running tasks
- **CORS Enabled**: Ready for frontend integration
- **Error Handling**: Comprehensive error handling and logging
- **Test Endpoints**: Mock endpoints for development and testing

## 🚀 Setup

### 1. Clone the Repository

```bash
git clone https://github.com/FallikTheCat/Serverless_Backend-AIVideoGeneration.git
cd functions
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Google Cloud Secret Manager

Create a secret in Google Cloud Secret Manager:

```bash
echo -n "your-replicate-api-key" | gcloud secrets create Replicate_APIKey --data-file=-
```

### 4. Update Configuration

Edit `index.js` and replace the placeholder values:

```javascript
const CONFIG = {
  PROJECT_ID: "YOUR_PROJECT_NUMBER", // Your Google Cloud project number
  SECRET_NAME: "Replicate_APIKey", // Replicate API Key
  DEFAULT_RESOLUTION: "480p", // 480p, 720p or 1080p
  DEFAULT_MODEL: "bytedance/seedance-1-lite" // Choose your own model
};
```

### 5. Deploy to Firebase

```bash
firebase deploy --only functions
```

## 🔧 Configuration

### Environment Variables

For local development, create a `.env` file:

```env
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
PROJECT_ID=your-project-id
```

### Secret Manager Permissions

Ensure your Cloud Function has the necessary permissions:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Endpoints

#### 1. Create Video Generation Task

**Endpoint**: `GET /api/createVideo`

**Query Parameters**:
- `prompt` (required): Text description for the video
- `imageUrl` (required): URL of the input image
- `resolution` (optional): Video resolution (default: "480p")

**Example Request**:
```bash
curl "https://your-function-url/api/createVideo?prompt=Make%20it%20animated&imageUrl=https://example.com/image.jpg"
```

**Example Response**:
```json
{
  "taskId": "abc123xyz",
  "status": "started",
  "message": "Video generation task created successfully"
}
```

#### 2. Check Video Status

**Endpoint**: `GET /api/checkStatus`

**Query Parameters**:
- `taskId` (required): The task ID returned from `/api/createVideo`

**Example Request**:
```bash
curl "https://your-function-url/api/checkStatus?taskId=abc123xyz"
```

**Example Response** (Processing):
```json
{
  "taskId": "abc123xyz",
  "status": "processing",
  "created_at": "2025-02-02T10:00:00.000Z",
  "started_at": "2025-02-02T10:00:05.000Z",
  "model": "bytedance/seedance-1-lite"
}
```

**Example Response** (Completed):
```json
{
  "taskId": "abc123xyz",
  "status": "succeeded",
  "created_at": "2025-02-02T10:00:00.000Z",
  "started_at": "2025-02-02T10:00:05.000Z",
  "completed_at": "2025-02-02T10:02:30.000Z",
  "output_url": "https://replicate.delivery/pbxt/video.mp4",
  "model": "bytedance/seedance-1-lite"
}
```
## 💡 Usage Example (Swift)

```swift
public func generateVideo(userPrompt: String, userURL: String, selectedMode: String, selectedModel: String) {
    currentTask = Task {
        do {
            let result = try await service.createVideo(
                userPrompt: userPrompt,
                userURL: userURL,
                mode: selectedMode,
                model: selectedModel
            )
            latestTaskID = result.taskId
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}

public func checkVideoStatus(taskId: String) {
    Task {
        do {
            let result = try await service.checkVideoStatus(taskId: taskId)
            videoStatus = result.videoURL ?? "Processing"
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}
```


## 💡 Usage Example (Frontend)

```javascript
// Create video generation task
async function generateVideo(imageUrl, prompt) {
  const response = await fetch(
    `https://your-function-url/api/createVideo?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`
  );
  const data = await response.json();
  return data.taskId;
}

// Poll for completion
async function pollVideoStatus(taskId) {
  const maxAttempts = 60;
  const pollInterval = 5000; // 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://your-function-url/api/checkStatus?taskId=${taskId}`
    );
    const data = await response.json();

    if (data.status === 'succeeded') {
      return data.output_url;
    } else if (data.status === 'failed') {
      throw new Error('Video generation failed');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Video generation timeout');
}

// Complete workflow
async function createAnimatedVideo() {
  const imageUrl = 'https://example.com/your-image.jpg';
  const prompt = 'A beautiful sunset animation';
  
  const taskId = await generateVideo(imageUrl, prompt);
  console.log('Task created:', taskId);
  
  const videoUrl = await pollVideoStatus(taskId);
  console.log('Video ready:', videoUrl);
  
  return videoUrl;
}
```

### ⭕️ Common Issues

**Error: "Permission denied accessing secret"**
- Ensure Cloud Function service account has Secret Manager access
- Verify the project ID and secret name are correct

**Error: "CORS policy blocked"**
- Check CORS configuration in Express app
- Verify allowed origins match your frontend domain

**Video generation timeout**
- Increase polling duration or interval
- Check Replicate API status
