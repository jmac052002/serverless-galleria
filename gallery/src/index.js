import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const THUMBS_BUCKET = process.env.THUMBS_BUCKET;

export const handler = async () => {
  try {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: THUMBS_BUCKET }));
    const objects = list.Contents || [];

    const images = await Promise.all(objects.map(async (obj) => {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: THUMBS_BUCKET, Key: obj.Key }),
        { expiresIn: 3600 }
      );
      return { key: obj.Key, url, lastModified: obj.LastModified };
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://gallery.josephsdctlabtraining.com',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      },
      body: JSON.stringify({ images })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://gallery.josephsdctlabtraining.com' },
      body: JSON.stringify({ error: 'Failed to retrieve images' })
    };
  }
};
