# Serverless Galleria

A fully serverless, authenticated image gallery built on AWS. Images are uploaded through a REST API, automatically processed through a multi-stage transformation pipeline, and served in a secure, Cognito-protected gallery accessible at a custom domain.

**Live URL:** https://gallery.josephsdctlabtraining.com

---

## Team

| Name | Role |
|---|---|
| Joseph McCoy | Architect & Lead Engineer designed and deployed the full stack |
| Bianca | Documentation |
| Kaled | Collaboration & review |
| Soga | Collaboration & review |
| Jaivon | Presentation |

---

## What It Does

1. A user uploads an image through the Uploader API
2. The image lands in S3 and automatically triggers a three-stage transformation pipeline
3. Each stage processes the image and passes it to the next via S3 event notifications
4. The final compressed thumbnail lands in the thumbs bucket
5. Authenticated users visit the gallery at the custom domain, sign in through Amazon Cognito, and view all processed images served via pre-signed S3 URLs

---

## Architecture

### Upload Pipeline

```
User → API Gateway (Uploader) → Upload Lambda → S3 Source Bucket
                                                      │
                                              S3 Event Trigger
                                                      ↓
                                            Rotate Lambda (10°)
                                                      │
                                         S3 → S3 Rotated Bucket
                                                      │
                                              S3 Event Trigger
                                                      ↓
                                            Resize Lambda (max 1024px)
                                                      │
                                         S3 → S3 Resized Bucket
                                                      │
                                              S3 Event Trigger
                                                      ↓
                                           Compress Lambda (JPEG)
                                                      │
                                         S3 → S3 Thumbs Bucket ✓
```

### Gallery & Auth Flow

```
User → gallery.josephsdctlabtraining.com
     → Route 53 (A alias record)
     → CloudFront (CDN + HTTPS via ACM certificate)
     → S3 Frontend Bucket (index.html)
     → Cognito Hosted UI (login)
     → ID Token (JWT) returned to browser
     → Gallery API Gateway (JWT Authorizer validates token)
     → Gallery Lambda
     → S3 Thumbs Bucket (ListObjects + GetObject pre-signed URLs)
     → Images rendered in browser
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Infrastructure as Code | AWS SAM + CloudFormation |
| Compute | AWS Lambda |
| Storage | Amazon S3 (5 buckets) |
| API | Amazon API Gateway (REST) |
| Authentication | Amazon Cognito User Pool + Hosted UI |
| CDN | Amazon CloudFront |
| DNS | Amazon Route 53 |
| TLS/HTTPS | AWS Certificate Manager (ACM) |
| Image Processing | jimp (rotate, resize, compress) |
| Bundler | esbuild |
| Region | us-east-1 |

---

## Key AWS Resources

| Resource | Identifier |
|---|---|
| Live Gallery URL | https://gallery.josephsdctlabtraining.com |
| CloudFront Distribution | E1OLVS6GHBJB06 |
| Uploader API | https://sb546sfj0k.execute-api.us-east-1.amazonaws.com/Prod/ |
| Gallery API | https://nryubp88wd.execute-api.us-east-1.amazonaws.com/Prod/images |
| Cognito User Pool | us-east-1_Fzx3QBFMZ |
| Cognito Hosted UI | us-east-1fzx3qbfmz.auth.us-east-1.amazoncognito.com |
| Thumbs Bucket | galleria-thumbs-team-serverless |

---

## Security

### Authentication
- Amazon Cognito User Pool with Hosted UI handles all authentication
- Self-registration is **disabled** only admin-created users can log in
- The Authorization Code Grant (OAuth 2.0) flow is used the most secure option for web apps
- Tokens are short-lived: ID token and access token expire after 60 minutes
- Token revocation is enabled tokens can be invalidated on logout

### API Protection
- The Gallery API is protected by a Cognito JWT Authorizer
- Every request must include a valid ID token in the `Authorization: Bearer` header
- Unauthenticated requests return `401 Unauthorized`
- The JWT authorizer validates the token signature, issuer, and audience on every request

### IAM Least Privilege
- The Rotate Lambda role has been scoped to the minimum required permissions:
  - `s3:GetObject` on the rotate source bucket only
  - `s3:PutObject` on the rotate destination bucket only
- `AmazonS3FullAccess` was removed it was applied temporarily during development and replaced before submission
- All Lambda execution roles follow the same principle: only the actions they need, only on the buckets they touch

### CORS
- The Gallery API OPTIONS endpoint returns CORS headers with no authorizer (required for browser preflight requests)
- The `Access-Control-Allow-Origin` header is scoped to `https://gallery.josephsdctlabtraining.com` not a wildcard

---

## How to Use

### Upload an Image
Send a POST request to the Uploader API with the image as a binary body:

```bash
curl -X POST https://sb546sfj0k.execute-api.us-east-1.amazonaws.com/Prod/ \
  --data-binary @your-image.jpg \
  -H "Content-Type: image/jpeg"
```

Or use the upload page if one is available. The pipeline processes the image automatically wait 10–15 seconds, then refresh the gallery to see the new thumbnail.

### View the Gallery
1. Visit https://gallery.josephsdctlabtraining.com
2. Click **Sign In** you will be redirected to the Cognito hosted login page
3. Enter your credentials (admin-created account required)
4. After authentication you are redirected back to the gallery and images load automatically
5. Click **Sign out** to end your session

---

## Project Phases

| Phase | Description | Status |
|---|---|---|
| 1 | Pipeline S3 buckets, rotate/resize/compress Lambdas | ✅ Complete |
| 2 | Uploader API Gateway + Lambda, image upload | ✅ Complete |
| 3 | Gallery frontend, CloudFront, Route 53, custom domain | ✅ Complete |
| 4 | Authentication Cognito User Pool, Hosted UI, JWT protection | ✅ Complete |
| 5 | Security polish IAM least privilege, CORS scope, auth enforcement | ✅ Complete |
| 6 | Documentation & presentation | ✅ Complete |

---

## Bundler Note

The transform Lambdas (rotate, resize, compress) use **esbuild** for bundling. The project originally used rollup, which could not resolve the ESM-only dependency tree of `jimp`. Migrating to esbuild resolved the bundling blocker and reduced bundle size significantly.

---

## Known Limitations

- IAM least-privilege was applied to the Rotate Lambda via the AWS CLI. This change is not yet reflected in the SAM template a future improvement would be to define the scoped inline policies directly in `template.yaml` so they are version-controlled and reproducible on fresh deployments.
- The S3 buckets and some intermediate resources use SAM-generated name suffixes and cannot be reproduced with identical names on a fresh deploy.

---

## Demo

A walkthrough of the full authentication flow — unauthenticated access blocked, Cognito login, gallery loading with pre-signed image URLs, and sign out.

[Watch the demo video](https://youtu.be/XXGT32MBsSA)

---

*Built for the DCT Cloud Mastery Bootcamp May 2026*
