// CloudinaryService.ts
import { v2 as cloudinary } from 'cloudinary';

class CloudinaryService {
  async uploadAgentImage(file: Express.Multer.File) {
    return cloudinary.uploader.upload(file.path, {
      folder: 'agents',
      transformation: { width: 500, height: 500, crop: 'limit' }
    });
  }

  async deleteImage(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}