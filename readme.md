# AWS SAM & React Application Deployment Guide

This README provides the steps to deploy a serverless backend using AWS Serverless Application Model (SAM) and a React frontend application to an S3 bucket set up for static web hosting.

## Prerequisites

- AWS SAM CLI installed and configured with your AWS credentials.
- Node.js and npm installed on your machine.
- AWS CLI installed and configured with the necessary access permissions.

## Deploying the Backend with AWS SAM

1. Build the SAM application:

```bash
sam build
```

2. Deploy the SAM application:

```bash
sam deploy
```

## SAM Deployment Outputs

- `ApiGatewayUrl`: The URL endpoint for your API Gateway stage, needed for the React application to send requests.
- `BucketName`: The name of the S3 bucket where the React application will be hosted.
- `WebsiteURL`: The URL of the static website hosted on the S3 bucket.
- `StackName`: This is the unique identifier for the collection of AWS resources being created and managed as a group by AWS CloudFormation. When you deploy your infrastructure as code, the StackName helps you to track and manage the resources associated with this specific instance of your application or environment. It is used within AWS CloudFormation to reference this specific deployment and is crucial for updating or deleting resources in the future.

## Deploying the Frontend React Application

1. Change to the React application directory:

```bash
cd react-app
```

2. Update the `.env` file with the API Gateway endpoint. Replace `<ApiGatewayUrl>` with the output from the SAM deployment.

```bash
REACT_APP_API_GATEWAY_ENDPOINT=<ApiGatewayUrl>
```

3. Install npm dependencies:

```bash
npm install
```

4. Build the React application:

```bash
npm run build
```

5. Sync the build directory to the S3 bucket. Replace `<BucketName>` with the output from the SAM deployment.

```bash
aws s3 sync ./build s3://<BucketName>/
```

## Viewing the Deployed Site

> Once the frontend has been deployed, you can visit the deployed website by navigating to the `WebsiteURL` output from the SAM deployment:

```bash
http://<BucketName>.s3-website-<AWS::Region>.amazonaws.com/
```

## Deleting the stack

```bash
aws delete-stack --stack-name <StackName>
```
