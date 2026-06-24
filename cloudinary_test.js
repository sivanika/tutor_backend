#!/usr/bin/env node
import { v2 as cloudinary } from 'cloudinary';

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: 'dfadjvokq',
  api_key: '243411577951485',
  api_secret: '8x7_-v09ub8Msv04fx-diYH3vGY'
});

// 2. Upload an image
const imageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

try {
  console.log('Uploading image...');
  const uploadResult = await cloudinary.uploader.upload(imageUrl);
  console.log('Upload Secure URL:', uploadResult.secure_url);
  console.log('Upload Public ID:', uploadResult.public_id);

  // 3. Get image details
  console.log('Fetching image details...');
  const imageDetails = await cloudinary.api.resource(uploadResult.public_id);
  console.log('Width:', imageDetails.width);
  console.log('Height:', imageDetails.height);
  console.log('Format:', imageDetails.format);
  console.log('File size (bytes):', imageDetails.bytes);

  // 4. Transform the image
  // f_auto (automatic format): Automatically chooses the best file format (e.g. WebP, AVIF) based on browser support.
  // q_auto (automatic quality): Automatically optimizes the quality vs file size ratio of the image.
  const transformedUrl = cloudinary.url(uploadResult.public_id, {
    fetch_format: 'auto',
    quality: 'auto',
    secure: true
  });

  console.log('Done! Click link below to see optimized version of the image. Check the size and the format.');
  console.log(transformedUrl);

} catch (error) {
  console.error('Error during Cloudinary operations:', error);
}
