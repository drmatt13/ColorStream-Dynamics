const {
  S3Client,
  PutPublicAccessBlockCommand,
  PutBucketWebsiteCommand,
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

const s3Client = new S3Client();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const bucketName = event.ResourceProperties.BucketName;

  try {
    if (event.RequestType === "Delete") {
      // Empty the bucket before deleting
      await emptyS3Bucket(bucketName);
      console.log(`Bucket ${bucketName} emptied.`);
      return sendResponse(event, "SUCCESS", {});
    } else {
      // Set public access block configuration
      const putPublicAccessBlockParams = {
        Bucket: bucketName,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false,
        },
      };
      await s3Client.send(
        new PutPublicAccessBlockCommand(putPublicAccessBlockParams)
      );
      console.log(
        `Public access block configuration set for bucket ${bucketName}`
      );
      const putBucketWebsiteParams = {
        Bucket: bucketName,
        WebsiteConfiguration: {
          IndexDocument: {
            Suffix: "index.html",
          },
          ErrorDocument: {
            Key: "error.html",
          },
        },
      };

      await s3Client.send(new PutBucketWebsiteCommand(putBucketWebsiteParams));
      console.log(`Static website hosting configured for bucket ${bucketName}`);
      return sendResponse(event, "SUCCESS", {});
    }
  } catch (error) {
    console.error(error);
    return sendResponse(event, "FAILED", {});
  }
};

async function emptyS3Bucket(bucket) {
  let listObjectVersionsParams = { Bucket: bucket };
  let listedObjects;

  do {
    listedObjects = await s3Client.send(
      new ListObjectVersionsCommand(listObjectVersionsParams)
    );

    const objectsToDelete = [];
    if (listedObjects.Versions) {
      listedObjects.Versions.forEach((version) => {
        objectsToDelete.push({
          Key: version.Key,
          VersionId: version.VersionId,
        });
      });
    }

    if (listedObjects.DeleteMarkers) {
      listedObjects.DeleteMarkers.forEach((marker) => {
        objectsToDelete.push({ Key: marker.Key, VersionId: marker.VersionId });
      });
    }

    if (objectsToDelete.length > 0) {
      const deleteParams = {
        Bucket: bucket,
        Delete: { Objects: objectsToDelete },
      };

      await s3Client.send(new DeleteObjectsCommand(deleteParams));
    }

    // If the list was truncated, set the marker to the last Key and VersionId to continue listing
    if (listedObjects.IsTruncated) {
      listObjectVersionsParams = {
        Bucket: bucket,
        KeyMarker: listedObjects.NextKeyMarker,
        VersionIdMarker: listedObjects.NextVersionIdMarker,
      };
    }
  } while (listedObjects.IsTruncated); // Repeat if the results were truncated
}

function sendResponse(event, responseStatus, responseData) {
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See the details in CloudWatch Log Stream: ${event.LogicalResourceId}`,
    PhysicalResourceId: event.LogicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  });

  console.log("Response body:\n", responseBody);

  const https = require("https");
  const url = require("url");

  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "content-type": "",
      "content-length": Buffer.byteLength(responseBody),
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      console.log(`Status code: ${response.statusCode}`);
      console.log(`Status message: ${response.statusMessage}`);
      resolve();
    });

    request.on("error", (error) => {
      console.error("send(..) failed executing https.request(..):", error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}
