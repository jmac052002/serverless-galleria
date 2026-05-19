const {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");

const s3 = new S3Client();

async function handle(event, transformer) {
  const destBucket = process.env.DEST_BUCKET;
  if (!destBucket) {
    throw new Error("Error: Environment variable DEST_BUCKET missing");
  }
  await Promise.all(
    event.Records.map(async (record) => {
      const srcBucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
      console.log(`Transforming ${srcBucket}:${key} to ${destBucket}:${key}...`);
      const original = await get(srcBucket, key);
      const modified = await transformer(original);
      await put(destBucket, key, modified);
      console.log(`Transformed ${srcBucket}:${key} to ${destBucket}:${key}`);
    })
  );
}

async function get(bucket, key) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function put(bucket, key, data) {
  return s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data }));
}

async function list(bucket) {
  const response = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
  return response.Contents;
}

function done(statusCode, body, contentType = "application/json", isBase64Encoded = false) {
  return {
    statusCode,
    isBase64Encoded,
    body,
    headers: { "Content-Type": contentType },
  };
}

module.exports = { handle, get, put, list, done };
