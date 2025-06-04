# S3 File Upload Web Application

This repository contains a CloudFormation template and web application code for a serverless file upload solution using AWS services.

## Architecture

The application uses the following AWS services:

- **AWS Amplify**: Hosts and serves the web application
- **Amazon S3**: Stores the web application code and uploaded files
- **AWS Lambda**: Generates pre-signed URLs for secure file uploads
- **Amazon API Gateway**: Provides an HTTP endpoint to invoke the Lambda function

## Components

- `template.yaml`: CloudFormation template that defines all AWS resources
- `web-app/`: Web application code (HTML, CSS, JavaScript)
- `lambda_function.py`: Lambda function code for generating pre-signed URLs
- `tests/`: Unit tests for the Lambda function

## How It Works

1. The user selects a file in the web application
2. The web app calls the API Gateway endpoint
3. API Gateway invokes the Lambda function
4. The Lambda function generates a pre-signed URL for the S3 bucket
5. The web app uses the pre-signed URL to upload the file directly to S3

## Deployment Instructions

### Prerequisites

- AWS CLI installed and configured
- AWS account with appropriate permissions

### Deployment Steps

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/s3-file-upload-web-app.git
   cd s3-file-upload-web-app
   ```

2. Deploy the CloudFormation stack:
   ```
   aws cloudformation deploy \
     --template-file template.yaml \
     --stack-name s3-upload-app \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides \
       AppName=s3-upload-app \
       EnvironmentName=dev \
       BranchName=main
   ```

3. Upload the web application code to the created S3 bucket:
   ```
   # Get the bucket name from CloudFormation outputs
   WEBAPP_BUCKET=$(aws cloudformation describe-stacks \
     --stack-name s3-upload-app \
     --query "Stacks[0].Outputs[?OutputKey=='WebAppBucketName'].OutputValue" \
     --output text)
   
   # Upload the web app files
   aws s3 sync ./web-app s3://$WEBAPP_BUCKET/
   ```

4. Deploy the web app to Amplify:
   ```
   # Get the Amplify App ID from CloudFormation outputs
   AMPLIFY_APP_ID=$(aws cloudformation describe-stacks \
     --stack-name s3-upload-app \
     --query "Stacks[0].Outputs[?OutputKey=='AmplifyAppId'].OutputValue" \
     --output text)
   
   # Start the deployment
   aws amplify start-deployment \
     --app-id $AMPLIFY_APP_ID \
     --branch-name main \
     --source-url s3://$WEBAPP_BUCKET/
   ```

5. Access the web application:
   ```
   # Get the Amplify App URL from CloudFormation outputs
   AMPLIFY_APP_URL=$(aws cloudformation describe-stacks \
     --stack-name s3-upload-app \
     --query "Stacks[0].Outputs[?OutputKey=='AmplifyAppURL'].OutputValue" \
     --output text)
   
   echo "Web application URL: $AMPLIFY_APP_URL"
   ```

## Local Development

To run the web application locally:

1. Update the API endpoint in `web-app/app.js` with your deployed API Gateway URL
2. Serve the web app using a local web server:
   ```
   cd web-app
   python -m http.server 8000
   ```
3. Open your browser and navigate to `http://localhost:8000`

## Testing

To run the Lambda function tests:

```
python -m unittest tests/test_lambda_function.py
```

## Security Considerations

- The CloudFormation template configures S3 buckets with appropriate security settings
- Pre-signed URLs are valid for only 5 minutes
- CORS is configured to allow uploads from the web application
- API Gateway and Lambda are configured with appropriate IAM permissions

## Cleanup

To delete all resources created by this stack:

```
aws cloudformation delete-stack --stack-name s3-upload-app
```