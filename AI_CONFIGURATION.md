# AI Provider Configuration Guide

## Overview

The Voice Grievance System supports multiple AI providers for automatic complaint classification, translation, and image analysis. The system uses a provider abstraction pattern, making it easy to switch between providers.

## Supported Providers

| Provider  | Classification | Translation | Image Analysis |
|-----------|:--------------:|:-----------:|:--------------:|
| **Gemini** (default) | Yes | Yes | Yes (vision) |
| **OpenAI** | Yes | Yes | Yes (vision) |
| **Development** (mock) | Basic keyword | No translation | No analysis |

## Configuration

Set the following environment variables in `backend/.env`:

```env
# Choose provider: 'gemini' or 'openai'
AI_PROVIDER=gemini

# Google Gemini API key (get from https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key

# Gemini model name (only when AI_PROVIDER=gemini)
# Note: gemini-2.5-flash is no longer available to new keys; use gemini-flash-latest
GEMINI_MODEL=gemini-flash-latest

# OpenAI model name (only when AI_PROVIDER=openai)
AI_OPENAI_MODEL=gpt-4o

# OpenAI endpoint (change for Azure OpenAI if needed)
AI_OPENAI_ENDPOINT=https://api.openai.com/v1
```

## Development Mode (No API Key)

When `GEMINI_API_KEY` is empty, the system runs in **development mode**:
- Uses keyword-based classification (not semantic AI)
- Returns the original text without translation
- Image analysis returns "not configured"
- No external API calls are made
- No API keys required

This is suitable for testing the UI flow without AI dependencies.

## Production Setup

### Option 1: Google Gemini (Recommended)

1. Go to https://aistudio.google.com/apikey
2. Click "Create API key" (free tier available)
3. Set in `.env`:
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-flash-latest
   ```

### Option 2: OpenAI

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Set in `.env`:
   ```env
   AI_PROVIDER=openai
   AI_OPENAI_API_KEY=your_openai_api_key
   AI_OPENAI_MODEL=gpt-4o
   ```

### Option 3: Azure OpenAI

```env
AI_PROVIDER=openai
AI_OPENAI_API_KEY=your_azure_key
AI_OPENAI_MODEL=gpt-4o
AI_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/v1
```

## AI Pipeline

When a citizen submits a voice complaint:

```
Voice Recording
      ↓
Browser Speech-to-Text (Web Speech API)
      ↓
Original Text (e.g., Hindi, Marathi, Tamil)
      ↓
TranslationService → AI Provider
      ↓
English Text
      ↓
AIClassificationService → AI Provider
      ↓
Category, Department, Priority, Confidence, Keywords, Summary
      ↓
ImageAnalysisService → AI Provider (if images exist)
      ↓
Combine Results
      ↓
Create Complaint with AI Metadata
```

## How AI Classification Works

1. **Translation**: Non-English text is translated to English using the AI provider
2. **Classification**: The English text is sent to the AI with a structured prompt requesting JSON output
3. **Categories**: Road, Water Supply, Drainage, Street Light, Electricity, Garbage, Sanitation, Health, Education, Agriculture, Public Property, Government Office, Traffic, Environment, Others
4. **Confidence**: 0.0-1.0 score indicating how confident the AI is
5. **Manual Review**: Complaints with confidence < 0.4 are flagged for manual review
6. **Image Analysis**: Images are analyzed with AI vision capabilities to detect issues
7. **Combination**: Text + image results are combined; agreement increases confidence, disagreement flags for review

## Switching Between Providers

Simply change `AI_PROVIDER`, `GEMINI_API_KEY` (Gemini) or `AI_OPENAI_API_KEY` (OpenAI) in `.env`. No code changes needed. The `aiProvider.js` service handles all provider-specific API calls through a unified interface.
